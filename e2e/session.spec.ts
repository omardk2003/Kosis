import { test, expect, type BrowserContext, type Cookie } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchOtp, localStackUp, uniqueEmail } from "./helpers/mail";

const s = JSON.parse(readFileSync(join(__dirname, "../content/messages/en.json"), "utf8")).signIn;
const today = JSON.parse(
  readFileSync(join(__dirname, "../content/messages/en.json"), "utf8"),
).today;

let stackUp = false;
test.beforeAll(async () => {
  stackUp = await localStackUp();
});
test.beforeEach(({}, testInfo) => {
  testInfo.skip(
    !stackUp || !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Local Supabase stack not running",
  );
});

const AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;
type StoredSession = { access_token: string; refresh_token: string; expires_at: number };

async function signIn(page: import("@playwright/test").Page) {
  const email = uniqueEmail("session");
  await page.goto("/sign-in");
  await page.getByLabel(s.emailLabel, { exact: true }).fill(email);
  await page.getByRole("button", { name: s.sendCode }).click();
  await expect(page.getByText(s.codeSentNeutral)).toBeVisible();
  await page.getByLabel(s.codeLabel).fill(await fetchOtp(email));
  await page.getByRole("button", { name: s.verify }).click();
  await expect(page).toHaveURL(/\/today$/);
}

async function authCookies(context: BrowserContext): Promise<Cookie[]> {
  return (await context.cookies()).filter((c) => AUTH_COOKIE.test(c.name));
}

/** @supabase/ssr stores the session as "base64-<base64url JSON>", possibly chunked (.0, .1, …). */
function readSession(cookies: Cookie[]): { base: string; session: StoredSession } {
  const sorted = [...cookies].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
  const base = sorted[0]!.name.replace(/\.\d+$/, "");
  const raw = sorted.map((c) => c.value).join("");
  const json = Buffer.from(raw.replace(/^base64-/, ""), "base64url").toString("utf8");
  return { base, session: JSON.parse(json) as StoredSession };
}

async function writeSession(
  context: BrowserContext,
  template: Cookie,
  base: string,
  session: StoredSession,
) {
  const value = "base64-" + Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  await context.clearCookies({ name: AUTH_COOKIE });
  await context.addCookies([{ ...template, name: base, value }]);
}

test("session cookies are httpOnly, Secure and SameSite=Lax, invisible to page JS", async ({
  page,
  context,
}) => {
  await signIn(page);
  const cookies = await authCookies(context);
  expect(cookies.length).toBeGreaterThan(0);
  for (const c of cookies) {
    expect(c.httpOnly).toBe(true);
    expect(c.secure).toBe(true);
    expect(c.sameSite).toBe("Lax");
  }
  expect(await page.evaluate(() => document.cookie)).not.toMatch(/sb-.+-auth-token/);
});

test("an expired access token is refreshed server-side without signing the user out", async ({
  page,
  context,
}) => {
  await signIn(page);
  const before = await authCookies(context);
  const { base, session } = readSession(before);

  // Mark the stored session as expired; keep the (single-use) refresh token valid.
  await writeSession(context, before[0]!, base, {
    ...session,
    expires_at: Math.floor(Date.now() / 1000) - 60,
  });

  await page.goto("/today");
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: today.title })).toBeVisible();

  const after = readSession(await authCookies(context)).session;
  expect(after.refresh_token).not.toBe(session.refresh_token); // rotated
  expect(after.access_token).not.toBe(session.access_token);
  expect(after.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
  for (const c of await authCookies(context)) expect(c.httpOnly).toBe(true);

  // Still signed in on the next navigation.
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/today$/);
});

test("an expired session with an unusable refresh token fails safe to sign-in", async ({
  page,
  context,
}) => {
  await signIn(page);
  const before = await authCookies(context);
  const { base, session } = readSession(before);
  await writeSession(context, before[0]!, base, {
    ...session,
    refresh_token: "invalid-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) - 60,
  });
  await page.goto("/today");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("sign-out clears the session", async ({ page, context }) => {
  await signIn(page);
  await page.getByRole("button", { name: today.signOut }).click();
  await expect(page).toHaveURL(/\/sign-in\?signedOut=1$/);
  expect(await authCookies(context)).toHaveLength(0);
  await page.goto("/today");
  await expect(page).toHaveURL(/\/sign-in$/);
});
