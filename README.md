# repal

A local developer tool that maps any Git repository into an interactive dependency graph — with per-file complexity metrics and AI-powered summaries, running entirely on your machine.

```
git clone ...
cd repal
# start backend + frontend → open http://localhost:5173
```

---

## What it does

- **Dependency graph** — interactive, draggable canvas built with React Flow. Nodes are files; edges are import/require/include relationships.
- **Metrics on every node** — Lines of Code and cyclomatic complexity (Python). Color-coded: green → amber → red as complexity grows.
- **AI file summaries** — click any node to get a plain-English 3-sentence summary of what that file does, powered by Groq (llama-3.1-8b-instant). Results are cached locally so you never pay for the same file twice.
- **Edge highlighting** — click a node and all its connected edges light up in amber. Everything else fades. Click the canvas to reset.
- **File filter** — type in the search bar to filter the graph down to matching filenames in real time.
- **Multi-repo** — register as many local Git repos as you want. They persist across restarts.

---

## Supported languages

| Language | Dependency parsing | Complexity |
|---|---|---|
| Python | ✓ (`ast`) | ✓ (`radon`) |
| JavaScript / TypeScript | ✓ (`import`/`require`) | LoC only |
| JSX / TSX | ✓ | LoC only |
| C / C++ / H | ✓ (local `#include`) | LoC only |
| Java, Go, Rust | LoC only | LoC only |

---

## Setup

### Requirements

- Python 3.10+
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free tier is enough)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
GROQ_API_KEY=your_key_here
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

---

## Running (production — single port)

```bash
cd frontend && npm run build
cd ../backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** — FastAPI serves the built React app. No Vite, no second process.

---

## Project structure

```
repal/
├── backend/
│   ├── main.py                  # FastAPI app — all routes
│   ├── store.py                 # Repo registry (repos.json)
│   ├── analyzer/
│   │   ├── traverser.py         # Directory walker
│   │   ├── dependency_parser.py # Import extractor
│   │   └── metrics.py           # LoC + cyclomatic complexity
│   ├── ai/
│   │   ├── summarizer.py        # Groq API call
│   │   └── cache.py             # MD5-keyed local cache
│   └── data/
│       ├── repos.json           # Persisted repo list
│       └── summary_cache.json   # AI response cache
│
└── frontend/
    └── src/
        ├── api/client.js        # All fetch calls
        ├── pages/
        │   ├── Dashboard.jsx    # Repo list
        │   └── GraphView.jsx    # Graph canvas + side panel
        └── components/
            ├── FileNode.jsx     # Custom React Flow node
            ├── GraphCanvas.jsx  # Dagre layout + edge highlighting
            ├── GraphLegend.jsx  # Canvas overlay legend
            ├── SidePanel.jsx    # Metrics + AI summary
            ├── AddRepoModal.jsx # Add repo form
            ├── RepoCard.jsx     # Dashboard card
            └── Toast.jsx        # Notification toasts
```

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Esc` | Deselect node / close side panel |
| Scroll | Zoom in / out on canvas |
| Click + drag | Pan the canvas |

---

## Notes

- No data leaves your machine except for the file content sent to Groq for summarization.
- The `venv/`, `node_modules/`, `.git/`, `dist/`, `build/`, and `__pycache__/` directories are excluded from traversal automatically.
- Repos over 500 files are capped at 500 nodes (alphabetically) to keep the canvas usable.
- Cyclomatic complexity is only computed for Python files via `radon`. For other languages, LoC is the primary signal.
