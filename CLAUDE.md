# SocialMagic

Full-stack web application for generating social media copywriting content.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Language**: TypeScript
- **Package Manager**: npm

## Project Conventions

- Use App Router (`app/` directory) for routing
- Server Components by default; add `"use client"` only when needed
- Co-locate page-specific components under `app/` routes
- Shared components go in `components/`
- Utility functions in `lib/`
- Type definitions in `types/`

## Commands

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm run type-check` — Run TypeScript type checking

## Architecture-First Rule

- **ALL UI development must be preceded by**: database schema design, core interface/type definitions, and API route logic
- Development order: Types → Database Schema → API Routes → Server Actions → UI Components
- Never start a UI component until its data contracts (types + API) are finalized
- Every module must be independently testable via its typed interface
- **Blueprint-first**: Before modifying any core API logic, the logic flow diagram in `blueprint.md` must be updated first. No API code changes without an up-to-date blueprint.
- **No placeholder comments**: `// TODO`, `// FIXME`, `// placeholder`, `// implement later`, and similar stub comments are strictly forbidden. Every function must have a complete, working implementation. If a function cannot be implemented yet, the entire module should be deferred — never merge incomplete code.

## Git-Workflow Rule

- After completing each independent functional module (e.g., schema definition, interface file, API route), IMMEDIATELY execute:
  ```
  git add -A && git commit -m "feat: <module_name>" && git push
  ```
- Commit message format: `feat: <module>` for new features, `fix: <module>` for bug fixes, `chore: <module>` for config/tooling
- Each commit must represent one atomic, self-contained module
- Always push to remote after each commit — no local-only accumulations

## Code Style

- Functional components with named exports
- TypeScript strict mode enabled
- Tailwind CSS for all styling (no CSS modules, no inline styles)
- Use Lucide React icons exclusively (`import { IconName } from "lucide-react"`)
- Prefer `async/await` over `.then()` chains
