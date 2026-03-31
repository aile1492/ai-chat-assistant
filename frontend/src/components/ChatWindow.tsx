"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { sendChatMessage } from "@/lib/api";
import type { ChatMessage } from "@/lib/api";
import MessageBubble from "./MessageBubble";
import FileUpload from "./FileUpload";

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      await sendChatMessage(
        userMessage,
        sessionId,
        // onChunk
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + chunk,
              };
            }
            return updated;
          });
        },
        // onDone
        (sid) => {
          if (sid) setSessionId(sid);
          setIsLoading(false);
        },
        // onError
        (error) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: `Error: ${error}`,
            };
            return updated;
          });
          setIsLoading(false);
        }
      );
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Error: Failed to connect to the server. Please check if the backend is running.",
        };
        return updated;
      });
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUploadComplete = useCallback((filename: string, chunks: number) => {
    setUploadedFiles((prev) => [...prev, filename]);
    setShowUpload(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Document "${filename}" has been uploaded and processed into ${chunks} chunks. You can now ask questions about it!`,
      },
    ]);
  }, []);

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setUploadedFiles([]);
    setShowUpload(false);
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Chat Assistant
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Powered by Claude + LangChain
          </p>
        </div>
        <div className="flex items-center gap-2">
          {uploadedFiles.length > 0 && (
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
              {uploadedFiles.length} doc{uploadedFiles.length > 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={handleNewChat}
            className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            New Chat
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-500">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
              Start a conversation
            </h2>
            <p className="text-sm max-w-sm">
              Ask anything, or upload a document to chat about its contents.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              isStreaming={isLoading && i === messages.length - 1 && msg.role === "assistant"}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Area */}
      {showUpload && (
        <FileUpload
          sessionId={sessionId}
          onSessionId={setSessionId}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className={`p-2 rounded-lg transition-colors shrink-0 ${
              showUpload
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            title="Upload document"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
