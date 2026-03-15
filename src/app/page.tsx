"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");

  const handleStart = () => {
    if (!name.trim()) return;
    const id = mode === "create" ? uuidv4().slice(0, 8) : roomId.trim();
    if (!id) return;
    sessionStorage.setItem("userName", name.trim());
    router.push(`/room/${id}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💬 Signal Decoder
          </h1>
          <p className="text-gray-500 text-sm">
            Your friend with common sense — the one you never listen to, but probably should.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              placeholder="e.g. Alex"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMode("create")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "create"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Create Room
            </button>
            <button
              onClick={() => setMode("join")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "join"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Join Room
            </button>
          </div>

          {mode === "join" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={!name.trim() || (mode === "join" && !roomId.trim())}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {mode === "create" ? "Create Room" : "Join Room"}
          </button>
        </div>

        <div className="mt-6 p-4 bg-rose-50 rounded-lg">
          <p className="text-xs text-rose-700 text-center">
            🔍 AI analyzes effort balance, power dynamics & behavioral signals in real time
          </p>
        </div>
      </div>
    </main>
  );
}
