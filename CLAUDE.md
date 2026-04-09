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

## Code Style

- Functional components with named exports
- TypeScript strict mode enabled
- Tailwind CSS for all styling (no CSS modules, no inline styles)
- Use Lucide React icons exclusively (`import { IconName } from "lucide-react"`)
- Prefer `async/await` over `.then()` chains
