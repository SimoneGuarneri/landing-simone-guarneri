# simoneguarneri.com

Personal landing page of Simone Guarneri: short-term rentals in Italy and the software that runs them.
Live at **[simoneguarneri.com](https://simoneguarneri.com)**, in Italian (`/`) and English (`/en/`).

## Stack

- [Astro](https://astro.build) + TypeScript, fully static output, a few small scripts for motion and the contact form
- Content in JSON files validated with [zod](https://zod.dev) at build time
- Contact form through [Web3Forms](https://web3forms.com), with a `mailto:` fallback
- Cookieless page counts with [GoatCounter](https://www.goatcounter.com)
- Self-hosted fonts (Bricolage Grotesque, Geist)
- Tests: [Vitest](https://vitest.dev) (unit) and [Playwright](https://playwright.dev) + [axe](https://github.com/dequelabs/axe-core) (end-to-end and accessibility)
- Hosted on GitHub Pages, deployed by GitHub Actions only when every test passes

## Run it

Requires the Node version in `.nvmrc`.

```bash
npm ci
npm run dev        # http://localhost:4321
```

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `npm run check`    | Type-check Astro and TypeScript                           |
| `npm test`         | Unit tests                                                |
| `npm run build`    | Production build into `dist/`                             |
| `npm run test:e2e` | End-to-end and accessibility tests (builds its own copy)  |
| `npm run ci`       | All of the above, as CI runs it                           |

## Edit the content

Everything a non-developer would change lives in [`src/content/`](src/content/): contacts, page copy in both
languages, brand figures, images and site settings. [`src/content/README.md`](src/content/README.md) explains
each file. The build fails with a readable message if a file is invalid.

## Project layout

```
src/
  components/      page sections, contact form, privacy page
  content/         editable JSON content + images guide
  lib/             content loading, i18n, form logic, motion effects
  pages/           routes: / and /en/, privacy pages, robots.txt
tests/
  unit/            Vitest
  e2e/             Playwright + axe
design/            the original design export, kept as the visual reference
docs/adr/          architecture decisions
GLOSSARY.md        domain vocabulary
```

## Motion and accessibility

Animations run in three modes: full (desktop, fine pointer), lite (phones and touch screens) and off
(`prefers-reduced-motion`). With motion off, or without JavaScript, every piece of content is visible.
The accessibility suite runs axe on every page at phone, tablet and desktop widths.

## License

[MIT](LICENSE) for the code. Not covered by the licence: the text, photos and brand names (Dorotea Housing,
Quattro Houses, Casabase, Casadata), and the `design/` folder, which is the original design export kept as a
reference and includes third-party runtime files.
