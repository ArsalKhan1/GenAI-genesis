import { NextRequest, NextResponse } from "next/server";
import { Message } from "@/types";
import { retrieveHistory } from "@/lib/moorcheh";
import { extractRollingFeatures } from "@/lib/features";
import { runLocalModel } from "@/lib/model";

export async function POST(req: NextRequest) {
  try {
    const { roomId, messages, userName, otherName } = (await req.json()) as {
      roomId: string;
      messages: Message[];
      userName: string;
      otherName: string;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages to analyze" },
        { status: 400 }
      );
    }

    // ── Step 1: retrieve recent + relevant history from Moorcheh ────────────────
    const contextQuery = `conversation between ${userName} and ${otherName} — relationship dynamics, effort, engagement`;
    const retrieved = roomId
      ? await retrieveHistory(roomId, contextQuery)
      : [];

    // ── Step 2: merge retrieved history with the messages passed from the client
    // Deduplicate by message id; prefer client-side version (fresher state).
    const clientById = new Map(messages.map((m) => [m.id, m]));
    const merged: Message[] = [
      ...retrieved.filter((r) => !clientById.has(r.id)),
      ...messages,
    ].sort((a, b) => a.timestamp - b.timestamp);

    // ── Step 3: extract rolling features ────────────────────────────────────────
    const features = extractRollingFeatures(merged, userName);

    // ── Step 4: run local model ──────────────────────────────────────────────────
    const analysis = runLocalModel(features, merged, userName, otherName);

    // ── Step 5: return live analysis ─────────────────────────────────────────────
    return NextResponse.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Analysis error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
