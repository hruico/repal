# repal

A local developer tool that maps any Git repository into an interactive dependency graph — with per-file complexity metrics, git churn analysis, and AI-powered summaries, running entirely on your machine.

---

## What it does

- **Dependency graph** — interactive canvas built with React Flow. Nodes are files; edges are import/require/include relationships, laid out in a folder-grouped hierarchical view.
- **Metrics on every node** — Lines of Code and cyclomatic complexity (Python). Color-coded: green → amber → red.
- **Git churn & risk scores** — combines cyclomatic complexity with commit frequency over the last year into a 0–1 risk score per file. Switch to "Risk hotspots" color mode to see hotspots instantly.
- **Impact Mode** — click any node to trace its full blast radius: which files break if this one changes (transitive dependents), or everything it depends on.
- **AI file summaries** — click any node to get a plain-English 3-sentence summary powered by Groq (llama-3.1-8b-instant). Cached locally by content hash.
- **AI repo overview** — on graph load, a project-level summary appears in the top-left panel explaining the architecture, central modules, and risk areas.
- **Edge highlighting** — click a node and all its connected edges light up. Everything else fades.
- **File filter** — type in the search bar to filter the graph to matching filenames in real time.
- **CSV export** — download per-file metrics (LoC, complexity, commits, authors, risk score) as a spreadsheet.
- **Multi-repo** — register as many local Git repos as you want. They persist across restarts.

---

## Supported languages

| Language | Dependency parsing | Complexity |
|---|---|---|
| Python | ✓ (`ast`) | ✓ (`radon`) |
| JavaScript / TypeScript | ✓ (`import`/`require`) | LoC only |
| JSX / TSX | ✓ | LoC only |
| C / C++ / H | ✓ (local `#include`) | LoC only |
| Java | ✓ (`import`) | LoC only |
| Go | ✓ (`import`) | LoC only |
| Rust | ✓ (`use`/`mod`) | LoC only |

---

## Setup

### Requirements

- Python 3.10+
- Node.js 18+
- Git (must be on PATH — used for churn analysis)
- A [Groq API key](https://console.groq.com) (free tier is enough)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy the env file and fill in your key:

```bash
cp .env.example .env
# edit .env and set GROQ_API_KEY=your_key_here
```

### Frontend

```bash
cd frontend
npm install
```

---

## Running (development)

Two terminals:

```bash
# Terminal 1 — backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open **http://localhost:5173**

The frontend dev server proxies `/api` requests to the backend on port 8000 via Vite's proxy config.

---

## Running (production — single port)

```bash
cd frontend && npm run build
cd ../backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** — FastAPI serves the built React app directly. No Vite, no second process.

---

## Project structure

```
repal/
├── backend/
│   ├── main.py                  # FastAPI app — all API routes
│   ├── store.py                 # Repo registry (persisted to data/)
│   ├── analyzer/
│   │   ├── traverser.py         # Directory walker + extension filter
│   │   ├── dependency_parser.py # Import extractor (py/js/ts/c/java/go/rs)
│   │   ├── metrics.py           # LoC + cyclomatic complexity (radon)
│   │   ├── cycles.py            # DFS cycle detection
│   │   ├── tree_builder.py      # Flat file list → nested tree dict
│   │   └── git_analyzer.py      # git log churn + risk score
│   ├── ai/
│   │   ├── summarizer.py        # Groq API — file + repo-level summaries
│   │   └── cache.py             # MD5-keyed local JSON cache
│   └── data/                    # Runtime data (gitignored)
│       ├── repos.json           # Persisted repo list
│       └── summary_cache.json   # AI response cache
│
└── frontend/
    └── src/
        ├── api/client.js        # All fetch calls
        ├── theme.js             # Design tokens
        ├── pages/
        │   ├── Dashboard.jsx    # Repo list + add/remove
        │   └── GraphView.jsx    # Graph canvas + floating panels
        └── components/
            ├── FileNode.jsx     # Custom React Flow node (card style)
            ├── GraphCanvas.jsx  # Layout engine + edge/interaction logic
            ├── GraphLegend.jsx  # Horizontal legend pill bar
            ├── SidePanel.jsx    # Metrics + AI summary + impact info
            ├── OverviewPanel.jsx# Floating AI repo overview panel
            ├── FolderTree.jsx   # Collapsible file explorer sidebar
            ├── AddRepoModal.jsx # Add repo form
            ├── RepoCard.jsx     # Dashboard card
            └── Toast.jsx        # Notification toasts
```

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Esc` | Deselect node / clear impact mode |
| Scroll | Zoom in / out on canvas |
| Click + drag | Pan the canvas |

---

## Notes

- No data leaves your machine except file content sent to Groq for summarization.
- `venv/`, `node_modules/`, `.git/`, `dist/`, `__pycache__/`, and common build dirs are excluded from traversal automatically.
- Repos over 500 files are capped at 500 nodes to keep the canvas usable.
- Cyclomatic complexity is only computed for Python files via `radon`. For all other languages, LoC and git churn are the primary signals.
- Git churn looks at the last 1 year of commits. Repos with no git history degrade gracefully (risk score falls back to complexity/LoC only).
- AI summaries and the repo overview are cached by content hash — re-analyzing a repo won't make new API calls unless files change.
