# Documentation Structure Guide

## 📁 Proposed Structure (under `docs/flickrhub/`)

```
docs/flickrhub/
├── 00-index/             # Docs index & navigation
├── 01-governance/        # Reviews/governance
├── 02-architecture/      # Architecture & design
├── 03-technical/         # API + getting started + technical setup
├── 04-data/              # Reference/data definitions
├── 05-systems/           # Infrastructure & systems
├── 06-product/           # Backlog/product planning
├── 07-guides/            # How-to guides & runbooks
├── 08-meta/              # Meta docs (AI onboarding, structure guide)
├── 09-archived/          # Retrospectives/archived analyses
└── 10-appendices/        # Appendices (reserved)
```

---

## 📋 Document Categories

### 1. **Governance** (`01-governance/`)

**Purpose**: Formal reviews and governance-aligned content

**Contents**:

- Architecture review
- Code review
- Design review

**Audience**: Management, auditors, architects

---

### 2. **Architecture** (`02-architecture/`)

**Purpose**: System design and architectural decisions

**Contents**:

- System architecture diagrams
- Data flow diagrams
- Component interactions
- Security architecture
- Scaling strategies
- Architecture Decision Records (ADRs)

**Audience**: Architects, senior engineers, new team members

---

### 3. **Technical** (`03-technical/`)

**Purpose**: Technical reference including API and getting started

**Contents**:

- Getting started (installation, quick start, development setup)
- API documentation (endpoints, auth, examples)
- Technical setup and workflows

**Audience**: Developers

---

### 4. **Data/Reference** (`04-data/`)

**Purpose**: Quick reference for configuration, terms, and data flows

**Contents**:

- Configuration reference
- Environment variables
- Glossary of terms
- Changelog
- Payload/response structures

**Audience**: All users

**Format**: Quick lookup, tables

---

### 5. **Systems** (`05-systems/`)

**Purpose**: Infrastructure and system operations

**Contents**:

- Infrastructure overview
- Docker/Kubernetes setup
- Monitoring & observability
- Backup & recovery procedures
- System runbooks

**Audience**: DevOps, SRE, operators

**Format**: Operational, procedure-focused

---

### 6. **Product/Backlog** (`06-product/`)

**Purpose**: Track ideas, improvements, and future work

**Contents**:

- Active backlog items (by priority)
- Feature ideas
- Research items
- Completed items (archive)
- Templates

**Audience**: Product, engineering, stakeholders

**Format**: Structured, prioritized

---

### 7. **Guides** (`07-guides/`)

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

### 8. **Meta** (`08-meta/`)

**Purpose**: Meta documentation and doc standards

**Contents**:

- AI onboarding
- Documentation structure and standards
- Docs maintenance guidance

**Audience**: Contributors and maintainers

---

### 9. **Archived/Retrospectives** (`09-archived/`) ⭐ NEW

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

- Move temporary debug docs here from governance/reviews
- Archive completed investigations monthly
- Link back to backlog items when applicable

**Audience**: Engineers, SRE, incident responders

**Format**: Detailed technical analysis

---

### 10. **Appendices** (`10-appendices/`)

**Purpose**: Additional appendices and supporting material

**Contents**: TBD as needed

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

- **Lowercase with numeric prefix**: `01-governance/`, `02-architecture/`, `03-technical/`
- **Plural for collections**: `07-guides/`, `07-guides/runbooks/`
- **Singular for single concept**: `02-architecture/`, `04-data/`, `05-systems/`
- **Monthly organization**: `09-archived/retrospectives/YYYY-MM/`, `06-product/backlog/completed/YYYY-MM/`

---

## 📋 Documentation Organization Guidelines

### Where to Put New Documents

1. **Investigate/Debug** → `09-archived/retrospectives/YYYY-MM/`
   - Investigation reports
   - Debug session logs
   - Incident analysis

2. **Completed Work** → `06-product/backlog/completed/YYYY-MM/`
   - **Feature implementation summaries only**
   - Link back to original backlog items
   - **DO NOT** include: Test results, deployment summaries, investigation reports
   - **Reference docs** → `04-data/` (e.g., API docs, payload flows)
   - **Test results** → Include brief summary in feature doc or link to retrospectives

3. **Official Reviews** → `01-governance/reviews/` (keep minimal)
   - Architecture reviews
   - Code reviews
   - Design reviews

### Cleanup Policy

- **Temporary debug docs**: Move to `09-archived/retrospectives/` after completion
- **Completed investigations**: Archive monthly in retrospectives
- **Keep only active, relevant docs**: Remove or archive outdated content
- **Reviews directory**: Keep only official, formal reviews

---

## 🔄 Migration Plan

### Phase 1: Reorganize existing docs

1. Ensure infra docs live under `05-systems/infrastructure/README.md`
2. Keep `03-technical/api/README.md` as API entrypoint
3. Keep `02-architecture/README.md` as architecture entrypoint
4. Keep `07-guides/operations.md` as operations runbook
5. Move `principles.md` → `02-architecture/principles.md` (if present)

### Phase 2: Create new structure

1. Create `03-technical/getting-started/` directory
2. Create `06-product/backlog/` directory (see backlog guide)
3. Create `04-data/` directory
4. Create `01-governance/reviews/` directory
5. Create `09-archived/retrospectives/` directory with monthly organization

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

1. **Create backlog structure** (see `06-product/backlog/README.md`)
2. **Migrate existing backlog.md** to new structure
3. **Create getting-started guide** from README.md
4. **Extract API examples** to separate files
5. **Create incident runbooks** from operations guide

---

## 📖 Additional Resources

- [Documentation Best Practices](https://www.writethedocs.org/guide/)
- [Diátaxis Framework](https://diataxis.fr/)
- [Architecture Decision Records](https://adr.github.io/)
