import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory (parent of app/)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=str(env_path), override=True)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Claude model
CLAUDE_MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 4096
