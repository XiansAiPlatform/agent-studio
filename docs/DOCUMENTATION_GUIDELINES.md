# Documentation Guidelines

This document defines the standards and structure for technical documentation in the Agent Studio project. Follow these guidelines when creating, updating, or reorganizing documentation in the `docs/` folder.

---

## 1. Documentation Types

Use the **Diátaxis framework** to classify and structure documentation. Each type serves a distinct purpose and audience.

| Type | Purpose | Audience | Example |
|------|---------|----------|---------|
| **Tutorial** | Learning-oriented; teaches a concept through a guided experience | New developers, first-time users | Getting started guides |
| **How-to Guide** | Task-oriented; solves a specific problem step-by-step | Developers performing a task | `GOOGLE_SSO_SETUP.md`, `DOCKER_SETUP.md` |
| **Reference** | Information-oriented; describes API, config, or technical details | Developers looking up specifics | `AUTH_QUICK_REFERENCE.md`, API docs |
| **Explanation** | Understanding-oriented; provides context, rationale, and background | Architects, decision-makers | `technology.md`, `requirements.md` |

### When to Create Each Type

- **Specifications** (requirements, theme, layout, technology) → **Explanation** — focus on *what* and *why*
- **Setup guides** (SSO, Docker, environment) → **How-to** — focus on *how* to accomplish the task
- **Quick references** (env vars, API snippets) → **Reference** — focus on *lookup*
- **Troubleshooting** → **How-to** — focus on *solving problems*

---

## 2. Hierarchy & Folder Structure

### 2.1 Directory Structure

```
docs/
├── README.md                          # Master index (always start here)
├── DOCUMENTATION_GUIDELINES.md        # This document
│
├── Core Specifications (root level)  # High-level product/architecture
│   ├── requirements.md
│   ├── theme.md
│   ├── layout.md
│   ├── technology.md
│   ├── auth.md                        # Redirect to auth/auth.md
│   └── development.md
│
├── auth/                              # Authentication domain
│   ├── README.md                      # Domain index (required)
│   ├── auth.md                        # Core spec for this domain
│   └── *.md
│
├── deploy/                            # Deployment domain
│   ├── README.md
│   └── *.md
│
├── configuration-wizard/              # Configuration wizard flows
│   ├── README.md
│   └── *.md
│
├── implementation-notes/              # Fixes, features, migrations
│   ├── README.md
│   └── *.md
│
├── pr-review-tests/                   # Process/tooling documentation
│   ├── README.md
│   └── *.md
│
└── [domain]/                          # Future domain subdirs follow this pattern
```

### 2.2 Hierarchy Rules

1. **Root-level docs** — Core specifications that apply across the entire application. Keep to 6–8 primary documents maximum.
2. **Subdirectories** — Created when a domain has **5+ related documents** or requires its own navigation flow.
3. **Each subdirectory** must have a **README.md** that:
   - Lists all documents in that folder
   - Provides a "start here" recommendation
   - Includes a quick lookup table
4. **Avoid nesting** beyond two levels (e.g., `auth/` is fine; `auth/google/setup.md` is discouraged unless the domain is large and clearly separable).

### 2.3 When to Create a New Subdirectory

Create a subdirectory when:
- A domain has 5+ closely related documents
- The domain has distinct setup, reference, and troubleshooting needs
- A single README cannot reasonably index all docs

---

## 3. Tone & Voice

### 3.1 General Principles

- **Clear & direct** — Use active voice. Prefer "Configure the variable" over "The variable should be configured."
- **Concise** — Avoid filler. Every sentence should add value.
- **Consistent** — Use the same terminology across documents (e.g., "tenant" not "organization" in one doc and "tenant" in another).
- **Audience-aware** — Match technical depth to the reader (setup guides assume less context than architecture docs).

### 3.2 By Document Type

| Type | Tone |
|------|------|
| **Specifications** | Authoritative, precise; may use formal structure and IDs |
| **How-to guides** | Instructional, second person ("you"); imperative mood |
| **Reference** | Terse, scannable; tables and code blocks over prose |
| **Troubleshooting** | Empathetic, solution-focused; problem → cause → fix |

### 3.3 Language & Formatting

- Use **American English** (e.g., "color", "organization").
- Prefer **present tense** ("The API returns..." not "The API will return...").
- Use **title case** for headings (e.g., "Quick Start", "Environment Variables").
- **Code and technical terms** — Use backticks for: env vars, file paths, commands, API endpoints, code identifiers.

---

## 4. Level of Granularity

### 4.1 Document Size

- **Target:** 300–1,500 lines per document for readability.
- **Split when:** A doc exceeds ~1,500 lines or when sections can stand as standalone how-to or reference docs.
- **Merge when:** Several small docs (< 150 lines each) cover the same domain and are always read together.

### 4.2 Section Depth

- Use **3 levels of headings** (H2 → H3 → H4) as the default. Avoid H5/H6 unless the topic is dense.
- **One concept per section** — If a section grows beyond ~200 lines, consider splitting.

### 4.3 Code Examples

- Include **working examples** — Copy-paste ready where possible.
- **Minimal examples** for reference; **complete examples** for tutorials.
- Always specify **context** (e.g., "In your `.env.local`") before code blocks.

### 4.4 When to Add vs. Update

- **New doc:** New domain, major feature, or distinct workflow not covered elsewhere.
- **Update existing:** Changes to behavior, new options, deprecations.
- **Archive/deprecate:** Superseded by another doc — add a notice and link to the replacement.

---

## 5. Document Metadata & Conventions

### 5.1 Required Header (for all new docs)

```markdown
# Document Title

> **Status**: [Draft | In Progress | Complete | Deprecated]
> **Last Updated**: YYYY-MM-DD
> **Audience**: [Developers | DevOps | Product | All]
```

### 5.2 Naming Conventions

| Pattern | Use For | Example |
|---------|---------|---------|
| `UPPERCASE_WITH_UNDERSCORES.md` | Implementation notes (avoid; prefer merging into canonical docs) | — |
| `lowercase-with-hyphens.md` | Core specs, general guides | `requirements.md`, `theme.md` |
| `PascalCase.md` | Domain READMEs, special cases | `README.md` |

**Recommendation:** Prefer **lowercase-with-hyphens** for new docs unless the document is an implementation note or fix (then UPPERCASE).

### 5.3 Cross-Referencing

- Use **relative links** for docs in the same tree: `[Theme](../theme.md)`.
- Use **anchor links** for sections: `[Color System](../theme.md#color-system)`.
- When moving or renaming docs, **update references** in README and related docs.

### 5.4 Requirement IDs (requirements.md)

- Format: `MODULE-NNN` (e.g., `AS-001`, `TASK-001`).
- Use for traceability in requirements.md only.

---

## 6. Structure Within a Document

### 6.1 Standard Sections (when applicable)

1. **Title & status**
2. **Overview** (2–4 sentences)
3. **Prerequisites** (if any)
4. **Main content** (ordered by importance or task flow)
5. **Examples** (code, config)
6. **Troubleshooting** (or link to dedicated doc)
7. **Related docs** (cross-references)

### 6.2 Scannability

- Use **tables** for comparisons, options, and quick lookup.
- Use **bulleted lists** for steps or non-sequential items.
- Use **numbered lists** for procedures.
- Include a **Quick Lookup** or **Summary** section for docs > 400 lines.

---

## 7. Maintenance & Ownership

### 7.1 When to Update

| Document | Update When |
|----------|-------------|
| requirements.md | Adding/changing features |
| theme.md | Design tokens, components |
| layout.md | Structure, navigation |
| technology.md | Tech stack, architecture |
| auth/* | Authentication changes |
| deploy/* | Deployment, CI/CD changes |

### 7.2 Commit Convention

```text
docs: update [document] - [brief reason]
docs: add [document] - [brief description]
docs: restructure [domain] - [brief reason]
```

### 7.3 Review Checklist

Before merging doc changes:
- [ ] Links are valid (no broken anchors)
- [ ] Code examples are current
- [ ] Last Updated date is set
- [ ] README / index updated if adding new docs
- [ ] Follows naming and tone guidelines

---

## 8. Quick Reference

| I want to... | Action |
|--------------|--------|
| Add a new core concept | Add to existing spec or create root-level doc; update docs/README.md |
| Document a new domain | Create `docs/[domain]/` with README.md; add to docs/README.md |
| Write a setup guide | Use how-to structure; place in relevant domain folder |
| Add a quick reference | Keep it terse; tables + code snippets |
| Document a fix or migration | Use UPPERCASE name; link from domain README |
| Deprecate a doc | Add status notice; link to replacement |

---

## 9. Anti-Patterns to Avoid

- **Transient docs** — Avoid docs for one-time fixes, migrations, or "what we changed" announcements. Merge into canonical docs (e.g. troubleshooting, setup guides) and remove.
- **Duplicate content** — Link to the canonical doc instead of copying.
- **Orphan docs** — Every doc should be linked from at least one README or index.
- **Outdated examples** — Remove or update examples when APIs change.
- **Unnecessary nesting** — Prefer fewer, well-organized docs over deep folder trees.
- **Mixed audiences** — Split "admin setup" and "developer API" into separate docs if both are long.

---

**Version:** 1.0  
**Last Updated:** 2026-03-02  
**Maintained By:** Development Team
