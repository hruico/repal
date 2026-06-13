import os
import requests
from ai.cache import get_cached, set_cached

MAX_CHARS = 6000

PROMPT = """You are a senior software engineer doing a code review.
Explain what the following code file does in exactly 3 clear, plain-English sentences.
Do not describe individual lines. Focus on the file's overall purpose and responsibility.

Code:
{code}
"""


def summarize_file(file_id: str, content: str) -> str:
    """
    Returns a summary string on success.
    Raises RuntimeError on failure — never caches errors.
    """
    cached = get_cached(file_id, content)
    if cached:
        return cached

    # _call_groq raises on failure, so set_cached is only reached on success
    summary = _call_groq(content[:MAX_CHARS])
    set_cached(file_id, content, summary)
    return summary


def _call_groq(code: str) -> str:
    """Raises RuntimeError on any failure so the caller can handle it cleanly."""
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set in backend/.env")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "user", "content": PROMPT.format(code=code)}
        ],
        "max_tokens": 200,
        "temperature": 0.3,
    }

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=30)
        res.raise_for_status()
        return res.json()['choices'][0]['message']['content'].strip()
    except requests.exceptions.Timeout:
        raise RuntimeError("Groq API timed out — try again")
    except requests.exceptions.HTTPError as e:
        detail = ""
        try:
            detail = e.response.json().get("error", {}).get("message", "")
        except Exception:
            pass
        raise RuntimeError(f"Groq API error: {detail or str(e)}")
    except Exception as e:
        raise RuntimeError(f"Summarization failed: {str(e)}")
