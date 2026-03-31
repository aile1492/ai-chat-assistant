const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SSEData {
  type: "chunk" | "done" | "error";
  content?: string;
  session_id?: string;
}

export async function sendChatMessage(
  message: string,
  sessionId: string | null,
  onChunk: (chunk: string) => void,
  onDone: (sessionId: string) => void,
  onError: (error: string) => void
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Network error" }));
    onError(error.detail || "Failed to send message");
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError("No response stream");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data: SSEData = JSON.parse(line.slice(6));
          if (data.type === "chunk" && data.content) {
            onChunk(data.content);
          } else if (data.type === "done") {
            onDone(data.session_id || "");
          } else if (data.type === "error") {
            onError(data.content || "Unknown error");
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  }
}

export async function uploadDocument(
  file: File,
  sessionId: string | null
): Promise<{ session_id: string; filename: string; chunks: number; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  if (sessionId) {
    formData.append("session_id", sessionId);
  }

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || "Failed to upload document");
  }

  return response.json();
}
