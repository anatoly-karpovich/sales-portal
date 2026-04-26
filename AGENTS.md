# AGENTS Guide: sales-portal

## Repository scope

This is a monorepo.

Active applications:

- `backend/` — backend API
- `admin-frontend/` — admin SPA

Do not work in:

- `frontend/`

Requirements and task documentation are located in:

- `docs/`

## Mandatory instruction discovery

Before starting any task:

1. Read relevant requirements from `docs/`.
2. Determine which active application is affected.
3. Read the closest app-specific AGENTS.md:
   - for backend/API/database/tasks: `backend/AGENTS.md`
   - for admin UI/tasks: `admin-frontend/AGENTS.md`
4. Follow the app-specific AGENTS.md as the source of truth for architecture, commands, conventions, and quality gates.

If a task affects both `backend/` and `admin-frontend/`, read and follow both nested AGENTS.md files.

## Forbidden area

Never modify files inside `frontend/`.

The `frontend/` directory is not part of the active working scope for this repository.
Do not inspect, refactor, format, migrate, or update it unless the user explicitly overrides this rule.

## Requirements-first workflow

For every implementation task:

1. Check `docs/` first.
2. Use docs as product requirements.
3. Then inspect the relevant application code.
4. Keep implementation aligned with the existing architecture.
5. Avoid unrelated refactoring.

## Task routing

Backend tasks usually involve:

- API routes
- controllers
- services
- middleware
- MongoDB/Mongoose models
- DTOs
- validation schemas
- Swagger/API docs

Use `backend/AGENTS.md`.

Admin frontend tasks usually involve:

- React components
- pages
- routing
- API client modules
- React Query hooks
- MUI UI
- forms
- tables
- filters
- data-testid values

Use `admin-frontend/AGENTS.md`.

Shared/product tasks may require:

- reading `docs/`
- updating both `backend/` and `admin-frontend/`
- validating contracts on both sides

Use both nested AGENTS.md files.

## Quality gate rule

Before handoff, run the checks required by the nested AGENTS.md for every affected app.

Do not claim checks passed unless they were actually run.
If checks cannot be run, clearly state why.
