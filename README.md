# repal

repal is a local developer tool that turns any Git repository into an interactive, explorable dependency graph. It parses source files to extract import relationships, computes code metrics and git churn, and uses an LLM to generate plain-English summaries — all running on your machine with no cloud infrastructure.

Most tools that do this (dependency-cruiser, Sourcegraph, CodeSee) either require a cloud account, only work with one language, or produce static diagrams you can't interact with. repal runs fully locally, supports 7 languages, and gives you a live canvas you can drag, zoom, filter, and explore.

---

## Features

**Dependency graph**
- Files are nodes, imports are directed edges
- Automatic folder grouping — each top-level directory gets its own labelled region
- Cross-folder connection counts shown on region borders
- Layered left-to-right layout based on topological depth (entry points on the left, leaves on the right)

**Code metrics**
- Lines of Code on every node
- Cyclomatic complexity via `radon` for Python files
- Four color modes: by language, LoC heat, CC heat, Risk hotspots

**Git churn & risk scoring**
- Runs `git log --numstat` once per repo to get per-file commit counts and author counts over the last year
- Risk score = 0.5 × normalised complexity + 0.5 × normalised churn (0–1 scale)
- Switch to "Risk hotspots" to instantly see which files are both complex and frequently changed — the ones most likely to cause bugs

**Impact Mode**
- Toggle in the toolbar, then click any node
- Shows the full transitive blast radius: every file that imports this one directly or indirectly ("who breaks if I change this?")
- Or flip direction to see everything this file depends on
- Depth-faded highlighting; side panel shows direct vs transitive counts

**AI summaries (per file)**
- Click any node → AI tab → 3-sentence plain-English explanation of what that file does
- Powered by Groq (llama-3.1-8b-instant), free tier
- Cached by MD5(file content) — same file is never summarised twice

**AI repo overview**
- Loads automatically when you open a graph
- Describes the project type, central modules, and risk areas
- Cached by structural fingerprint (file count + total LoC + cycle count + top risk file IDs)

**Other**
- Multi-repo: add as many local Git repos as you want, persisted across restarts
- File filter: type to filter the graph to matching filenames in real time
- Focus mode: click a node while holding the folder tree open to see only its immediate neighbours
- CSV export: download per-file metrics (file, extension, LoC, complexity, commits, authors, last modified, risk score)
- Folder tree sidebar: collapsible VS Code-style file explorer

---

## Supported languages

| Language | Dependency parsing | Complexity |
|---|---|---|
| Python | AST-based (`import`, `from … import`) | ✓ cyclomatic via radon |
| JavaScript / TypeScript | `import … from`, `require()` | LoC only |
| JSX / TSX | same as JS/TS | LoC only |
| C / C++ / H | local `#include "…"` only (skips `<system>`) | LoC only |
| Java | `import com.example.Foo` | LoC only |
| Go | `import "path/to/pkg"` | LoC only |
| Rust | `use crate::mod`, `mod name` | LoC only |

---

## Requirements

- Python 3.10+
- Node.js 18+
- Git on PATH (used for churn analysis via `git log`)
- A [Groq API key](https://console.groq.com) — free tier, no credit card needed

---

## Setup

### 1. Clone

```bash
git clone https://github.com/hruico/repal.git
cd repal
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# open .env and set GROQ_API_KEY=<your key>
```

### 3. Frontend

```bash
cd ../frontend
npm install
```

---

## Running

### Development (two terminals)

```bash
# Terminal 1
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend
npm run dev
```

Open **http://localhost:5173**

The Vite dev server proxies all `/api` requests to port 8000 automatically.

### Production (single port)

```bash
cd frontend && npm run build
cd ../backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** — FastAPI serves the built frontend directly.

---

## API endpoints

All endpoints are prefixed `/api`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/repos` | List all registered repositories |
| POST | `/api/repos` | Add a repo by local path (validates it's a git repo) |
| DELETE | `/api/repos/{id}` | Remove a repo |
| GET | `/api/repos/{id}/graph` | Full graph: nodes with metrics+churn, edges, cycle detection, stats |
| GET | `/api/repos/{id}/tree` | Nested folder tree of source files |
| POST | `/api/repos/{id}/preview` | First 80 lines of a file |
| POST | `/api/repos/{id}/summarize` | AI summary for a single file (cached) |
| GET | `/api/repos/{id}/overview` | AI repo-level overview (cached, `?force=true` to regenerate) |
| GET | `/api/repos/{id}/export` | CSV of all file metrics |

Interactive API docs available at **http://localhost:8000/docs** when running in production mode.

---

## Project structure

```
repal/
├── backend/
│   ├── main.py                  # FastAPI app — all routes
│   ├── store.py                 # JSON-backed repo registry
│   ├── analyzer/
│   │   ├── traverser.py         # Walks directory, filters by extension
│   │   ├── dependency_parser.py # Extracts imports per language
│   │   ├── metrics.py           # LoC + cyclomatic complexity (radon)
│   │   ├── cycles.py            # DFS cycle detection
│   │   ├── tree_builder.py      # Flat list → nested folder tree
│   │   └── git_analyzer.py      # git log churn + risk score formula
│   ├── ai/
│   │   ├── summarizer.py        # Groq API calls (file + repo level)
│   │   └── cache.py             # MD5-keyed JSON cache
│   └── data/                    # Runtime data — gitignored
│
└── frontend/
    └── src/
        ├── api/client.js        # fetch wrapper for all endpoints
        ├── theme.js             # design tokens (colours, heat ramps)
        ├── pages/
        │   ├── Dashboard.jsx    # repo list, add/remove
        │   └── GraphView.jsx    # main canvas view, toolbar, state
        └── components/
            ├── FileNode.jsx     # React Flow custom node (card style)
            ├── GraphCanvas.jsx  # layout engine, edge logic, folder regions
            ├── GraphLegend.jsx  # horizontal pill legend bar
            ├── SidePanel.jsx    # metrics, AI summary, impact info
            ├── OverviewPanel.jsx# floating AI repo overview
            ├── FolderTree.jsx   # collapsible file explorer sidebar
            ├── AddRepoModal.jsx # add repo form
            ├── RepoCard.jsx     # dashboard card
            └── Toast.jsx        # notifications
```

---

## Assumptions & design decisions

- **Local only by design.** No accounts, no sync, no cloud. The only external call is to Groq for LLM inference. File content sent to Groq is truncated at 6000 characters.
- **Git is required for churn data.** Repos with no commits, shallow clones, or no git history degrade gracefully — risk scores fall back to complexity+LoC only, nothing crashes.
- **500 file cap.** Repos with more than 500 source files are capped (alphabetically) to keep the canvas usable. The limit is a constant in `main.py` and easy to raise.
- **Dependency resolution is heuristic.** Imports are resolved by suffix matching against the list of known files — e.g. `import utils` matches `src/utils.py`. This works well for most projects but won't resolve dynamic imports, conditional imports, or monorepo re-exports.
- **Complexity is Python-only.** `radon` only understands Python AST. For other languages, LoC and git churn carry the risk signal.
- **Cache invalidation.** File summaries invalidate when file content changes (MD5 of content). The repo overview invalidates when the structural fingerprint changes (file count, total LoC, cycle count, top-5 risk file IDs).

---

## Notes

- `venv/`, `node_modules/`, `.git/`, `dist/`, `build/`, `__pycache__/`, and similar directories are excluded from traversal automatically — defined in `traverser.py`.
- Repos persist in `backend/data/repos.json` which is gitignored. On a fresh clone the `data/` directory exists (tracked via `.gitkeep`) but is empty — the app creates the JSON files on first use.
