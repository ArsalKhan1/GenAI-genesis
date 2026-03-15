"use client";

import { useEffect, useRef, useState } from "react";
import { Message } from "@/types";

interface Props {
  messages: Message[];
  userName: string;
  onSendMessage: (content: string) => void;
}

export default function ChatPanel({ messages, userName, onSendMessage }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080812] min-w-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl">
              💬
            </div>
            <p className="text-slate-400 text-sm font-medium">Share the room link and start chatting</p>
            <p className="text-slate-600 text-xs">Hit Analyze once there are messages to decode the dynamic.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.sender === "user";
          const prevMsg = messages[i - 1];
          const showName = !prevMsg || prevMsg.senderName !== msg.senderName;

          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
              {showName && (
                <span className={`text-xs text-slate-500 mb-1 px-1 ${isOwn ? "text-right" : "text-left"}`}>
                  {msg.senderName}
                </span>
              )}
              <div className={`group relative max-w-xs lg:max-w-sm xl:max-w-md`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? "bg-violet-600 text-white rounded-tr-md"
                      : "bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-md"
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`text-xs mt-1 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity px-1 ${isOwn ? "text-right" : "text-left"}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm px-4 py-3 flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={`Message as ${userName}…`}
          className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-violet-900/30 disabled:shadow-none"
        >
          Send
        </button>
      </div>
    </div>
  );
}
