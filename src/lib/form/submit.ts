/**
 * Contact form submission: the seam between the form UI and the outside world.
 * Pure TS; `fetch` is injected so tests (and the client script) control the network.
 */

export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const DEFAULT_TIMEOUT_MS = 15_000;

/** What the visitor typed, plus the chosen role label and the honeypot value. */
export interface ContactSubmission {
  /** Visible label of the chosen role chip, in the page's language. */
  role: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  /** Honeypot: humans never see it, so anything here means a bot. */
  botcheck: string;
}

export interface SubmitOptions {
  /** Web3Forms access key from site.json; null/blank → mailto fallback. */
  accessKey: string | null;
  /** Fallback recipient (contacts.email). */
  to: string;
  fetch: typeof globalThis.fetch;
  /** Give up after this long (default 15 s). */
  timeoutMs?: number;
}

/**
 * - `sent`: Web3Forms accepted it.
 * - `failed`: network/HTTP/API error or timeout; the UI offers a retry.
 * - `dropped`: honeypot filled; nothing was sent, the UI shows success anyway.
 * - `mailto`: no key configured; the UI opens `url` in the visitor's mail client.
 */
export type SubmitResult =
  | { kind: 'sent' }
  | { kind: 'failed' }
  | { kind: 'dropped' }
  | { kind: 'mailto'; url: string };

/** `[<role>] <name>`: the subject line for both Web3Forms and mailto. */
export function contactSubject(s: Pick<ContactSubmission, 'role' | 'name'>): string {
  return `[${s.role}] ${s.name}`;
}

/** JSON body for the Web3Forms API. */
export function web3formsPayload(s: ContactSubmission, accessKey: string) {
  return {
    access_key: accessKey,
    subject: contactSubject(s),
    from_name: s.name,
    replyto: s.email,
    name: s.name,
    email: s.email,
    phone: s.phone,
    message: s.message,
    role: s.role,
    botcheck: '',
  };
}

/** mailto: URL to `to` with the same subject and a plain-text body of every field. */
export function contactMailto(s: ContactSubmission, to: string): string {
  const body = [s.name, s.email, ...(s.phone.trim() ? [s.phone] : []), '', s.message].join('\n');
  return `mailto:${to}?subject=${encodeURIComponent(contactSubject(s))}&body=${encodeURIComponent(body)}`;
}

export async function submitContact(s: ContactSubmission, opts: SubmitOptions): Promise<SubmitResult> {
  if (s.botcheck.trim() !== '') return { kind: 'dropped' };
  const key = opts.accessKey?.trim();
  if (!key) return { kind: 'mailto', url: contactMailto(s, opts.to) };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await opts.fetch(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(web3formsPayload(s, key)),
    });
    if (!res.ok) return { kind: 'failed' };
    const json = (await res.json()) as { success?: unknown } | null;
    return json?.success === true ? { kind: 'sent' } : { kind: 'failed' };
  } catch {
    // Network error, abort on timeout, or a non-JSON body.
    return { kind: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}
