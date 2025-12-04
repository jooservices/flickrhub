# Documentation Structure Guide

## 📁 Proposed Structure

```
docs/
├── README.md                    # Documentation index & navigation
│
├── getting-started/             # Onboarding & Quick Start
│   ├── README.md               # Overview & navigation
│   ├── installation.md         # Setup instructions
│   ├── quick-start.md          # 5-minute quick start
│   └── development-setup.md    # Local dev environment
│
├── guides/                      # How-to Guides (Operational)
│   ├── README.md               # Guides index
│   ├── operations.md           # Operations runbook (existing)
│   ├── deployment.md           # Deployment procedures
│   ├── troubleshooting.md     # Common issues & solutions
│   └── migration.md           # Data migration guides
│
├── api/                        # API Documentation
│   ├── README.md               # API overview (existing)
│   ├── authentication.md       # Auth & security
│   ├── endpoints.md           # Detailed endpoint docs
│   ├── webhooks.md            # Webhook documentation
│   ├── errors.md              # Error codes & handling
│   └── examples/              # Code examples
│       ├── curl.md
│       ├── nodejs.md
│       └── python.md
│
├── architecture/               # Architecture & Design
│   ├── README.md              # Architecture overview (existing)
│   ├── system-design.md        # High-level system design
│   ├── data-flow.md           # Data flow diagrams
│   ├── security.md            # Security architecture
│   ├── scaling.md             # Scaling strategies
│   └── decisions/             # ADRs (Architecture Decision Records)
│       ├── 001-queue-choice.md
│       └── 002-caching-strategy.md
│
├── infrastructure/             # Infrastructure & DevOps
│   ├── README.md              # Infrastructure overview
│   ├── docker.md              # Docker setup (from infrastructure.md)
│   ├── monitoring.md          # Monitoring & observability
│   ├── backup-recovery.md     # Backup & DR procedures
│   └── runbooks/              # Incident response runbooks
│       ├── redis-down.md
│       ├── mongo-down.md
│       └── queue-backup.md
│
├── backlog/                    # Backlog Management (NEW)
│   ├── README.md              # Backlog guide & process
│   ├── active/                # Active backlog items
│   │   ├── p0-critical.md
│   │   ├── p1-high.md
│   │   └── p2-medium.md
│   ├── ideas/                 # Future ideas & research
│   │   ├── feature-ideas.md
│   │   └── research.md
│   ├── completed/             # Completed items (archive)
│   │   └── 2024/
│   └── templates/             # Templates for backlog items
│       └── item-template.md
│
├── reference/                 # Reference Documentation
│   ├── configuration.md       # All config options
│   ├── environment-variables.md
│   ├── glossary.md            # Terms & definitions
│   └── changelog.md           # Version history
│
├── reviews/                    # Official Reviews Only
│   ├── ARCHITECTURE_REVIEW.md  # SA review (existing)
│   ├── CODE_REVIEW.md          # Code review
│   └── DESIGN_REVIEW.md        # Design review
│
└── retrospectives/             # Incident Analysis & Investigations
    ├── README.md               # Retrospectives guide
    └── YYYY-MM/                # Organized by month
        ├── investigation-*.md  # Investigation reports
        └── debug-*.md          # Debug session logs
```

---

## 📋 Document Categories

### 1. **Getting Started** (`getting-started/`)

**Purpose**: Help new users/developers get up and running quickly

**Contents**:

- Installation instructions
- Quick start guide (5 minutes)
- Development environment setup
- First steps after installation

**Audience**: New users, developers onboarding

---

### 2. **Guides** (`guides/`)

**Purpose**: Step-by-step how-to guides for common tasks

**Contents**:

- Operations runbook
- Deployment procedures
- Troubleshooting common issues
- Migration guides
- Maintenance tasks

**Audience**: Operators, DevOps, developers

**Format**: Action-oriented, step-by-step instructions

---

### 3. **API Documentation** (`api/`)

**Purpose**: Complete API reference for developers

**Contents**:

- Endpoint documentation
- Authentication & authorization
- Request/response formats
- Error handling
- Code examples (curl, Node.js, Python)
- Webhook documentation

**Audience**: API consumers, developers

**Format**: Reference-style, with examples

---

### 4. **Architecture** (`architecture/`)

**Purpose**: System design and architectural decisions

**Contents**:

- System architecture diagrams
- Data flow diagrams
- Component interactions
- Security architecture
- Scaling strategies
- Architecture Decision Records (ADRs)

**Audience**: Architects, senior engineers, new team members

**Format**: Technical, diagram-heavy

---

### 5. **Infrastructure** (`infrastructure/`)

**Purpose**: Infrastructure setup, monitoring, operations

**Contents**:

- Docker/Kubernetes setup
- Monitoring & observability
- Backup & recovery procedures
- Incident response runbooks
- Infrastructure diagrams

**Audience**: DevOps, SRE, operators

**Format**: Operational, procedure-focused

---

### 6. **Backlog** (`backlog/`) ⭐ NEW

**Purpose**: Track ideas, improvements, and future work

**Structure**: See `backlog/README.md` for detailed guide

**Contents**:

- Active backlog items (by priority)
- Feature ideas
- Research items
- Completed items (archive)
- Templates

**Audience**: Product, engineering, stakeholders

**Format**: Structured, prioritized

---

### 7. **Reference** (`reference/`)

**Purpose**: Quick reference for configuration, terms, etc.

**Contents**:

- Configuration reference
- Environment variables
- Glossary of terms
- Changelog

**Audience**: All users

**Format**: Quick lookup, tables

---

### 8. **Reviews** (`reviews/`)

**Purpose**: Official, formal reviews only

**Contents**:

- Architecture reviews
- Code reviews
- Design reviews
- Security audits

**Guidelines**:

- Keep concise and focused
- High-level assessments only
- Do NOT include debug logs, investigations, or temporary docs
- Link to detailed investigations in `../retrospectives/` when needed
- **Use checklist format** - items marked done/undone with:
  - Status: ✅ Done / ⏳ In Progress / ❌ Not Started
  - Short summary of resolution
  - Link to PR (if applicable)
  - See [Review Checklist Template](reviews/REVIEW_CHECKLIST_TEMPLATE.md)

**Audience**: Management, auditors, architects

**Format**: Assessment reports with actionable checklists

---

### 9. **Retrospectives** (`retrospectives/`) ⭐ NEW

**Purpose**: Incident analysis and investigation reports

**Structure**: Organized by month (YYYY-MM)

**Contents**:

- Investigation reports
- Debug session logs
- Post-mortem analysis
- Incident analysis

**Naming Convention**:

- `investigation-YYYY-MM-DD-description.md`
- `debug-YYYY-MM-DD-description.md`

**Guidelines**:

- Move temporary debug docs here from reviews/
- Archive completed investigations monthly
- Link back to backlog items when applicable

**Audience**: Engineers, SRE, incident responders

**Format**: Detailed technical analysis

---

## 🎯 Documentation Principles

### 1. **User-Centric Organization**

- Organize by user journey, not by technical structure
- Getting started → Guides → Reference
- Easy to find what you need

### 2. **Progressive Disclosure**

- Start simple (getting-started)
- Add detail as needed (guides)
- Deep dive available (architecture)

### 3. **Maintainability**

- One topic per file
- Clear file naming
- Consistent structure
- Regular review & updates

### 4. **Discoverability**

- Clear README.md in each directory
- Navigation links
- Search-friendly structure

---

## 📝 Document Naming Conventions

### Files:

- **kebab-case**: `getting-started.md`, `data-flow.md`
- **Descriptive**: Clear what the document contains
- **Consistent**: Similar documents use similar names
- **Investigation files**: `investigation-YYYY-MM-DD-description.md`
- **Debug files**: `debug-YYYY-MM-DD-description.md`

### Directories:

- **Lowercase**: `getting-started/`, `api/`
- **Plural for collections**: `guides/`, `runbooks/`
- **Singular for single concept**: `architecture/`, `reference/`
- **Monthly organization**: `retrospectives/YYYY-MM/`, `backlog/completed/YYYY-MM/`

---

## 📋 Documentation Organization Guidelines

### Where to Put New Documents

1. **Investigate/Debug** → `retrospectives/YYYY-MM/`
   - Investigation reports
   - Debug session logs
   - Incident analysis

2. **Completed Work** → `backlog/completed/YYYY-MM/`
   - **Feature implementation summaries only**
   - Link back to original backlog items
   - **DO NOT** include: Test results, deployment summaries, investigation reports
   - **Reference docs** → `reference/` (e.g., API docs, payload flows)
   - **Test results** → Include brief summary in feature doc or link to retrospectives

3. **Official Reviews** → `reviews/` (keep minimal)
   - Architecture reviews
   - Code reviews
   - Design reviews

### Cleanup Policy

- **Temporary debug docs**: Move to `retrospectives/` after completion
- **Completed investigations**: Archive monthly in retrospectives
- **Keep only active, relevant docs**: Remove or archive outdated content
- **Reviews directory**: Keep only official, formal reviews

---

## 🔄 Migration Plan

### Phase 1: Reorganize existing docs

1. Move `infrastructure.md` → `infrastructure/README.md`
2. Keep `api/README.md` as is
3. Keep `architecture/README.md` as is
4. Keep `guides/operations.md` as is
5. Move `principles.md` → `architecture/principles.md`

### Phase 2: Create new structure

1. Create `getting-started/` directory
2. Create `backlog/` directory (see backlog guide)
3. Create `reference/` directory
4. Create `reviews/` directory
5. Create `retrospectives/` directory with monthly organization

### Phase 3: Split large documents

1. Split `backlog.md` into priority files
2. Extract examples from API docs
3. Create runbooks from operations guide
4. Move investigation/debug docs to retrospectives

---

## 📚 Documentation Maintenance

### Review Schedule:

- **Monthly**: Review and update guides
- **Quarterly**: Review architecture docs
- **Per release**: Update API docs, changelog
- **As needed**: Update backlog

### Ownership:

- Each directory should have a maintainer
- Document owners in README.md
- Review PRs for documentation changes

---

## 🚀 Next Steps

1. **Create backlog structure** (see `backlog/README.md`)
2. **Migrate existing backlog.md** to new structure
3. **Create getting-started guide** from README.md
4. **Extract API examples** to separate files
5. **Create incident runbooks** from operations guide

---

## 📖 Additional Resources

- [Documentation Best Practices](https://www.writethedocs.org/guide/)
- [Diátaxis Framework](https://diataxis.fr/)
- [Architecture Decision Records](https://adr.github.io/)
