import { describe, expect, it, vi } from 'vitest';
import { submitContact, WEB3FORMS_ENDPOINT, type ContactSubmission } from '../../src/lib/form/submit';

const submission: ContactSubmission = {
  role: 'Partner o investitore',
  name: 'Mario Rossi',
  email: 'mario@example.com',
  phone: '+39 333 1234567',
  message: 'Vorrei parlare di un immobile.',
  botcheck: '',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('submitContact with a Web3Forms key', () => {
  it('POSTs the message as JSON to Web3Forms and resolves "sent" on success', async () => {
    const fetch = vi.fn(async () => jsonResponse({ success: true, message: 'ok' }));
    const result = await submitContact(submission, { accessKey: 'KEY-123', to: 'hello@x.com', fetch });

    expect(result).toEqual({ kind: 'sent' });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.web3forms.com/submit');
    expect(WEB3FORMS_ENDPOINT).toBe(url);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
    expect(new Headers(init.headers).get('Accept')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({
      access_key: 'KEY-123',
      subject: '[Partner o investitore] Mario Rossi',
      from_name: 'Mario Rossi',
      replyto: 'mario@example.com',
      name: 'Mario Rossi',
      email: 'mario@example.com',
      phone: '+39 333 1234567',
      message: 'Vorrei parlare di un immobile.',
      role: 'Partner o investitore',
      botcheck: '',
    });
  });
});

describe('submitContact failures', () => {
  const opts = (fetch: typeof globalThis.fetch) => ({ accessKey: 'KEY-123', to: 'hello@x.com', fetch });

  it('resolves "failed" on an HTTP error status', async () => {
    const fetch = vi.fn(async () => jsonResponse({ success: false, message: 'boom' }, 500));
    expect(await submitContact(submission, opts(fetch))).toEqual({ kind: 'failed' });
  });

  it('resolves "failed" when Web3Forms answers 200 with success: false', async () => {
    const fetch = vi.fn(async () => jsonResponse({ success: false, message: 'Invalid key' }));
    expect(await submitContact(submission, opts(fetch))).toEqual({ kind: 'failed' });
  });

  it('resolves "failed" when the body is not JSON', async () => {
    const fetch = vi.fn(async () => new Response('<html>oops</html>', { status: 200 }));
    expect(await submitContact(submission, opts(fetch))).toEqual({ kind: 'failed' });
  });

  it('resolves "failed" on a network error', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await submitContact(submission, opts(fetch))).toEqual({ kind: 'failed' });
  });

  it('aborts and resolves "failed" when the request outlives the timeout', async () => {
    let signal: AbortSignal | undefined;
    const fetch = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init?.signal ?? undefined;
          signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const result = await submitContact(submission, { ...opts(fetch), timeoutMs: 20 });
    expect(result).toEqual({ kind: 'failed' });
    expect(signal?.aborted).toBe(true);
  });
});

describe('submitContact honeypot', () => {
  it('drops a submission with a filled honeypot without touching the network', async () => {
    const fetch = vi.fn(async () => jsonResponse({ success: true }));
    const result = await submitContact({ ...submission, botcheck: 'http://spam.example' }, {
      accessKey: 'KEY-123',
      to: 'hello@x.com',
      fetch,
    });
    expect(result).toEqual({ kind: 'dropped' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('drops a bot submission even when there is no key (no mailto opened)', async () => {
    const fetch = vi.fn(async () => jsonResponse({ success: true }));
    const result = await submitContact({ ...submission, botcheck: 'x' }, { accessKey: null, to: 'hello@x.com', fetch });
    expect(result).toEqual({ kind: 'dropped' });
  });
});

describe('submitContact without a key (mailto fallback)', () => {
  it.each([null, '', '   '])('returns a mailto URL and never calls fetch (key %j)', async (accessKey) => {
    const fetch = vi.fn(async () => jsonResponse({ success: true }));
    const result = await submitContact(submission, { accessKey, to: 'hello@simoneguarneri.com', fetch });
    expect(fetch).not.toHaveBeenCalled();
    expect(result.kind).toBe('mailto');
  });

  it('addresses contacts.email with an encoded subject and a body listing every field', async () => {
    const fetch = vi.fn(async () => jsonResponse({ success: true }));
    const result = await submitContact(
      { ...submission, message: 'Riga 1\nRiga 2 & altro?' },
      { accessKey: null, to: 'hello@simoneguarneri.com', fetch },
    );
    if (result.kind !== 'mailto') throw new Error('expected mailto');
    expect(result.url).toBe(
      'mailto:hello@simoneguarneri.com' +
        '?subject=%5BPartner%20o%20investitore%5D%20Mario%20Rossi' +
        '&body=Mario%20Rossi%0Amario%40example.com%0A%2B39%20333%201234567%0A%0ARiga%201%0ARiga%202%20%26%20altro%3F',
    );
  });

  it('leaves the phone line out of the body when no phone was given', async () => {
    const fetch = vi.fn(async () => jsonResponse({ success: true }));
    const result = await submitContact({ ...submission, phone: '' }, { accessKey: null, to: 'a@b.co', fetch });
    if (result.kind !== 'mailto') throw new Error('expected mailto');
    const body = decodeURIComponent(new URL(result.url).searchParams.get('body') ?? '');
    expect(body).toBe('Mario Rossi\nmario@example.com\n\nVorrei parlare di un immobile.');
  });
});
