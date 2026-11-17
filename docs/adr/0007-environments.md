# ADR-0007: Environments, secrets and migration deployment
Status: Accepted · 2026-11-11 · Detail: architecture §9, `docs/runbooks/staging-setup.md`

## Decision
| Env | Supabase | Vercel scope |
|---|---|---|
| Local / CI | Supabase CLI stack (Docker) | — |
| Preview | **Staging project** (separate, owner-created, D3) | Preview |
| Production | "Kosis Project" (eu-west-1) | Production only |

- **Runtime guard:** `src/server/env.ts` refuses the production project ref unless `VERCEL_ENV === 'production'`. Unit tests cover it, and test runs abort if the URL isn't local.
- **Vercel deploys:** `vercel.json` sets `git.deploymentEnabled` to `{ "**": false, "claude/project-setup": true }`. Vercel deploys a branch if any matching rule is `true`, and `**` also matches branches with `/`. So only the Phase 0 branch builds Preview deployments, and `main` (production) stays off. `tests/unit/vercel-config.test.ts` guards this. Changing it requires owner approval.
- **Secrets:** no `.env*` files in git, and `.env.example` holds names only. The application doesn't use a service-role key in Phase 0. CI uses the **local stack's** fixed development admin key, which is masked in logs, only so E2E tests can pre-create a user on the throwaway local database. It's never a staging or production key.
- **Migrations:** applied locally and in CI only. Staging and production use a GitHub Actions workflow bound to protected GitHub Environments that need owner approval. That workflow is added in Phase 1.
- **Agents** never write to production through the MCP.

## Consequences
- The staging project ref must be supplied by the owner before preview auth works.
