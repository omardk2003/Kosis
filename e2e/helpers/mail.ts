/** Local mail catcher helper (Mailpit, bundled with the Supabase CLI). Local stack only. */
const MAIL_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export function uniqueEmail(prefix = "qa"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

export async function localStackUp(apiUrl = "http://127.0.0.1:54321"): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/auth/v1/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

type MailpitList = { messages?: { ID: string }[] };
type MailpitMessage = { Text?: string; HTML?: string };

/** Poll Mailpit for the newest message to `email` and return its 6-digit code. */
export async function fetchOtp(email: string, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = (await (
      await fetch(`${MAIL_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    ).json()) as MailpitList;
    const id = list.messages?.[0]?.ID;
    if (id) {
      const msg = (await (
        await fetch(`${MAIL_URL}/api/v1/message/${id}`)
      ).json()) as MailpitMessage;
      const m = /(?<!\d)(\d{6})(?!\d)/.exec(msg.Text || msg.HTML || "");
      if (m) return m[1]!;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No OTP email for ${email} within ${timeoutMs} ms`);
}
