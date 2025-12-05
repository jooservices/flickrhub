# Retrospectives & Incident Analysis

This directory contains retrospective documentation and incident analysis reports.

## Structure

```
09-archived/retrospectives/
├── README.md                    # This file
└── YYYY-MM/                     # Monthly retrospectives
    ├── {issue-name}.md         # One file per issue
    └── ...
```

## Principles

1. **One File Per Issue** - Each retrospective issue has exactly ONE consolidated file
2. **Issue-Based Naming** - Filename should relate to the issue (e.g., `callback-url-issue.md`)
3. **Complete Documentation** - Each file contains all investigation, analysis, and resolution for that issue
4. **Monthly Organization** - Group by month for easy reference

## Current Retrospectives

### 2024-12

- **[callback-url-issue.md](2024-12/callback-url-issue.md)** - Callback URL missing issue investigation and fix
- **[debug-logging.md](2024-12/debug-logging.md)** - Debug logging implementation and removal retrospective
- **[observability-gaps.md](2024-12/observability-gaps.md)** - Observability logging gaps analysis
- **[request-payload-flow.md](2024-12/request-payload-flow.md)** - Request/payload flow documentation

## Guidelines

### Creating a Retrospective

1. **One Issue = One File** - Never split one issue across multiple files
2. **Collect All Content** - Merge all investigation, analysis, and findings into one file
3. **Name by Issue** - Use descriptive filename related to the issue (not investigation-xxx.md)
4. **Complete Story** - Include: problem, investigation, root cause, solution, resolution

### Naming Convention

- ✅ `callback-url-issue.md` - Descriptive of the issue
- ✅ `observability-gaps.md` - Clear and concise
- ❌ `investigation-callback-url.md` - Too generic
- ❌ `debug-log-1.md`, `debug-log-2.md` - Multiple files for one issue

---

**Note**: For completed tasks and implementation summaries, see `../06-product/backlog/completed/` directory.
