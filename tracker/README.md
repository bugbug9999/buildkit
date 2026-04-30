# BuildKit Tracker

Local project dashboard for [BuildKit](https://github.com/bugbug9999/buildkit) — track progress, hypotheses, roadmaps, and get rule-based suggestions for your next steps.

![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![Zero Dependencies](https://img.shields.io/badge/deps-zero-blue) ![AI Cost](https://img.shields.io/badge/AI_cost-$0-brightgreen)

## Features

- **Auto progress tracking** — parses `[x]/[ ]` checklists, UX scores, PR statuses from your docs
- **Per-project Analyze button** — rule-based suggestions (no AI API, $0 cost)
- **Daily diff banner** — shows what changed since yesterday
- **Dependency graph** — SVG visualization of project relationships
- **Obsidian integration** — auto-discovers related notes from your vault
- **JSON API** — `GET /api/status` for Claude/Gemini integration
- **Uncategorized pipeline detection** — spots new pipelines not yet mapped to a project

## Quick Start

```bash
cd buildkit/tracker
cp tracker.config.example.json tracker.config.json
# Edit tracker.config.json with your projects
node server.js
# Open http://localhost:3170
```

## Configuration

All config lives in `tracker.config.json`:

```jsonc
{
  "port": 3170,
  "buildkitDir": "../",          // path to your buildkit dir (with pipeline .json files)
  "obsidianDir": null,           // path to Obsidian vault (optional)
  "prefixes": {                  // map pipeline filename prefixes → project IDs
    "my-app": "my-app",
    "my-app-fix": "my-app"
  },
  "deps": {                      // project dependency graph
    "sub-module": ["main-app"]
  },
  "projects": {                  // project definitions
    "my-app": {
      "name": "My App",
      "desc": "What it does",
      "repoPath": "/path/to/git/repo",  // for git info (optional)
      "category": "saas",               // saas|health|crypto|finance|automation|infra
      "deadline": "2026-05-02",         // ISO date or null
      "hypothesis": "Why this exists",
      "bizmodel": "How it makes money",
      "phases": [
        { "name": "MVP", "status": "done" },      // done|wip|blocked|todo
        { "name": "Launch", "status": "wip" }
      ],
      "progressSource": { ... },  // see Progress Sources below
      "todoSource": "/path/to/checklist.md",  // for Next Actions parsing
      "docs": [{ "name": "spec", "file": "spec.md" }]
    }
  }
}
```

### Progress Sources

| Type | Config | What it reads |
|------|--------|---------------|
| `checkbox` | `{ "type": "checkbox", "file": "/path/to/file.md" }` | Counts `[x]` vs `[ ]` |
| `score-auto` | `{ "type": "score-auto", "pattern": "^my-app-score-v\\d+\\.md$" }` | Finds latest score file in `buildkit/output/`, extracts `X/Y` score |
| `score` | `{ "type": "score", "file": "/path/to/score.md" }` | Fixed score file |
| `pr-status` | `{ "type": "pr-status", "file": "/path/to/tracker.md" }` | Counts ✅/🔄/⏸ emoji lines |
| `phase` | `{ "type": "phase", "doneCount": 3, "totalCount": 5 }` | Manual phase count |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | HTML dashboard |
| `/api/status` | GET | Full JSON status (for Claude/Gemini) |
| `/api/suggest/{projectId}` | GET | Generate & cache suggestion for one project |

## How Suggestions Work

No AI API calls. The rule engine checks:
- Deadline urgency (D-day countdown)
- Blocked phases (suggests working on unblocked items)
- WIP items (finish before starting new)
- Next action from checklist
- Stale projects (no pipeline/commit in 7+ days)
- Dependency health (warns if upstream is behind)

Results are cached in `suggestions-cache.json` and shown until you click Analyze again.

## Files

```
tracker/
├── server.js                      # Single-file server (zero deps)
├── tracker.config.json            # Your config (gitignored)
├── tracker.config.example.json    # Template
├── snapshots.json                 # Daily progress snapshots (auto-generated)
├── suggestions-cache.json         # Cached suggestions (auto-generated)
└── README.md
```
