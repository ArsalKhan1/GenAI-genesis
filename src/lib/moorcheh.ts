import { Message } from "@/types";

const MOORCHEH_BASE = "https://api.moorcheh.ai/v1";

function headers() {
  return {
    "Content-Type": "application/json",
    "x-api-key": process.env.MOORCHEH_API_KEY!,
  };
}

/** Sanitise a room ID into a valid Moorcheh namespace name */
function nsName(roomId: string) {
  return `room-${roomId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 56)}`;
}

/**
 * Ensure the namespace exists in Moorcheh (idempotent).
 * Safe to call on every store — Moorcheh returns 409 if it already exists.
 */
async function ensureNamespace(roomId: string): Promise<void> {
  await fetch(`${MOORCHEH_BASE}/namespaces`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ namespace_name: nsName(roomId), type: "text" }),
  });
  // 201 = created, 409 = already exists — both are fine; ignore other errors
}

/**
 * Store a single message event in the room's Moorcheh namespace.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function storeMessageEvent(
  roomId: string,
  message: Message
): Promise<void> {
  try {
    await ensureNamespace(roomId);

    const text = `[${message.senderName} @ ${new Date(message.timestamp).toISOString()}]: ${message.content}`;

    await fetch(`${MOORCHEH_BASE}/data`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        namespace: nsName(roomId),
        items: [
          {
            text,
            metadata: {
              id: message.id,
              sender: message.sender,
              senderName: message.senderName,
              timestamp: message.timestamp,
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.warn("[moorcheh] storeMessageEvent failed:", err);
  }
}

/**
 * Retrieve the most recent & semantically relevant messages for this room.
 * Returns parsed Message objects sorted oldest-first.
 * Falls back to an empty array on any error.
 */
export async function retrieveHistory(
  roomId: string,
  contextQuery: string,
  topK = 60
): Promise<Message[]> {
  try {
    const res = await fetch(`${MOORCHEH_BASE}/search`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        query: contextQuery,
        namespaces: [nsName(roomId)],
        top_k: topK,
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results: Array<{
      text: string;
      metadata?: Record<string, unknown>;
    }> = data.results ?? [];

    return results
      .map((r) => ({
        id: (r.metadata?.id as string) ?? crypto.randomUUID(),
        sender: (r.metadata?.sender as "user" | "other") ?? "other",
        senderName: (r.metadata?.senderName as string) ?? "Unknown",
        content: r.text,
        timestamp: (r.metadata?.timestamp as number) ?? 0,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch (err) {
    console.warn("[moorcheh] retrieveHistory failed:", err);
    return [];
  }
}
