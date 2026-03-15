import { Message } from "@/types";

export interface RollingFeatures {
  userMessageCount: number;
  otherMessageCount: number;
  userMsgLengthAvg: number;
  otherMsgLengthAvg: number;
  /** Fraction of conversation-starters that were the user (0-1) */
  userInitiationRatio: number;
  /** User's average response time in ms (0 = no data) */
  userAvgResponseTimeMs: number;
  /** Other's average response time in ms (0 = no data) */
  otherAvgResponseTimeMs: number;
  /** Fraction of user messages that contain a question mark */
  userQuestionRatio: number;
  /** Fraction of other's messages that contain a question mark */
  otherQuestionRatio: number;
  /** Fraction of consecutive same-sender pairs (double-texting) */
  doubleTextRatio: number;
  /** Fraction of the last 10 messages sent by the user */
  recentUserRatio: number;
  /** Longest silence after any user message (ms) */
  longestGapAfterUserMs: number;
  /**
   * otherAvgResponseTime / userAvgResponseTime.
   * > 1 means other is slower to respond.
   */
  responseTimeRatio: number;
  /** Composite effort score: 0 = user puts in nothing, 1 = user puts in everything */
  effortScore: number;
}

/** Gap longer than this (ms) signals a new conversation thread */
const THREAD_GAP_MS = 30 * 60 * 1000; // 30 min
/** Ignore response-time gaps longer than this (user stepped away) */
const MAX_RESPONSE_GAP_MS = 2 * 60 * 60 * 1000; // 2 h

export function extractRollingFeatures(
  messages: Message[],
  userName: string
): RollingFeatures {
  const zero: RollingFeatures = {
    userMessageCount: 0,
    otherMessageCount: 0,
    userMsgLengthAvg: 0,
    otherMsgLengthAvg: 0,
    userInitiationRatio: 0.5,
    userAvgResponseTimeMs: 0,
    otherAvgResponseTimeMs: 0,
    userQuestionRatio: 0,
    otherQuestionRatio: 0,
    doubleTextRatio: 0,
    recentUserRatio: 0.5,
    longestGapAfterUserMs: 0,
    responseTimeRatio: 1,
    effortScore: 0.5,
  };

  if (messages.length === 0) return zero;

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  const userMsgs = sorted.filter((m) => m.senderName === userName);
  const otherMsgs = sorted.filter((m) => m.senderName !== userName);
  const total = sorted.length;

  // ── Counts & lengths ────────────────────────────────────────────────────────
  const userMessageCount = userMsgs.length;
  const otherMessageCount = otherMsgs.length;

  const avg = (arr: Message[]) =>
    arr.length === 0
      ? 0
      : arr.reduce((s, m) => s + m.content.length, 0) / arr.length;
  const userMsgLengthAvg = avg(userMsgs);
  const otherMsgLengthAvg = avg(otherMsgs);

  // ── Initiation ratio ────────────────────────────────────────────────────────
  let userInitiations = sorted[0].senderName === userName ? 1 : 0;
  let totalInitiations = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].timestamp - sorted[i - 1].timestamp > THREAD_GAP_MS) {
      totalInitiations++;
      if (sorted[i].senderName === userName) userInitiations++;
    }
  }
  const userInitiationRatio = userInitiations / totalInitiations;

  // ── Response times ───────────────────────────────────────────────────────────
  const userRTs: number[] = [];
  const otherRTs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i - 1].timestamp;
    if (
      sorted[i].senderName !== sorted[i - 1].senderName &&
      gap < MAX_RESPONSE_GAP_MS
    ) {
      (sorted[i].senderName === userName ? userRTs : otherRTs).push(gap);
    }
  }
  const mean = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((s, t) => s + t, 0) / arr.length;
  const userAvgResponseTimeMs = mean(userRTs);
  const otherAvgResponseTimeMs = mean(otherRTs);

  // ── Question ratios ──────────────────────────────────────────────────────────
  const qRatio = (arr: Message[]) =>
    arr.length === 0
      ? 0
      : arr.filter((m) => m.content.includes("?")).length / arr.length;
  const userQuestionRatio = qRatio(userMsgs);
  const otherQuestionRatio = qRatio(otherMsgs);

  // ── Double-text ratio ────────────────────────────────────────────────────────
  let doubleTexts = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].senderName === sorted[i - 1].senderName) doubleTexts++;
  }
  const doubleTextRatio = total > 1 ? doubleTexts / (total - 1) : 0;

  // ── Recent engagement (last 10) ──────────────────────────────────────────────
  const recent = sorted.slice(-10);
  const recentUserRatio =
    recent.length === 0
      ? 0.5
      : recent.filter((m) => m.senderName === userName).length / recent.length;

  // ── Longest gap after a user message ────────────────────────────────────────
  let longestGapAfterUserMs = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].senderName === userName) {
      longestGapAfterUserMs = Math.max(
        longestGapAfterUserMs,
        sorted[i + 1].timestamp - sorted[i].timestamp
      );
    }
  }

  // ── Response time ratio ──────────────────────────────────────────────────────
  const responseTimeRatio =
    userAvgResponseTimeMs > 0 && otherAvgResponseTimeMs > 0
      ? otherAvgResponseTimeMs / userAvgResponseTimeMs
      : 1;

  // ── Composite effort score ───────────────────────────────────────────────────
  const countScore = total > 0 ? userMessageCount / total : 0.5;
  const lengthScore =
    userMsgLengthAvg + otherMsgLengthAvg > 0
      ? userMsgLengthAvg / (userMsgLengthAvg + otherMsgLengthAvg)
      : 0.5;
  const effortScore =
    countScore * 0.4 + lengthScore * 0.3 + userInitiationRatio * 0.3;

  return {
    userMessageCount,
    otherMessageCount,
    userMsgLengthAvg,
    otherMsgLengthAvg,
    userInitiationRatio,
    userAvgResponseTimeMs,
    otherAvgResponseTimeMs,
    userQuestionRatio,
    otherQuestionRatio,
    doubleTextRatio,
    recentUserRatio,
    longestGapAfterUserMs,
    responseTimeRatio,
    effortScore,
  };
}
