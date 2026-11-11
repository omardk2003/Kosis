-- DISCIPLINE: security baseline (Phase 0). ADR-0006, architecture §4.3.
-- No domain tables here: those arrive in Phase 1 after owner approval.
-- Applied ONLY to the local stack / CI and, later, staging via the approved workflow. Never ad hoc to production.

-- 1. Future objects created by the migration role get no implicit grants.
alter default privileges for role postgres in schema public revoke all on tables    from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
-- PUBLIC EXECUTE cannot be revoked per schema; this applies to all functions postgres creates.
alter default privileges for role postgres revoke execute on functions from public;

-- 2. Existing objects in public (none expected yet; kept for idempotency).
revoke all on all tables    in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- 3. Private schema for logic and helpers. Never listed in the API's exposed schemas.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
-- Phase 1 grants USAGE on private plus EXECUTE on the two INVOKER read helpers only (H17).
