import os
import hashlib
import requests
from collections import Counter
from ai.cache import get_cached, set_cached, get_cached_raw, set_cached_raw

MAX_CHARS = 6000

PROMPT = """You are a senior engineer onboarding a new teammate onto this codebase.

File: {filepath}

Write in plain English:
1. What this file's main responsibility is.
2. The key functions, classes, or components it defines.
3. How it likely connects to the rest of the project (e.g. what it's used by or depends on).

Rules: No markdown, no code snippets, no preamble like "This file" or "Here is a summary" — start directly with the content. If the code appears truncated, do not mention that.

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
    summary = _call_groq(PROMPT.format(filepath=file_id, code=content[:MAX_CHARS]))
    set_cached(file_id, content, summary)
    return summary


def _call_groq(code: str, max_tokens: int = 200) -> str:
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
            {"role": "user", "content": code}
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=30)
        res.raise_for_status()
        try:
            data = res.json()
            return data['choices'][0]['message']['content'].strip()
        except (ValueError, KeyError) as e:
            raise RuntimeError(f"Groq returned unexpected response: {res.text[:200]}")
    except requests.exceptions.Timeout:
        raise RuntimeError("Groq API timed out — try again")
    except requests.exceptions.HTTPError as e:
        detail = ""
        try:
            detail = e.response.json().get("error", {}).get("message", "")
        except Exception:
            # Response body isn't JSON (e.g. plain-text "Internal Server Error")
            detail = e.response.text[:200] if e.response else str(e)
        raise RuntimeError(f"Groq API error: {detail or str(e)}")
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Summarization failed: {str(e)}")


# ── Repo-level overview ────────────────────────────────────────────────────────

OVERVIEW_PROMPT = """You are helping a developer get oriented in an unfamiliar codebase.
Given the following structural summary, write exactly 3-4 sentences explaining:
1) What kind of project this likely is and how it is organized.
2) Which files or modules look most central and why.
3) Anything a new developer should be cautious about (risk hotspots, circular dependencies, unusually large files).

Be specific and practical. Do not use generic filler like "this is a well-structured project".

Project summary:
{summary}
"""


def _overview_cache_key(repo_id: str, graph_data: dict) -> str:
    """
    Key changes when the project's overall shape changes:
    file count, total LoC, cycle count, and the sorted names of the top hotspots.
    Trivial edits (LoC ±1) won't invalidate it — meaningful structural shifts will.
    """
    nodes = graph_data.get("nodes", [])
    total_loc = sum(n["data"]["loc"] for n in nodes)
    cycle_count = sum(1 for n in nodes if n["data"].get("in_cycle"))
    top_ids = sorted(
        [n["id"] for n in sorted(nodes, key=lambda x: x["data"].get("risk_score", 0), reverse=True)[:5]]
    )
    fingerprint = f"{repo_id}|{len(nodes)}|{total_loc}|{cycle_count}|{'_'.join(top_ids)}"
    return "overview::" + hashlib.md5(fingerprint.encode()).hexdigest()


def _build_overview_prompt(graph_data: dict, repo_name: str) -> str:
    nodes = graph_data.get("nodes", [])
    if not nodes:
        return ""

    total_loc = sum(n["data"]["loc"] for n in nodes)
    lang_counts = Counter(n["data"]["extension"] for n in nodes)

    top_depended = sorted(nodes, key=lambda n: n["data"].get("in_degree", 0), reverse=True)[:5]
    top_risk     = sorted(nodes, key=lambda n: n["data"].get("risk_score", 0), reverse=True)[:5]
    cycle_count  = sum(1 for n in nodes if n["data"].get("in_cycle"))

    lang_str   = ", ".join(f"{ext}×{cnt}" for ext, cnt in lang_counts.most_common(6))
    dep_names  = ", ".join(n["data"]["label"] for n in top_depended)
    risk_names = ", ".join(
        f"{n['data']['label']} (risk={n['data'].get('risk_score', 0):.2f})"
        for n in top_risk
        if n["data"].get("risk_score", 0) > 0
    ) or "none identified"

    cycle_note = (
        f"{cycle_count} files are part of circular dependency chains — this may complicate refactoring."
        if cycle_count > 0
        else "No circular dependencies detected."
    )

    return (
        f"Repository: {repo_name}\n"
        f"- {len(nodes)} source files, {total_loc:,} total lines of code\n"
        f"- Languages: {lang_str}\n"
        f"- Most depended-upon files (likely core modules): {dep_names}\n"
        f"- Highest risk files (complexity × churn): {risk_names}\n"
        f"- {cycle_note}"
    )


def generate_repo_overview(graph_data: dict, repo_name: str, repo_id: str, force: bool = False) -> str:
    """
    Returns a plain-English overview of the repository.
    Raises RuntimeError on AI failure — never caches errors.
    Uses a structural hash as cache key so the same project shape
    returns instantly without a new API call.
    """
    cache_key = _overview_cache_key(repo_id, graph_data)

    if not force:
        cached = get_cached_raw(cache_key)
        if cached:
            return cached

    prompt_body = _build_overview_prompt(graph_data, repo_name)
    if not prompt_body:
        raise RuntimeError("No graph data available to generate overview.")

    full_prompt = OVERVIEW_PROMPT.format(summary=prompt_body)
    overview = _call_groq(full_prompt, max_tokens=300)
    set_cached_raw(cache_key, overview)
    return overview
