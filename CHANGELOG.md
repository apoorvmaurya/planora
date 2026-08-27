# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive Vitest test suite with V8 coverage reporting (`pnpm test`).
- Offline in-memory Supabase mock client (`lib/testing/supabaseMock.ts`) with chainable query simulation.
- Unit tests for chronological itinerary sorting & cleansing heuristics (`lib/itinerary/sort.ts`).
- Unit tests for access control and authorization paths (`lib/security/access.ts`).
- Unit tests for bilateral and multi-party expense split algorithms (`lib/utils/splitCalculator.ts`).
- Dockerfile, `.dockerignore`, and `.devcontainer/devcontainer.json` for reproducible containerized development.
- `docker-compose.yml` defining local stack development environment.
- CI/CD security audit gate with `pnpm audit --prod --audit-level=high`.
- CI/CD automated test gate running test suite on pushes and pull requests.
- New `.env.example` file and updated `.env.local.example` with structured variable placeholders.
- `CONTRIBUTING.md` guide with development setup and PR guidelines.

### Changed
- Refactored `app/(app)/plans/[planId]/page.tsx` from 2064 LOC into modular subcomponents: `PlanChatDrawer`, `TransitPanel`, `PlanAdminSheet`, and `PlanAddActivityDialog`.
- Refactored `app/(app)/plans/[planId]/edit/page.tsx` into modular step components.
- Refactored `app/(app)/groups/[groupId]/settings/page.tsx` into modular settings tab panels.
- Replaced unconstrained `any` types in `ItineraryItemCard` and plan pages with strongly-typed interfaces.
- Upgraded Next.js and locked production dependency resolutions to eliminate high-severity CVEs.
- Moved `shadcn` CLI tooling to `devDependencies`.

## [0.1.0] - 2026-06-24

### Added
- Collaborative trip planning platform with real-time itinerary coordination.
- AI-driven itinerary generation and smart suggestion engine.
- Shared group expense splitting with equal and custom allocations.
- Real-time voting mechanism for proposed itinerary activities.
- Geocoding and route search integration with LocationIQ.
- Web push notification support and email recaps.
