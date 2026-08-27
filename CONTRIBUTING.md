# Contributing to Planora

Thank you for your interest in contributing to Planora! We welcome contributions from developers of all skill levels.

## Getting Started

### Prerequisites

- **Node.js**: >= 20.x
- **pnpm**: >= 9.x (recommended: 10.x)
- **Git**
- Optional: **Docker** & **Docker Compose** for local stack development

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/apoorvmaurya/planora.git
   cd planora
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your local credentials, or use the built-in offline test mock if running tests in isolation.

4. **Start Development Server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Development Workflow

### Coding Standards

- **TypeScript**: Ensure strict typing. Avoid using `any`; define explicit interfaces in `lib/types/` or component prop definitions.
- **File Length**: Keep component and route files focused and modular (target < 500 LOC per file).
- **Styling**: Use Tailwind CSS utilities in conjunction with `@/components/ui/` primitives.

### Verification & Testing

Before submitting a pull request, ensure all local checks pass:

1. **Run Unit & Integration Tests:**
   ```bash
   pnpm test
   ```
   All tests must pass and coverage reports will be generated automatically.

2. **Run TypeScript Verification:**
   ```bash
   pnpm exec tsc --noEmit
   ```

3. **Run Linter:**
   ```bash
   pnpm run lint
   ```

4. **Run Dependency Security Audit:**
   ```bash
   pnpm audit --prod --audit-level=high
   ```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` A new user-facing feature or capability
- `fix:` A bug fix
- `test:` Adding or updating tests
- `refactor:` Code restructuring without altering external behavior
- `docs:` Documentation updates
- `chore:` Dependency or build system updates

Keep commits focused and self-contained. Pair new features or bug fixes directly with automated tests verifying their behavior.

---

## Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes with clear commit messages.
3. Push to your branch and open a Pull Request against `main`.
4. Ensure all CI status checks (Build, Lint, Typecheck, Test, and Audit) succeed.
