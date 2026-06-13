import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from git import Repo, InvalidGitRepositoryError, NoSuchPathError

import store
from analyzer.traverser import traverse_directory
from analyzer.dependency_parser import get_dependencies
from analyzer.metrics import calculate_metrics
from ai.summarizer import summarize_file

load_dotenv()

app = FastAPI(title="Repo Analyzer")

# CORS is only needed in development when Vite runs on a separate port.
# In production the frontend is served by FastAPI itself, so CORS is irrelevant.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILES = 500  # Guard against extremely large repos overwhelming the canvas


# ── Repo Management ────────────────────────────────────────────────────────────

@app.get("/api/repos")
def list_repos():
    return store.list_repos()


class AddRepoRequest(BaseModel):
    path: str


@app.post("/api/repos", status_code=201)
def add_repo(req: AddRepoRequest):
    path = req.path.strip()

    if not os.path.exists(path):
        raise HTTPException(
            status_code=400,
            detail=f"Path does not exist: {path}"
        )

    try:
        Repo(path)
    except InvalidGitRepositoryError:
        raise HTTPException(
            status_code=400,
            detail="Not a Git repository. The folder must contain a .git directory."
        )
    except NoSuchPathError:
        raise HTTPException(status_code=400, detail="Path not found.")

    name = os.path.basename(os.path.normpath(path))

    if any(r['path'] == path for r in store.list_repos()):
        raise HTTPException(status_code=409, detail="Repository already added.")

    return store.add_repo(path=path, name=name)


@app.delete("/api/repos/{repo_id}")
def remove_repo(repo_id: str):
    if not store.remove_repo(repo_id):
        raise HTTPException(status_code=404, detail="Repository not found.")
    return {"detail": "Removed."}


# ── Analysis ───────────────────────────────────────────────────────────────────

@app.get("/api/repos/{repo_id}/graph")
def get_graph(repo_id: str):
    repo = store.get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    files = traverse_directory(repo['path'])
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No supported source files found in this repository."
        )

    # Limit node count to keep the canvas usable
    if len(files) > MAX_FILES:
        files = sorted(files, key=lambda f: f['id'])[:MAX_FILES]

    nodes = []
    for f in files:
        m = calculate_metrics(f)
        nodes.append({
            'id': f['id'],
            'data': {
                'label': f['filename'],
                'full_path': f['id'],
                'extension': f['extension'],
                'loc': m['loc'],
                'complexity': m['complexity'],
            },
            'position': {'x': 0, 'y': 0},
            'type': 'fileNode',
        })

    edges = []
    for f in files:
        for dep_id in get_dependencies(f, files):
            edges.append({
                'id': f"{f['id']}-->{dep_id}",
                'source': f['id'],
                'target': dep_id,
                'animated': True,
                'style': {'stroke': '#6366f1', 'strokeWidth': 1.5},
            })

    store.update_last_analyzed(repo_id)
    return {'nodes': nodes, 'edges': edges, 'repo': repo}


# ── AI Summary ─────────────────────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    file_id: str


@app.post("/api/repos/{repo_id}/summarize")
def summarize(repo_id: str, req: SummarizeRequest):
    repo = store.get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    full_path = os.path.join(repo['path'], req.file_id.replace('/', os.sep))
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found.")

    try:
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    summary = summarize_file(file_id=req.file_id, content=content)
    return {'file_id': req.file_id, 'summary': summary}


# ── Static Frontend (Production Only) ─────────────────────────────────────────
# In development this block is never reached because Vite handles the frontend.
# In production, run `npm run build` first, then start only this FastAPI server.

STATIC_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')

if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")))

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index)
