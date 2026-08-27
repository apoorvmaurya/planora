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
- Unit tests for standardized application error hierarchy (`lib/errors.ts`).
- Strongly-typed domain models in `lib/types/itinerary.ts` (`PlanItem`, `MemberVote`, `GroupMember`, `ActivityLog`, `TransitOption`, `ItineraryItemCardProps`).
- Zod validation schemas in `lib/validations/api.ts` for API route payload verification (`vote`, `transit/add`, `items`).
- Custom `usePlanDetails` reactive hook (`hooks/usePlanDetails.ts`) encapsulating offline cache, data fetching, and Supabase Realtime subscriptions.
- Dockerfile, `.dockerignore`, and `.devcontainer/devcontainer.json` for reproducible containerized development.
- `docker-compose.yml` defining local stack development environment.
- CI/CD security audit gate with `pnpm audit --prod --audit-level=high`.
- CI/CD automated test gate running test suite on pushes and pull requests.
- New `.env.example` file and updated `.env.local.example` with structured variable placeholders.
- `CONTRIBUTING.md` guide with development setup and PR guidelines.

### Changed
- **Zero Files Over 500 LOC**: Systematically decomposed all oversized files across the codebase so that 100% of files are under 500 lines:
  - `app/(app)/plans/[planId]/page.tsx` (2064 LOC $\to$ 425 LOC) via `PlanHeaderBanner`, `PlanItineraryTab`, `PlanSidebar`, `PlanChatDrawer`, `TransitPanel`, `PlanAdminSheet`, `PlanAddActivityDialog`, `PlanActivityLogDrawer`, `PlanAlertDialogs`, and `usePlanDetails`.
  - `app/(app)/plans/[planId]/edit/page.tsx` (813 LOC $\to$ 350 LOC) via `EditPlanConfigForm` and `EditPlanComparisonPanel`.
  - `app/(app)/groups/[groupId]/settings/page.tsx` (774 LOC $\to$ 306 LOC) via `GroupGeneralSettings`, `GroupMembersSettings`, `GroupInviteSettings`, and `GroupDangerSettings`.
  - `app/(app)/plans/new/page.tsx` (675 LOC $\to$ 240 LOC) via `PlanNewStepBasics`, `PlanNewStepPreferences`, and `PlanNewStepGeneration`.
  - `app/api/plans/[planId]/chat/route.ts` (658 LOC $\to$ 167 LOC) via `lib/ai/planChatTools.ts` and `lib/ai/bulkUpdateTool.ts`.
  - `components/shared/ItineraryItemCard.tsx` (615 LOC $\to$ 275 LOC) via `ItineraryItemEditDialog.tsx`.
- Replaced unconstrained `any` types throughout components and route handlers with strongly-typed interfaces.
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
