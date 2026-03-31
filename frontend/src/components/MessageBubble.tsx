"use client";

import { memo } from "react";
import type { ChatMessage } from "@/lib/api";

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md"
        }`}
      >
        {/* Icon */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium opacity-70">
            {isUser ? "You" : "AI Assistant"}
          </span>
        </div>

        {/* Content with simple markdown-like rendering */}
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-current opacity-70 animate-pulse ml-0.5" />
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(MessageBubble);
