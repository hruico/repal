import json
import os
import uuid
from datetime import datetime

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'repos.json')


def _load() -> list[dict]:
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, 'r') as f:
        return json.load(f)


def _save(repos: list[dict]):
    with open(DATA_FILE, 'w') as f:
        json.dump(repos, f, indent=2)


def list_repos() -> list[dict]:
    return _load()


def get_repo(repo_id: str) -> dict | None:
    return next((r for r in _load() if r['id'] == repo_id), None)


def add_repo(path: str, name: str) -> dict:
    repos = _load()
    repo = {
        'id': str(uuid.uuid4()),
        'name': name,
        'path': path,
        'added_at': datetime.utcnow().isoformat(),
        'last_analyzed': None,
    }
    repos.append(repo)
    _save(repos)
    return repo


def update_last_analyzed(repo_id: str):
    repos = _load()
    for r in repos:
        if r['id'] == repo_id:
            r['last_analyzed'] = datetime.utcnow().isoformat()
    _save(repos)


def remove_repo(repo_id: str) -> bool:
    repos = _load()
    updated = [r for r in repos if r['id'] != repo_id]
    if len(updated) == len(repos):
        return False
    _save(updated)
    return True
