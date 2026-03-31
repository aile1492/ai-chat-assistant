import os
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.chat import chat_stream, clear_session, get_or_create_session
from app.rag import process_document, clear_documents, has_documents

app = FastAPI(
    title="AI Chat Assistant",
    description="AI-powered chatbot with RAG capabilities",
    version="1.0.0",
)

# CORS - allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    response: str


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Chat Assistant"}


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """Chat with AI - returns streaming SSE response."""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    async def event_generator():
        session_id = None
        try:
            async for sid, chunk in chat_stream(request.message, request.session_id):
                session_id = sid
                data = json.dumps({"type": "chunk", "content": chunk, "session_id": sid})
                yield f"data: {data}\n\n"

            done_data = json.dumps({"type": "done", "session_id": session_id or ""})
            yield f"data: {done_data}\n\n"
        except Exception as e:
            error_data = json.dumps({"type": "error", "content": str(e)})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@app.post("/api/chat/sync")
async def chat_sync_endpoint(request: ChatRequest):
    """Chat with AI - returns full response (non-streaming)."""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    full_response = ""
    session_id = ""
    async for sid, chunk in chat_stream(request.message, request.session_id):
        session_id = sid
        full_response += chunk

    return ChatResponse(session_id=session_id, response=full_response)


@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Form(None),
):
    """Upload a document for RAG."""
    # Validate file type
    allowed_types = {".txt", ".md", ".csv", ".json", ".py", ".js", ".ts", ".html", ".css"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(allowed_types)}",
        )

    # Read file content
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded text")

    if not text.strip():
        raise HTTPException(status_code=400, detail="File is empty")

    # Ensure session exists
    sid, _ = get_or_create_session(session_id)

    # Process document
    chunk_count = process_document(sid, file.filename or "unknown", text)

    return {
        "session_id": sid,
        "filename": file.filename,
        "chunks": chunk_count,
        "message": f"Document '{file.filename}' processed into {chunk_count} chunks.",
    }


@app.delete("/api/session/{session_id}")
async def delete_session(session_id: str):
    """Clear a chat session and its documents."""
    chat_cleared = clear_session(session_id)
    docs_cleared = clear_documents(session_id)

    if not chat_cleared and not docs_cleared:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": "Session cleared", "session_id": session_id}


@app.get("/api/session/{session_id}/status")
async def session_status(session_id: str):
    """Check if a session has uploaded documents."""
    return {
        "session_id": session_id,
        "has_documents": has_documents(session_id),
    }
