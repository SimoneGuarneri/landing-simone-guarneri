/**
 * Browser wiring for ContactForm.astro: inline validation, submit states, retry.
 * All decisions about what to send and where live in ./submit and ./validate.
 */
import { submitContact, type ContactSubmission } from './submit';
import { contactFields, validateField, type ContactField, type FieldError } from './validate';

interface FormMessages {
  errors: Record<FieldError, string>;
  sending: string;
  success: string;
  /** Shown when falling back to the visitor's mail app, with the address to write to. */
  mailto: string;
  send: string;
}

declare global {
  interface Window {
    /** E2E-only key override; honoured only when the build has no key and allows it. */
    __SG_FORM_KEY__?: string;
  }
}

function accessKeyFor(root: HTMLElement): string | null {
  const built = root.dataset.accessKey?.trim();
  if (built) return built;
  if (root.hasAttribute('data-key-override')) return window.__SG_FORM_KEY__?.trim() || null;
  return null;
}

function setup(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('form');
  const submitBtn = root.querySelector<HTMLButtonElement>('[data-submit]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const errorContent = root.querySelector<HTMLElement>('[data-error-content]');
  const retryBtn = root.querySelector<HTMLButtonElement>('[data-retry]');
  if (!form || !submitBtn || !status || !errorContent || !retryBtn) return;

  const messages = JSON.parse(root.dataset.messages ?? '{}') as FormMessages;
  const control = (f: ContactField) =>
    form.elements.namedItem(f) as HTMLInputElement | HTMLTextAreaElement;
  const errorEl = (f: ContactField) => root.querySelector<HTMLElement>(`[data-error-for="${f}"]`);

  form.noValidate = true; // JS takes over validation messages.
  let sending = false;

  function showError(f: ContactField): FieldError | null {
    const error = validateField(f, control(f).value);
    const el = errorEl(f);
    if (el) el.textContent = error ? messages.errors[error] : '';
    if (error) control(f).setAttribute('aria-invalid', 'true');
    else control(f).removeAttribute('aria-invalid');
    return error;
  }

  for (const f of contactFields) {
    const input = control(f);
    input.addEventListener('blur', () => showError(f));
    // Once flagged, clear the error as soon as the value becomes valid.
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') showError(f);
    });
  }

  function values(): ContactSubmission {
    const data = new FormData(form!);
    const text = (k: string) => String(data.get(k) ?? '').trim();
    return {
      role: text('role'),
      name: text('name'),
      email: text('email'),
      phone: text('phone'),
      message: text('message'),
      botcheck: text('botcheck'),
    };
  }

  function setSending(on: boolean): void {
    sending = on;
    submitBtn!.disabled = on;
    retryBtn!.disabled = on;
    submitBtn!.textContent = on ? messages.sending : messages.send;
    status!.textContent = on ? messages.sending : '';
  }

  async function send(): Promise<void> {
    if (sending) return;
    errorContent!.hidden = true;
    setSending(true);
    const result = await submitContact(values(), {
      accessKey: accessKeyFor(root),
      to: root.dataset.mailTo ?? '',
      fetch: window.fetch.bind(window),
    });
    setSending(false);

    switch (result.kind) {
      case 'sent':
      case 'dropped': // Bots see success too.
        form!.hidden = true;
        status!.dataset.state = 'success';
        status!.textContent = messages.success;
        status!.focus();
        break;
      case 'failed':
        errorContent!.hidden = false;
        // Retry hid the focused button; give focus back to it.
        if (document.activeElement === document.body) retryBtn!.focus();
        break;
      case 'mailto':
        // Without a mail app the redirect does nothing, so always leave a visible way to reach Simone.
        status!.textContent = messages.mailto;
        root.dispatchEvent(new CustomEvent('contactform:mailto', { detail: { url: result.url } }));
        window.location.href = result.url;
        break;
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const invalid = contactFields.filter((f) => showError(f) !== null);
    if (invalid.length > 0) {
      control(invalid[0]!).focus();
      return;
    }
    void send();
  });

  retryBtn.addEventListener('click', () => void send());
}

export function initContactForms(): void {
  document.querySelectorAll<HTMLElement>('[data-contact-form]').forEach(setup);
}
