import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type itCopyType from '../../src/content/it.json';

const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../../src/content/${file}`, import.meta.url), 'utf8')) as T;
const itCopy = readJson<typeof itCopyType>('it.json');
const enCopy = readJson<typeof itCopyType>('en.json');
const contacts = readJson<{ email: string }>('contacts.json');

/*
 * Contact form (#7). Runs at every project viewport, in both languages.
 *
 * The repo ships with site.json `web3formsKey: null`, so a normal build exercises the
 * mailto fallback. The Web3Forms fetch path is covered at unit level
 * (tests/unit/form-submit.test.ts) and here: Playwright's webServer builds with
 * PUBLIC_E2E=1 into dist-e2e/ (never the deployed dist/), so the form has
 * `data-key-override` and honours `window.__SG_FORM_KEY__`, set via addInitScript.
 * Against a server without the override (e.g. a reused plain preview) those tests skip.
 */

const pages = [
  { locale: 'it', url: './', copy: itCopy },
  { locale: 'en', url: './en/', copy: enCopy },
];

const WEB3FORMS = 'https://api.web3forms.com/submit';

function formRoot(page: Page) {
  return page.locator('[data-contact-form]');
}

for (const { locale, url, copy } of pages) {
  const f = copy.form;

  test.describe(`contact form (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${url}#contact`);
      await formRoot(page).scrollIntoViewIfNeeded();
    });

    test('shows localized required-field errors on submit and clears them when fixed', async ({ page }) => {
      const form = formRoot(page);
      await form.getByRole('button', { name: f.send }).click();

      const name = form.getByLabel(f.name, { exact: true });
      const email = form.getByLabel(f.email, { exact: true });
      const message = form.getByLabel(f.message, { exact: true });
      for (const field of [name, email, message]) {
        await expect(field).toHaveAttribute('aria-invalid', 'true');
        await expect(field).toHaveAccessibleDescription(f.errors.required);
      }
      await expect(name).toBeFocused();
      await expect(form.getByLabel(new RegExp(f.phone))).not.toHaveAttribute('aria-invalid', 'true');

      await email.fill('not-an-email');
      await email.blur();
      await expect(email).toHaveAccessibleDescription(f.errors.email);
      await email.fill('mario@example.com');
      await expect(email).not.toHaveAttribute('aria-invalid', 'true');
    });

    test('role chips are a keyboard-operable radio group, first chosen by default', async ({ page }) => {
      const group = formRoot(page).getByRole('group', { name: f.roleLegend });
      const radios = group.getByRole('radio');
      await expect(radios).toHaveCount(f.roles.length);
      await expect(group.getByRole('radio', { name: f.roles[0] })).toBeChecked();
      await group.getByRole('radio', { name: f.roles[0] }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(group.getByRole('radio', { name: f.roles[1] })).toBeChecked();
      const box = await group.locator('label').first().boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    });

    test('honeypot is not visible, not focusable and hidden from assistive tech', async ({ page }) => {
      const hp = formRoot(page).locator('input[name="botcheck"]');
      await expect(hp).toHaveAttribute('tabindex', '-1');
      expect(await hp.isVisible() && (await hp.boundingBox())!.x >= 0).toBe(false);
      await expect(formRoot(page).getByRole('textbox', { name: f.honeypot })).toHaveCount(0);
    });

    test('inputs are ≥16px and the privacy link points at the localized policy', async ({ page }) => {
      const form = formRoot(page);
      const size = await form.getByLabel(f.name, { exact: true }).evaluate((el) => getComputedStyle(el).fontSize);
      expect(parseFloat(size)).toBeGreaterThanOrEqual(16);
      const link = form.getByRole('link', { name: f.privacyLink });
      await expect(link).toHaveAttribute('href', locale === 'it' ? /\/privacy\/$/ : /\/en\/privacy\/$/);
    });

    test('without a key, a valid submit opens a mailto to the contact address', async ({ page }) => {
      test.skip(
        (await formRoot(page).getAttribute('data-access-key')) !== null,
        'build has a Web3Forms key; mailto fallback not in play',
      );
      const form = formRoot(page);
      const mailto = form.evaluate(
        (el) =>
          new Promise<string>((resolve) =>
            el.addEventListener('contactform:mailto', (e) => resolve((e as CustomEvent<{ url: string }>).detail.url)),
          ),
      );
      await form.getByLabel(f.name, { exact: true }).fill('Mario Rossi');
      await form.getByLabel(f.email, { exact: true }).fill('mario@example.com');
      await form.getByLabel(f.message, { exact: true }).fill('Ciao');
      await form.getByRole('button', { name: f.send }).click();
      const href = await mailto;
      expect(href.startsWith(`mailto:${contacts.email}?`)).toBe(true);
      expect(decodeURIComponent(href)).toContain(`[${f.roles[0]}] Mario Rossi`);
      // Visible fallback in case the visitor has no mail app.
      await expect(form.locator('[data-status]')).toContainText(contacts.email);
    });
  });

  test.describe(`contact form via Web3Forms (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        (window as Window & { __SG_FORM_KEY__?: string }).__SG_FORM_KEY__ = 'e2e-test-key';
      });
      await page.goto(`${url}#contact`);
      const overridable = await formRoot(page).getAttribute('data-key-override');
      test.skip(overridable === null, 'build does not allow the test key override (set PUBLIC_E2E=1)');
      await formRoot(page).scrollIntoViewIfNeeded();
    });

    async function fillValid(page: Page) {
      const form = formRoot(page);
      await form.getByRole('radio', { name: f.roles[1] }).check();
      await form.getByLabel(f.name, { exact: true }).fill('Mario Rossi');
      await form.getByLabel(f.email, { exact: true }).fill('mario@example.com');
      await form.getByLabel(new RegExp(f.phone)).fill('+39 333 1234567');
      await form.getByLabel(f.message, { exact: true }).fill('Vorrei parlare di un immobile.');
    }

    test('success: posts to Web3Forms and replaces the fields with the success message', async ({ page }) => {
      let body: Record<string, string> | undefined;
      let release!: () => void;
      const held = new Promise<void>((r) => (release = r));
      await page.route(WEB3FORMS, async (route) => {
        body = route.request().postDataJSON();
        await held;
        await route.fulfill({ json: { success: true, message: 'ok' } });
      });
      await fillValid(page);
      const form = formRoot(page);
      await form.getByRole('button', { name: f.send }).click();

      const sendingBtn = form.getByRole('button', { name: f.status.sending });
      await expect(sendingBtn).toBeDisabled();
      release();

      await expect(form.getByRole('status')).toHaveText(f.status.success);
      await expect(form.getByLabel(f.name, { exact: true })).toBeHidden();
      expect(body).toMatchObject({
        access_key: 'e2e-test-key',
        subject: `[${f.roles[1]}] Mario Rossi`,
        replyto: 'mario@example.com',
        phone: '+39 333 1234567',
        role: f.roles[1],
      });
    });

    test('error: a 500 shows the error with Retry, and Retry resubmits', async ({ page }) => {
      let calls = 0;
      await page.route(WEB3FORMS, (route) => {
        calls += 1;
        return calls === 1
          ? route.fulfill({ status: 500, json: { success: false } })
          : route.fulfill({ json: { success: true } });
      });
      await fillValid(page);
      const form = formRoot(page);
      await form.getByRole('button', { name: f.send }).click();

      await expect(form.getByRole('alert')).toContainText(f.status.error);
      await form.getByRole('button', { name: f.status.retry }).click();
      await expect(form.getByRole('status')).toHaveText(f.status.success);
      expect(calls).toBe(2);
    });

    test('a filled honeypot shows success without calling Web3Forms', async ({ page }) => {
      let calls = 0;
      await page.route(WEB3FORMS, (route) => {
        calls += 1;
        return route.fulfill({ json: { success: true } });
      });
      await fillValid(page);
      await formRoot(page).locator('input[name="botcheck"]').fill('spam', { force: true });
      await formRoot(page).getByRole('button', { name: f.send }).click();
      await expect(formRoot(page).getByRole('status')).toHaveText(f.status.success);
      expect(calls).toBe(0);
    });
  });
}

test('form causes no horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const { url } of pages) {
    await page.goto(`${url}#contact`);
    const card = formRoot(page);
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    const overflow = await card.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(overflow).toBe(false);
  }
});
