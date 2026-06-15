import hashlib
import json
import os

CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'summary_cache.json')


def _load() -> dict:
    if not os.path.exists(CACHE_FILE):
        return {}
    with open(CACHE_FILE, 'r') as f:
        return json.load(f)


def _save(cache: dict):
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, indent=2)


def _key(file_id: str, content: str) -> str:
    h = hashlib.md5(content.encode('utf-8')).hexdigest()
    return f"{file_id}::{h}"


def get_cached(file_id: str, content: str) -> str | None:
    return _load().get(_key(file_id, content))


def set_cached(file_id: str, content: str, summary: str):
    cache = _load()
    cache[_key(file_id, content)] = summary
    _save(cache)


# ── Raw key cache (used for repo overviews) ────────────────────────────────────

def get_cached_raw(key: str) -> str | None:
    """Retrieve a cached value by an arbitrary pre-computed key."""
    return _load().get(key)


def set_cached_raw(key: str, value: str):
    """Store a value under an arbitrary pre-computed key."""
    cache = _load()
    cache[key] = value
    _save(cache)
