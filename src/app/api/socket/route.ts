// Socket.io is handled via a custom server (server.ts).
// This file exists as a placeholder — the actual socket endpoint
// is mounted at /api/socket by the custom server.
export async function GET() {
  return new Response("Socket.io is handled by the custom server.", {
    status: 200,
  });
}
