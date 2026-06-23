## Description

Please include a summary of the changes, related issues, and motivation/context.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Security patch / compliance update
- [ ] Code style / Formatting / Chore

## Security Checklist

Before merging, verify the following security best practices have been reviewed:

- **Row Level Security (RLS)**:
  - [ ] Are RLS policies enabled and verified for any new database tables?
  - [ ] Do `UPDATE` policies include both `USING` and `WITH CHECK` clauses?
  - [ ] Did you use Postgres `TO` clauses instead of the deprecated `auth.role()`?
  - [ ] Have all ownership-predicates (like `auth.uid() = user_id`) been configured?
- **Data Exposure**:
  - [ ] Are views protected from bypassing RLS (using `security_invoker = true` where applicable)?
  - [ ] Are trigger / helper database functions configured securely (e.g. `SECURITY DEFINER SET search_path = public`)?
- **API Keys & Secrets**:
  - [ ] Are third-party API keys hidden behind backend routes? (No `NEXT_PUBLIC_` prefixes on private tokens)
  - [ ] Have environment variables been added to `.env.local.example`?
  - [ ] Are any raw keys or passwords committed in this code? (Check diff for secrets)

## Verification Plan

### Manual Verification
Describe steps taken to manually test the changes (e.g., browsers tested, responsive design checked, console errors checked).

### Automated Tests
- [ ] Linting passes (`pnpm run lint`)
- [ ] Typecheck passes (`npx tsc --noEmit`)
- [ ] Next.js production build passes (`pnpm run build`)
