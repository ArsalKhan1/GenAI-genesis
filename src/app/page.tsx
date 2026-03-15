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
    <main className="min-h-screen bg-[#080812] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-900/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-950/40 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-5">
            <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            <span className="text-violet-300 text-xs font-medium tracking-wide">AI-powered relationship analytics</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-linear-to-r from-violet-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
              Signal Decoder
            </span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            The brutally honest friend you never listen to, but probably should.
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl shadow-black/40">
          <div className="space-y-4">
            {/* Name input */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Your name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="e.g. Alex"
                className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 p-1 bg-slate-800/60 rounded-xl">
              <button
                onClick={() => setMode("create")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "create"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Create Room
              </button>
              <button
                onClick={() => setMode("join")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "join"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Join Room
              </button>
            </div>

            {/* Room ID input */}
            {mode === "join" && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Room ID
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStart()}
                  placeholder="Enter 8-character room ID"
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                />
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleStart}
              disabled={!name.trim() || (mode === "join" && !roomId.trim())}
              className="w-full bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white py-3 rounded-xl font-semibold text-sm shadow-lg shadow-violet-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 disabled:shadow-none"
            >
              {mode === "create" ? "Create Room" : "Join Room"} →
            </button>
          </div>

          {/* Feature hints */}
          <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-3 gap-3">
            {[
              { icon: "⚡", label: "Effort balance" },
              { icon: "👁", label: "Power dynamics" },
              { icon: "🚩", label: "Red flag signals" },
            ].map(({ icon, label }) => (
              <div key={label} className="text-center">
                <div className="text-lg mb-1">{icon}</div>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
