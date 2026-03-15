/**
 * Local model inference.
 *
 * Primary path: spawns src/model/predict.py which loads the trained
 * ExtraTreesRegressor (MultiOutputRegressor) from the joblib bundle and
 * returns five risk scores (0-1 range).
 *
 * Fallback: if Python is unavailable or the script fails, the heuristic
 * scoring below is used instead so the app never hard-crashes.
 */

import { spawnSync } from "child_process";
import path from "path";
import { AnalysisResult, Message } from "@/types";
import { RollingFeatures } from "./features";

const PREDICT_SCRIPT = path.join(process.cwd(), "src/model/predict.py");

interface ModelPrediction {
  effort_balance: number;        // 0-1
  ghosting_probability: number;  // 0-1
  breadcrumbing_risk: number;    // 0-1
  lovebombing_risk: number;      // 0-1
  boundary_violation_risk: number; // 0-1
}

/** Clamp + round to an integer in [lo, hi] */
const clamp = (v: number, lo = 0, hi = 100) =>
  Math.round(Math.min(Math.max(v, lo), hi));

// ── Python inference ──────────────────────────────────────────────────────────

function runPythonModel(
  messages: Message[],
  userName: string,
  otherName: string
): ModelPrediction | null {
  try {
    const input = JSON.stringify({ messages, userName, otherName });
    const result = spawnSync("python3", [PREDICT_SCRIPT], {
      input,
      encoding: "utf-8",
      timeout: 15_000,
    });

    if (result.status !== 0 || !result.stdout?.trim()) {
      console.warn("[model] predict.py exited non-zero:", result.stderr?.slice(0, 300));
      return null;
    }

    return JSON.parse(result.stdout.trim()) as ModelPrediction;
  } catch (err) {
    console.warn("[model] failed to run predict.py:", err);
    return null;
  }
}

// ── Heuristic fallback ────────────────────────────────────────────────────────

function heuristicPrediction(f: RollingFeatures): ModelPrediction {
  const effortScore = Math.min(Math.max(f.effortScore, 0), 1);

  let ghostScore = 0;
  if (f.responseTimeRatio > 4) ghostScore += 0.30;
  else if (f.responseTimeRatio > 2.5) ghostScore += 0.18;
  else if (f.responseTimeRatio > 1.5) ghostScore += 0.08;
  const gapHours = f.longestGapAfterUserMs / 3_600_000;
  if (gapHours > 48) ghostScore += 0.35;
  else if (gapHours > 24) ghostScore += 0.22;
  else if (gapHours > 8) ghostScore += 0.10;
  if (f.recentUserRatio > 0.75) ghostScore += 0.22;
  else if (f.recentUserRatio > 0.65) ghostScore += 0.12;
  if (effortScore > 0.68) ghostScore += 0.13;

  const lenRatio = f.otherMsgLengthAvg / Math.max(f.userMsgLengthAvg, 1);
  const breadcrumbing_risk =
    f.responseTimeRatio > 4 && f.otherQuestionRatio < 0.1 ? 0.7 : 0.1;
  const lovebombing_risk =
    lenRatio > 3 && f.otherMessageCount < 12 ? 0.65 : 0.05;
  const boundary_violation_risk = effortScore > 0.68 ? 0.5 : 0.1;

  return {
    effort_balance: effortScore,
    ghosting_probability: Math.min(ghostScore, 0.95),
    breadcrumbing_risk,
    lovebombing_risk,
    boundary_violation_risk,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function runLocalModel(
  f: RollingFeatures,
  messages: Message[],
  userName: string,
  otherName: string
): AnalysisResult {
  // Try the trained model first; fall back to heuristics if Python fails.
  const pred =
    runPythonModel(messages, userName, otherName) ?? heuristicPrediction(f);

  // ── Effort balance (from model) ───────────────────────────────────────────
  const userEffortPct  = clamp(pred.effort_balance * 100);
  const otherEffortPct = 100 - userEffortPct;

  // ── Ghosting probability (from model) ────────────────────────────────────
  const ghosting_probability = clamp(pred.ghosting_probability * 100, 0, 95);

  // ── Power dynamic (heuristic — model doesn't output this) ────────────────
  const userPowerRaw =
    (1 - f.userQuestionRatio) * 0.35 +
    f.userInitiationRatio * 0.40 +
    (f.otherMsgLengthAvg / Math.max(f.userMsgLengthAvg + f.otherMsgLengthAvg, 1)) * 0.25;
  const userPower  = clamp(userPowerRaw * 100);
  const otherPower = 100 - userPower;

  // ── Manipulation signals (model breadcrumbing + lovebombing + boundary) ───
  const manipScore =
    (pred.breadcrumbing_risk > 0.5 ? 2 : pred.breadcrumbing_risk > 0.3 ? 1 : 0) +
    (pred.lovebombing_risk   > 0.5 ? 2 : pred.lovebombing_risk   > 0.3 ? 1 : 0) +
    (pred.boundary_violation_risk > 0.5 ? 1 : 0);

  let manipulation_signals: AnalysisResult["manipulation_signals"] = "none";
  if (manipScore >= 4)      manipulation_signals = "high";
  else if (manipScore >= 3) manipulation_signals = "moderate";
  else if (manipScore >= 1) manipulation_signals = "mild";

  // ── Signals detected ──────────────────────────────────────────────────────
  const signals_detected: string[] = [];
  if (f.userInitiationRatio > 0.7)
    signals_detected.push("One-sided initiation");
  if (f.responseTimeRatio > 2)
    signals_detected.push("Delayed reciprocity");
  if (f.recentUserRatio > 0.65)
    signals_detected.push("Decreasing engagement from other");
  if (f.doubleTextRatio > 0.3 && f.recentUserRatio > 0.6)
    signals_detected.push("Double-texting pattern");
  if (pred.lovebombing_risk > 0.45)
    signals_detected.push("Potential love bombing");
  if (pred.breadcrumbing_risk > 0.45)
    signals_detected.push("Breadcrumbing pattern");
  if (pred.boundary_violation_risk > 0.45)
    signals_detected.push("Boundary pressure detected");
  if (f.userQuestionRatio > 0.5 && f.otherQuestionRatio < 0.2)
    signals_detected.push("Low investment from other");
  if (f.otherMsgLengthAvg < 20 && f.userMsgLengthAvg > 60)
    signals_detected.push("Mismatched effort in message quality");

  // ── Behavioral patterns ───────────────────────────────────────────────────
  const behavioral_patterns: string[] = [];
  if (f.userInitiationRatio > 0.6)
    behavioral_patterns.push("Pursuer dynamic");
  if (f.responseTimeRatio > 2)
    behavioral_patterns.push("Inconsistent responsiveness");
  if (f.otherQuestionRatio > 0.35)
    behavioral_patterns.push("High curiosity / investment from other");
  if (f.doubleTextRatio < 0.1 && f.userMessageCount + f.otherMessageCount > 4)
    behavioral_patterns.push("Balanced turn-taking");
  if (ghosting_probability > 50)
    behavioral_patterns.push("Withdrawal pattern emerging");

  // ── Attachment style (heuristic) ─────────────────────────────────────────
  const lenRatio = f.otherMsgLengthAvg / Math.max(f.userMsgLengthAvg, 1);
  let attachment_style = "secure";
  if (f.responseTimeRatio > 3 && f.recentUserRatio > 0.6) {
    attachment_style = "avoidant";
  } else if (f.otherAvgResponseTimeMs > 0 && f.otherAvgResponseTimeMs < 60_000 && lenRatio > 2) {
    attachment_style = "anxious";
  } else if (f.responseTimeRatio > 5) {
    attachment_style = "disorganized";
  }

  // ── Recommendation ────────────────────────────────────────────────────────
  let recommendation: string;
  if (ghosting_probability > 60) {
    recommendation = `The pattern here suggests ${otherName} is pulling back. Stop double-texting, give it space, and watch whether they re-engage on their own.`;
  } else if (pred.breadcrumbing_risk > 0.5) {
    recommendation = `${otherName} is giving you just enough to keep you around without committing. Decide what you actually need from this and communicate it clearly.`;
  } else if (pred.lovebombing_risk > 0.5) {
    recommendation = `Early intensity can feel great but watch whether ${otherName}'s effort holds once the novelty fades — that's the real signal.`;
  } else if (userEffortPct > 65) {
    recommendation = `You're carrying most of this conversation, ${userName}. Try mirroring their energy — match their response length and wait for them to initiate next.`;
  } else if (manipulation_signals === "high" || manipulation_signals === "moderate") {
    recommendation = `There are some concerning patterns in ${otherName}'s behaviour. Keep your options open and don't let urgency override your judgement.`;
  } else if (userPower < 40) {
    recommendation = `${otherName} is setting the conversational tempo. Reclaim balance by wrapping up conversations first and introducing new topics unprompted.`;
  } else {
    recommendation = `The dynamic here is relatively balanced. Authentic engagement with clear boundaries is the move — keep doing what you're doing.`;
  }

  return {
    effort_balance:  { user_percentage: userEffortPct, other_percentage: otherEffortPct },
    power_dynamic:   { user: userPower, other: otherPower },
    signals_detected,
    ghosting_probability,
    manipulation_signals,
    recommendation,
    behavioral_patterns,
    attachment_style,
  };
}
