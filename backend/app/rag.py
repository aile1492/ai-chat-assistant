import os
from collections import defaultdict

from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.embeddings import FakeEmbeddings

from app.config import UPLOAD_DIR

# Session -> vector store
vector_stores: dict[str, FAISS] = {}

# Use simple embeddings (no external API needed)
# For production, use OpenAI or Anthropic embeddings
embeddings = FakeEmbeddings(size=384)


class SimpleEmbeddings:
    """Simple TF-IDF-like embeddings that don't need an external API."""

    def __init__(self, size: int = 384):
        self.size = size

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        import hashlib
        import numpy as np
        result = []
        for text in texts:
            # Create a deterministic embedding from text content
            words = text.lower().split()
            vec = np.zeros(self.size)
            for i, word in enumerate(words):
                h = int(hashlib.md5(word.encode()).hexdigest(), 16)
                indices = [(h >> (j * 8)) % self.size for j in range(4)]
                for idx in indices:
                    vec[idx] += 1.0
            # Normalize
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            result.append(vec.tolist())
        return result

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]


simple_embeddings = SimpleEmbeddings(size=384)


text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
)


def process_document(session_id: str, filename: str, content: str) -> int:
    """Process a document and add to session's vector store. Returns chunk count."""
    chunks = text_splitter.split_text(content)

    if not chunks:
        return 0

    # Add metadata
    metadatas = [{"source": filename, "chunk": i} for i in range(len(chunks))]

    if session_id in vector_stores:
        vector_stores[session_id].add_texts(chunks, metadatas=metadatas)
    else:
        vector_stores[session_id] = FAISS.from_texts(
            chunks,
            simple_embeddings,
            metadatas=metadatas,
        )

    return len(chunks)


def has_documents(session_id: str) -> bool:
    return session_id in vector_stores


def get_rag_chain(session_id: str, provider: str = "", api_key: str = ""):
    """Create a RAG chain for the given session."""
    if session_id not in vector_stores:
        return None

    from app.chat import get_llm

    retriever = vector_stores[session_id].as_retriever(
        search_type="similarity",
        search_kwargs={"k": 4},
    )

    llm = get_llm(provider=provider, api_key=api_key)

    system_prompt = (
        "You are a helpful AI assistant with access to uploaded documents. "
        "Use the following context from uploaded documents to answer the user's question. "
        "If the context doesn't contain relevant information, say so and answer based on your general knowledge. "
        "Respond in the same language as the user's message.\n\n"
        "Context from documents:\n{context}"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])

    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    return create_retrieval_chain(retriever, question_answer_chain)


def clear_documents(session_id: str) -> bool:
    if session_id in vector_stores:
        del vector_stores[session_id]
        return True
    return False
