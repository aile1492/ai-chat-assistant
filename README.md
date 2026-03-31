# AI Chat Assistant

AI-powered chatbot with RAG (Retrieval-Augmented Generation) capabilities. Upload documents and ask questions about their contents, or have a general conversation with Claude AI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + Tailwind CSS |
| Backend | Python FastAPI |
| AI | LangChain + Claude API (Anthropic) |
| Vector Store | FAISS (in-memory) |
| Deploy | Vercel (frontend) + Render (backend) |

## Features

- **Streaming Chat** - Real-time token-by-token response via SSE (Server-Sent Events)
- **RAG (Document Q&A)** - Upload text files and ask questions about their contents
- **Conversation Memory** - Maintains chat history per session (up to 20 messages)
- **Responsive Design** - Mobile-first layout with dark mode support
- **File Upload** - Drag & drop or click to upload (.txt, .md, .csv, .json, .py, .js, .ts, .html, .css)

## Architecture

```
[Browser] <-- SSE --> [Next.js Frontend] <-- HTTP --> [FastAPI Backend]
                                                          |
                                                    [LangChain]
                                                     /        \
                                              [Claude API]  [FAISS Vector Store]
                                                              |
                                                    [Uploaded Documents]
```

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- Anthropic API Key

### Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows
# source venv/bin/activate    # macOS/Linux
pip install -r requirements.txt

# Set API key
echo "ANTHROPIC_API_KEY=your-key-here" > .env

# Run
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Set backend URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run
npm run dev
```

Open http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/chat` | Chat with AI (SSE streaming) |
| POST | `/api/chat/sync` | Chat with AI (full response) |
| POST | `/api/upload` | Upload document for RAG |
| DELETE | `/api/session/{id}` | Clear session |
| GET | `/api/session/{id}/status` | Check session documents |

## Deploy

### Backend (Render)
1. Connect GitHub repo on [Render](https://render.com)
2. Set Root Directory to `backend`
3. Set Build Command: `pip install -r requirements.txt`
4. Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS`

### Frontend (Vercel)
1. Import GitHub repo on [Vercel](https://vercel.com)
2. Set Root Directory to `frontend`
3. Add environment variable: `NEXT_PUBLIC_API_URL` (Render backend URL)

## License

MIT
