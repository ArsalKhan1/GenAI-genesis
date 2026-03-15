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
          body: JSON.stringify({ messages, userName, otherName }),
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-gray-900">💬 Signal Decoder</h1>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-mono">
            Room: {roomId}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {participants.length > 0 && (
            <span className="text-xs text-gray-500">
              {participants.join(" & ")}
            </span>
          )}
          <button
            onClick={toggleAnalyze}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium ${
              analyzeEnabled
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${analyzeEnabled ? "bg-white" : "bg-gray-400"}`} />
            {analyzeEnabled ? "Analyzing ON" : "Analyze"}
          </button>
          <button
            onClick={copyRoomLink}
            className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {copied ? "Copied!" : "Share Room"}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex gap-0 overflow-hidden">
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
