# Editing the site content

Everything you can change without touching code lives in this folder. Edit a file, save, and push to `main`. The site rebuilds by itself.

The files are checked when the site is built. If something is wrong (a typo in an email, a missing comma, a misspelled field name), the build stops and the error tells you **which file and which field** to fix, for example:

```
Invalid content in src/content/contacts.json:
  - email: Invalid email address
```

Nothing broken is ever published: the old version stays online until the error is fixed.

A few JSON rules that cover most mistakes:

- Text goes in double quotes: `"hello@simoneguarneri.com"`.
- Every line in a list except the last ends with a comma.
- `null` (no quotes) means "not set".
- `true` / `false` have no quotes.
- Don't rename or delete fields, only change their values.

The page copy (headlines, paragraphs, button labels) is in `it.json` and `en.json`.

---

## `contacts.json`: how people reach you

| Field        | What it is                                                                 | Example                        |
| ------------ | -------------------------------------------------------------------------- | ------------------------------ |
| `email`      | Shown on the page, used by the Email button and as the form's fallback.    | `"hello@simoneguarneri.com"`   |
| `whatsapp`   | Your number with country code. Spaces are fine.                            | `"+39 333 123 4567"`           |
| `piva`       | Partita IVA, 11 digits. Shown in the footer and on the privacy page.       | `"01234567890"`                |
| `doroteaUrl` | Dorotea Housing website (must start with `https://`).                      | `"https://doroteahousing.com"` |
| `quattroUrl` | Quattro Houses website. Leave `null` to hide its "Visit" button.           | `null` or `"https://..."`      |
| `birthDate`  | Used to compute your age in the hero. Format `YYYY-MM-DD`.                 | `"2002-01-21"`                 |

The current email, WhatsApp number and P.IVA are **placeholders**: replace them before launch.

---

## `site.json`: domain and services

| Field             | What it is                                                                                         | Example                       |
| ----------------- | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| `domain`          | Your domain, without `https://`. Leave `null` while the site lives on github.io.                   | `"simoneguarneri.com"`        |
| `basePath`        | The folder the site is served from. Must start and end with `/`.                                   | `"/"` or `"/landing-simone-guarneri/"` |
| `web3formsKey`    | Access key from web3forms.com, so the contact form sends emails. `null` → form opens the visitor's mail app instead. | `"a1b2c3d4-..."`              |
| `goatcounterCode` | Your GoatCounter code (the part before `.goatcounter.com`). `null` → no analytics.                  | `"simoneguarneri"`            |

**When the domain goes live**, change both fields together:

```json
"domain": "simoneguarneri.com",
"basePath": "/",
```

---

## `figures.json`: brand figures

Each brand has **headline** figures (big numbers) and a **KPI row** (revenue, growth, occupancy). Every figure has:

- `value`: what is shown, exactly as written: `"9"`, `"50+"`, `"€410k"`, `"+38%"`, `"81%"`.
- `publish`: `true` shows it, `false` hides it.

**To publish a figure**, set its real value and switch `publish` to `true`:

```json
"occupancy": { "value": "83%", "publish": true }
```

If every figure in a KPI row is `false`, the whole row disappears. The revenue/growth/occupancy numbers in the file now are the design's **sample** values. They are hidden on purpose: only publish real numbers.

Labels ("homes", "occupancy"...) are translated in `it.json` / `en.json`, not here.

---

## `images.json` + `src/assets/images/`: photos

There are four image slots:

| Slot       | Where it appears                       | Placeholder when empty                |
| ---------- | -------------------------------------- | ------------------------------------- |
| `portrait` | The round photo in the hero            | The purple "sg." circle               |
| `dorotea`  | Dorotea Housing card in Selected work  | Striped panel                         |
| `quattro`  | Quattro Houses card in Selected work   | Striped panel                         |
| `og`       | The preview image when the link is shared on WhatsApp, LinkedIn... | (always set) |

**To add a photo:**

1. Put the file in `src/assets/images/` (JPG, PNG, WebP or AVIF; any size, it is resized automatically). Use a simple name with no spaces, e.g. `portrait.jpg`.
2. In `images.json`, set that slot's `file` to the file name:

   ```json
   "portrait": {
     "file": "portrait.jpg",
     "alt": { "it": "Ritratto di Simone Guarneri", "en": "Portrait of Simone Guarneri" }
   }
   ```

3. Update `alt`: a short description of the photo in both languages, read aloud to blind visitors.

Set `file` back to `null` to return to the placeholder. If the file name doesn't match a file in the folder, the build stops and tells you.

For `og`, keep the size at 1200 × 630 pixels.

The `monogram.svg` in that folder is the "sg." mark (portrait placeholder). The favicon is a copy of it in `public/favicon.svg`.
