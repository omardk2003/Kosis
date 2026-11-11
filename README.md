# Kosis: DISCIPLINE

> Less planning. More doing. Less pressure. More progress.

DISCIPLINE is a calm, mobile-first habit PWA (Next.js 16, Supabase, EN/DA). Project rules live in
`CLAUDE.md`, specifications in `docs/`, and decisions in `docs/adr/`.

**Status: Phase 0** (foundation). There are no habit features yet.

## Requirements

Node 22 (`.nvmrc`) and Docker, for the local Supabase stack.

## Local development

Install dependencies:

```bash
npm ci
```

Start local Supabase (auth, database, REST and Mailpit only):

```bash
npx supabase start -x studio,imgproxy,vector,logflare,edge-runtime,realtime,storage-api,supavisor,postgres-meta
```

Print the local URL and keys, then copy the API URL and the publishable/anon key into `.env.local` (see `.env.example`):

```bash
npx supabase status
```

Start the dev server, then open http://localhost:3000. Sign-in codes show up in Mailpit (URL printed by `supabase status`).

```bash
npm run dev
```

## Checks

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npx vitest run
```

```bash
npm run build
```

```bash
npm run check:bundle
```

```bash
npx playwright test --trace off
```

**Never** point local or preview builds at the production Supabase project. `src/server/env.ts` refuses to.
