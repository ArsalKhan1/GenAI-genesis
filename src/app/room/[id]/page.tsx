"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { Message, AnalysisResult } from "@/types";
import ChatPanel from "@/components/ChatPanel";
import AnalysisPanel from "@/components/AnalysisPanel";

export default function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [userName, setUserName] = useState("");
  const [copied, setCopied] = useState(false);
  const [analyzeEnabled, setAnalyzeEnabled] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const storedName = sessionStorage.getItem("userName") || "Anonymous";
    setUserName(storedName);

    const socket = io({ path: "/api/socket" });
    socketRef.current = socket;

    socket.emit("join_room", { roomId, name: storedName });

    socket.on("message_history", (history: Message[]) => {
      setMessages(history);
    });

    socket.on("new_message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("analysis_update", (result: AnalysisResult) => {
      setAnalysis(result);
    });

    socket.on("analyzing", (status: boolean) => {
      setIsAnalyzing(status);
    });

    socket.on("user_joined", ({ participants: p }: { participants: string[] }) => {
      setParticipants(p);
    });

    socket.on("user_left", ({ participants: p }: { participants: string[] }) => {
      setParticipants(p);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  const sendMessage = (content: string) => {
    if (!socketRef.current || !content.trim()) return;

    const message: Message = {
      id: uuidv4(),
      sender: "user",
      senderName: userName,
      content: content.trim(),
      timestamp: Date.now(),
    };

    socketRef.current.emit("send_message", { roomId, message });
  };

  const toggleAnalyze = async () => {
    const next = !analyzeEnabled;
    setAnalyzeEnabled(next);
    if (next && messages.length > 0 && userName) {
      setIsAnalyzing(true);
      try {
        const otherName = participants.find((p) => p !== userName) || "Other";
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, messages, userName, otherName }),
        });
        if (!res.ok) throw new Error(await res.text());
        const result = await res.json();
        setAnalysis(result);
      } catch (err) {
        console.error("Analysis failed:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen bg-[#080812] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold bg-linear-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">
            Between The Lines
          </span>
          <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-full font-mono">
            {roomId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {participants.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 mr-1">
              {participants.map((p) => (
                <span
                  key={p}
                  className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full"
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={toggleAnalyze}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
              analyzeEnabled
                ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            {isAnalyzing ? (
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ${analyzeEnabled ? "bg-white" : "bg-slate-600"}`} />
            )}
            {analyzeEnabled ? "Analyzing" : "Analyze"}
          </button>

          <button
            onClick={copyRoomLink}
            className="text-xs bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-200 px-3 py-1.5 rounded-lg transition-all"
          >
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <ChatPanel
          messages={messages}
          userName={userName}
          onSendMessage={sendMessage}
        />
        {analyzeEnabled && (
          <AnalysisPanel
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            messageCount={messages.length}
            participants={participants}
          />
        )}
      </div>
    </div>
  );
}
