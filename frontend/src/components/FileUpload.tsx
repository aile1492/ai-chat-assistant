"use client";

import { useState, useRef, useCallback } from "react";
import { uploadDocument } from "@/lib/api";

interface Props {
  sessionId: string | null;
  onSessionId: (id: string) => void;
  onUploadComplete: (filename: string, chunks: number) => void;
}

export default function FileUpload({ sessionId, onSessionId, onUploadComplete }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);
      try {
        const result = await uploadDocument(file, sessionId);
        onSessionId(result.session_id);
        onUploadComplete(result.filename, result.chunks);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [sessionId, onSessionId, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="px-4 py-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
        } ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.csv,.json,.py,.js,.ts,.html,.css"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Uploading...</span>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Drop a file here or click to upload
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              .txt, .md, .csv, .json, .py, .js, .ts, .html, .css
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1 px-1">{error}</p>
      )}
    </div>
  );
}
