# Rebuild in Astro instead of shipping the Claude Design runtime

The design was authored in Claude Design, whose export runs on its own runtime (`support.js`, React from a CDN, `{{ }}` templates, client-side EN/IT swap). We rebuild it as a static Astro + TypeScript site instead: real HTML per language for SEO, near-zero JavaScript, and a GitHub Pages deploy. `design/` stays in the repo as the visual source of truth only; nothing in it is served.
