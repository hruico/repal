import subprocess


def get_churn_data(repo_path: str, since: str = "1 year ago") -> dict:
    """
    Run a single `git log --numstat` call and parse per-file churn.

    Returns:
        { relative_file_path: { 'commits': int, 'authors': set[str], 'last_modified': str | None } }

    Fails silently — returns {} if git is unavailable, repo has no history,
    or any other error occurs. The rest of the app degrades gracefully.
    """
    try:
        result = subprocess.run(
            [
                "git", "log",
                f"--since={since}",
                "--pretty=format:@@@%H|%an|%ad",
                "--date=short",
                "--numstat",
            ],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0 or not result.stdout.strip():
            return {}
    except Exception:
        return {}

    data: dict[str, dict] = {}
    current_author: str | None = None
    current_date: str | None = None

    for line in result.stdout.splitlines():
        line = line.rstrip()
        if not line:
            continue

        if line.startswith("@@@"):
            # Header line: @@@<hash>|<author>|<date>
            parts = line[3:].split("|", 2)
            if len(parts) == 3:
                _, current_author, current_date = parts
        elif current_author and "\t" in line:
            # numstat line: "<additions>\t<deletions>\t<filepath>"
            # Renames look like: "5\t2\told/path => new/path" — skip those
            parts = line.split("\t")
            if len(parts) == 3 and " => " not in parts[2]:
                filepath = parts[2].strip()
                if not filepath:
                    continue
                # Normalise to forward slashes (matches traverser.py output)
                filepath = filepath.replace("\\", "/")

                entry = data.setdefault(filepath, {
                    "commits": 0,
                    "authors": set(),
                    "last_modified": None,
                })
                entry["commits"] += 1
                entry["authors"].add(current_author)

                # git log is newest-first — take the first (most recent) date seen
                if entry["last_modified"] is None:
                    entry["last_modified"] = current_date

    return data


def compute_risk_score(
    loc: int,
    complexity: float | None,
    commits: int,
    max_loc: int,
    max_commits: int,
) -> float:
    """
    Combines structural complexity with historical churn into a 0–1 risk score.

    - Structural signal: cyclomatic complexity when available, LoC as fallback.
    - Historical signal: commit frequency (churn) over the last year.
    - Weights: 50/50 — equally balances "hard to understand" with "often touched".
    """
    norm_loc = (loc / max_loc) if max_loc else 0.0

    if complexity is not None:
        # CC is unbounded in theory; cap normalisation at 20 (very high complexity)
        norm_complexity = min(complexity / 20.0, 1.0)
    else:
        # Non-Python files: fall back to LoC as a structural proxy
        norm_complexity = norm_loc

    norm_churn = (commits / max_commits) if max_commits else 0.0

    return round(0.5 * norm_complexity + 0.5 * norm_churn, 3)
