import os
import csv
import io
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from git import Repo, InvalidGitRepositoryError, NoSuchPathError

import store
from analyzer.traverser import traverse_directory
from analyzer.dependency_parser import get_dependencies
from analyzer.metrics import calculate_metrics
from analyzer.cycles import find_cycles
from analyzer.tree_builder import build_tree
from analyzer.git_analyzer import get_churn_data, compute_risk_score
from ai.summarizer import summarize_file, generate_repo_overview

load_dotenv()

app = FastAPI(title="repal")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILES = 500


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
        raise HTTPException(status_code=400, detail=f"Path does not exist: {path}")

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


# ── Graph ──────────────────────────────────────────────────────────────────────

@app.get("/api/repos/{repo_id}/graph")
def get_graph(repo_id: str):
    repo = store.get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    files = traverse_directory(repo['path'])
    if not files:
        raise HTTPException(status_code=404, detail="No supported source files found.")

    if len(files) > MAX_FILES:
        files = sorted(files, key=lambda f: f['id'])[:MAX_FILES]

    # Build raw edge list first (needed for cycles + degrees)
    edges_raw = []
    for f in files:
        for dep_id in get_dependencies(f, files):
            edges_raw.append({'source': f['id'], 'target': dep_id})

    # Cycle detection
    cycle_ids = find_cycles(edges_raw)

    # Degree counts
    in_deg  = {f['id']: 0 for f in files}
    out_deg = {f['id']: 0 for f in files}
    for e in edges_raw:
        out_deg[e['source']] = out_deg.get(e['source'], 0) + 1
        in_deg[e['target']]  = in_deg.get(e['target'], 0) + 1

    # ── Churn analysis ────────────────────────────────────────────────────────
    # Single git log call — fails gracefully to {} on any error.
    churn = get_churn_data(repo['path'])

    # Build node list with metrics first so we can compute normalisation bounds
    raw_nodes = []
    for f in files:
        m = calculate_metrics(f)
        file_churn = churn.get(f['id'], {})
        raw_nodes.append({
            'id': f['id'],
            'loc': m['loc'],
            'complexity': m['complexity'],
            'commits': file_churn.get('commits', 0),
            'authors': len(file_churn.get('authors', set())),
            'last_modified': file_churn.get('last_modified'),
            'label': f['filename'],
            'full_path': f['id'],
            'extension': f['extension'],
            'in_degree':  in_deg.get(f['id'], 0),
            'out_degree': out_deg.get(f['id'], 0),
            'in_cycle':   f['id'] in cycle_ids,
        })

    max_loc     = max((n['loc'] for n in raw_nodes), default=1)
    max_commits = max((n['commits'] for n in raw_nodes), default=1)

    nodes = []
    for n in raw_nodes:
        risk = compute_risk_score(
            n['loc'], n['complexity'], n['commits'], max_loc, max_commits
        )
        nodes.append({
            'id': n['id'],
            'data': {
                'label':         n['label'],
                'full_path':     n['full_path'],
                'extension':     n['extension'],
                'loc':           n['loc'],
                'complexity':    n['complexity'],
                'in_degree':     n['in_degree'],
                'out_degree':    n['out_degree'],
                'in_cycle':      n['in_cycle'],
                'commits':       n['commits'],
                'authors':       n['authors'],
                'last_modified': n['last_modified'],
                'risk_score':    risk,
            },
            'position': {'x': 0, 'y': 0},
            'type': 'fileNode',
        })

    edges = []
    for e in edges_raw:
        is_cycle = e['source'] in cycle_ids and e['target'] in cycle_ids
        edges.append({
            'id': f"{e['source']}-->{e['target']}",
            'source': e['source'],
            'target': e['target'],
            'type': 'straight',
            'data': {'isCycle': is_cycle},
            'style': {
                'stroke': '#f87171' if is_cycle else '#818cf8',
                'strokeWidth': 1.5,
            },
        })

    store.update_last_analyzed(repo_id)
    return {
        'nodes': nodes,
        'edges': edges,
        'repo': repo,
        'stats': {
            'total_files': len(files),
            'total_edges': len(edges),
            'cycle_count': len(cycle_ids),
            'total_loc': sum(n['data']['loc'] for n in nodes),
        },
    }


# ── Folder Tree ────────────────────────────────────────────────────────────────

@app.get("/api/repos/{repo_id}/tree")
def get_tree(repo_id: str):
    repo = store.get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    files = traverse_directory(repo['path'])
    return {'tree': build_tree(repo['path'], files)}


# ── File Preview ───────────────────────────────────────────────────────────────

class FileRequest(BaseModel):
    file_id: str


@app.post("/api/repos/{repo_id}/preview")
def preview_file(repo_id: str, req: FileRequest):
    repo = store.get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    full_path = os.path.join(repo['path'], req.file_id.replace('/', os.sep))
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found.")
    try:
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = []
            for _ in range(80):
                line = f.readline()
                if not line:
                    break
                lines.append(line)
        return {'file_id': req.file_id, 'content': ''.join(lines)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── AI Summary ─────────────────────────────────────────────────────────────────

@app.post("/api/repos/{repo_id}/summarize")
def summarize(repo_id: str, req: FileRequest):
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

    try:
        summary = summarize_file(file_id=req.file_id, content=content)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {'file_id': req.file_id, 'summary': summary}


# ── AI Repo Overview ───────────────────────────────────────────────────────────

@app.get("/api/repos/{repo_id}/overview")
def get_overview(repo_id: str, force: bool = False):
    repo = store.get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    # Re-use the full graph-building pipeline so the overview has churn data
    files = traverse_directory(repo['path'])
    if not files:
        raise HTTPException(status_code=404, detail="No supported source files found.")

    if len(files) > MAX_FILES:
        files = sorted(files, key=lambda f: f['id'])[:MAX_FILES]

    edges_raw = []
    for f in files:
        for dep_id in get_dependencies(f, files):
            edges_raw.append({'source': f['id'], 'target': dep_id})

    cycle_ids = find_cycles(edges_raw)
    in_deg  = {f['id']: 0 for f in files}
    out_deg = {f['id']: 0 for f in files}
    for e in edges_raw:
        out_deg[e['source']] = out_deg.get(e['source'], 0) + 1
        in_deg[e['target']]  = in_deg.get(e['target'], 0) + 1

    churn = get_churn_data(repo['path'])
    raw_nodes = []
    for f in files:
        m = calculate_metrics(f)
        fc = churn.get(f['id'], {})
        raw_nodes.append({
            'id': f['id'],
            'loc': m['loc'],
            'complexity': m['complexity'],
            'commits': fc.get('commits', 0),
            'in_degree':  in_deg.get(f['id'], 0),
            'in_cycle':   f['id'] in cycle_ids,
            'label': f['filename'],
            'extension': f['extension'],
        })

    max_loc     = max((n['loc'] for n in raw_nodes), default=1)
    max_commits = max((n['commits'] for n in raw_nodes), default=1)

    # Minimal graph_data shape that generate_repo_overview expects
    graph_data = {
        "nodes": [
            {
                "id": n['id'],
                "data": {
                    "label":      n['label'],
                    "extension":  n['extension'],
                    "loc":        n['loc'],
                    "in_degree":  n['in_degree'],
                    "in_cycle":   n['in_cycle'],
                    "risk_score": compute_risk_score(
                        n['loc'], n['complexity'], n['commits'], max_loc, max_commits
                    ),
                },
            }
            for n in raw_nodes
        ]
    }

    try:
        overview = generate_repo_overview(
            graph_data=graph_data,
            repo_name=repo['name'],
            repo_id=repo_id,
            force=force,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {'repo_id': repo_id, 'overview': overview}


# ── CSV Export ─────────────────────────────────────────────────────────────────

@app.get("/api/repos/{repo_id}/export")
def export_csv(repo_id: str):
    repo = store.get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    files = traverse_directory(repo['path'])
    churn = get_churn_data(repo['path'])

    max_loc     = 1
    max_commits = 1
    metrics_cache = {}
    for f in files:
        m = calculate_metrics(f)
        metrics_cache[f['id']] = m
        if m['loc'] > max_loc:
            max_loc = m['loc']
        c = churn.get(f['id'], {}).get('commits', 0)
        if c > max_commits:
            max_commits = c

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['file', 'extension', 'loc', 'complexity', 'commits', 'authors', 'last_modified', 'risk_score'])
    for f in files:
        m = metrics_cache[f['id']]
        fc = churn.get(f['id'], {})
        risk = compute_risk_score(
            m['loc'], m['complexity'],
            fc.get('commits', 0), max_loc, max_commits
        )
        writer.writerow([
            f['id'], f['extension'],
            m['loc'], m['complexity'] or '',
            fc.get('commits', 0),
            len(fc.get('authors', set())),
            fc.get('last_modified', ''),
            risk,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': f'attachment; filename="{repo["name"]}_metrics.csv"'},
    )


# ── Static Frontend (Production) ───────────────────────────────────────────────
# Mount /assets for JS/CSS chunks, then serve index.html only for GET requests
# on non-API paths. Using @app.api_route with methods=["GET"] means POST/DELETE
# routes defined above are never shadowed.

STATIC_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')

if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET"])
    def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found.")
        index = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index):
            return FileResponse(index)
        raise HTTPException(status_code=404, detail="Frontend not built.")
