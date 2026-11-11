import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchOtp, localStackUp, uniqueEmail } from "./helpers/mail";

const en = JSON.parse(
  readFileSync(join(__dirname, "../content/messages/en.json"), "utf8"),
) as Record<string, Record<string, string> & { errors?: Record<string, string> }>;
const s = en.signIn!;
const API = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

let stackUp = false;
test.beforeAll(async () => {
  stackUp = await localStackUp();
});
test.beforeEach(({}, testInfo) => {
  testInfo.skip(
    !stackUp,
    "Local Supabase stack not reachable at http://127.0.0.1:54321 (run `npx supabase start`)",
  );
  testInfo.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL not exported: the app server is not configured for the local stack",
  );
});

async function requestCode(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel(s.emailLabel!, { exact: true }).fill(email);
  await page.getByRole("button", { name: s.sendCode! }).click();
  await expect(page.getByText(s.codeSentNeutral!)).toBeVisible();
}

test("sign in with a code, wrong code first, then sign out", async ({ page }) => {
  const email = uniqueEmail();
  await requestCode(page, email);
  const code = await fetchOtp(email);

  const wrong = code === "000000" ? "111111" : "000000";
  await page.getByLabel(s.codeLabel!).fill(wrong);
  await page.getByRole("button", { name: s.verify!, exact: true }).click();
  await expect(page.getByText(s.errors!.badCode!)).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);

  await page.getByLabel(s.codeLabel!).fill(code);
  await page.getByRole("button", { name: s.verify!, exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { level: 1, name: en.today!.title! })).toBeVisible();
  await expect(page.getByText(en.today!.signedIn!)).toBeVisible();

  await page.getByRole("button", { name: en.today!.signOut! }).click();
  await expect(page).toHaveURL(/\/sign-in\?signedOut=1$/);
  await expect(page.getByText(s.signedOut!)).toBeVisible();

  await page.goto("/today");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("known and unknown emails show identical neutral text", async ({ page, browser }) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  test.skip(
    !serviceKey,
    "SUPABASE_SERVICE_ROLE_KEY (local stack) not exported; needed to pre-create a known user",
  );
  const known = uniqueEmail("known");
  const res = await fetch(`${API}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceKey!,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: known, email_confirm: true }),
  });
  expect(res.ok).toBe(true);

  await requestCode(page, known);
  const knownText = await page.getByRole("status").first().innerText();

  const ctx = await browser.newContext();
  const page2 = await ctx.newPage();
  await requestCode(page2, uniqueEmail("unknown"));
  const unknownText = await page2.getByRole("status").first().innerText();
  await ctx.close();

  expect(knownText).toBe(s.codeSentNeutral);
  expect(unknownText).toBe(knownText);
});
