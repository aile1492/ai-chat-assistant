import uuid

from langchain_anthropic import ChatAnthropic
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

from app.config import ANTHROPIC_API_KEY, CLAUDE_MODEL, MAX_TOKENS
from app.rag import get_rag_chain, has_documents

# Session storage: session_id -> memory
sessions: dict[str, ConversationBufferWindowMemory] = {}

SYSTEM_PROMPT = (
    "You are a helpful AI assistant. Answer questions clearly and concisely. "
    "If the user uploads documents, use the provided context to answer. "
    "Respond in the same language as the user's message."
)


def get_or_create_session(session_id: str | None = None) -> tuple[str, ConversationBufferWindowMemory]:
    if session_id and session_id in sessions:
        return session_id, sessions[session_id]

    sid = session_id or str(uuid.uuid4())
    memory = ConversationBufferWindowMemory(
        k=20,
        return_messages=True,
        memory_key="history",
    )
    sessions[sid] = memory
    return sid, memory


def get_llm() -> ChatAnthropic:
    return ChatAnthropic(
        model=CLAUDE_MODEL,
        anthropic_api_key=ANTHROPIC_API_KEY,
        max_tokens=MAX_TOKENS,
        streaming=True,
    )


async def chat_stream(message: str, session_id: str | None = None):
    """Stream chat response token by token. Yields (session_id, chunk) tuples."""
    sid, memory = get_or_create_session(session_id)

    # Check if RAG documents exist for this session
    if has_documents(sid):
        rag_chain = get_rag_chain(sid)
        if rag_chain:
            full_response = ""
            async for chunk in rag_chain.astream({"input": message}):
                if "answer" in chunk:
                    full_response += chunk["answer"]
                    yield sid, chunk["answer"]
            # Save to memory
            memory.chat_memory.add_user_message(message)
            memory.chat_memory.add_ai_message(full_response)
            return

    # Build messages from memory + new message
    llm = get_llm()
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])

    history = memory.load_memory_variables({}).get("history", [])
    formatted = prompt.format_messages(history=history, input=message)

    # Stream tokens directly from the LLM
    full_response = ""
    async for chunk in llm.astream(formatted):
        token = chunk.content
        if token:
            full_response += token
            yield sid, token

    # Save to memory after complete response
    memory.chat_memory.add_user_message(message)
    memory.chat_memory.add_ai_message(full_response)


def clear_session(session_id: str) -> bool:
    if session_id in sessions:
        del sessions[session_id]
        return True
    return False
