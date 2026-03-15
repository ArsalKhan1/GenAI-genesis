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
    <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-12">
            <p className="text-2xl mb-2">👋</p>
            <p>Share the room link and start chatting.</p>
            <p className="text-xs mt-1">AI analysis appears after the first message.</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender === "user";
          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs lg:max-w-md`}>
                <p className={`text-xs mb-1 text-gray-400 ${isOwn ? "text-right" : "text-left"}`}>
                  {msg.senderName}
                </p>
                <div
                  className={`px-4 py-2 rounded-2xl text-sm ${
                    isOwn
                      ? "bg-purple-600 text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-800 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`text-xs mt-1 text-gray-300 ${isOwn ? "text-right" : "text-left"}`}>
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

      {/* Input */}
      <div className="border-t border-gray-200 p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={`Message as ${userName}...`}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
