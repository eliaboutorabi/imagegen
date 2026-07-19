# Lattice

> An agentic visual studio for turning ideas into polished infographics.

Lattice is a desktop-first SvelteKit application that helps you research a topic, explore several creative directions, refine production-ready prompts, and generate image batches with OpenAI. The experience is organized like a conversation, with interactive brief controls in the center and a persistent generation wall alongside it.

The application is fully static and bring-your-own-key: there is no Lattice server, account, or hosted database.

## Highlights

- **Streamed creative direction** — turns a topic and brief into distinct, model-written infographic concepts using the Responses API directly from the browser.
- **Live planning and rendering** — fills prompt cards as structured text arrives, then displays progressive image passes while independent image jobs run.
- **Generative UI** — audience, information density, format, canvas size, batch size, quality, and output format are editable without rewriting the brief.
- **Reference images** — upload source material or reuse a previous generation as a new reference.
- **Editable prompts** — inspect the complete prompt and revise it before generating a batch.
- **Generation wall** — review every queued, active, completed, and failed render in a resizable timeline.
- **Persistent canvases** — projects, prompts, references, and generated images survive refreshes in IndexedDB.
- **Light and dark themes** — designed primarily for a spacious desktop workflow.
- **Offline demo mode** — explore the briefing flow without making an API request.

## How it works

1. Describe the infographic you want to create.
2. Choose an information strategy and tune the audience, density, aspect ratio, and canvas size.
3. The creative director optionally researches current facts and streams three structured visual directions.
4. Review the full prompts while first-draft image jobs run independently.
5. Select a direction, edit its prompt, and generate up to ten variations.
6. Download a result, regenerate it, copy its prompt, or add it back as a reference.

## Stack

| Layer         | Technology                                  |
| ------------- | ------------------------------------------- |
| Application   | SvelteKit 2, Svelte 5, TypeScript           |
| Styling       | Tailwind CSS 4 plus component CSS           |
| Agent harness | Direct OpenAI Responses API streaming       |
| Planning      | `gpt-5.6-luna` with compatible fallbacks    |
| Images        | `gpt-image-2`                               |
| Persistence   | `localStorage` and IndexedDB                |
| Validation    | Zod, Vitest, Svelte Check, ESLint, Prettier |
| Output        | Fully prerendered static site               |

## Getting started

### Requirements

- Node.js 20 or newer
- npm
- An OpenAI project API key for live planning, web research, and image generation

### Install and run

```bash
git clone https://github.com/your-name/lattice.git
cd lattice
npm install
npm run dev
```

Open the URL printed by Vite. Lattice starts in demo mode; use **Settings** to connect an OpenAI project key when you want to make live requests.

No `.env` file is required. Do not add an API key to the source tree.

## Available commands

```bash
npm run dev                  # Start the development server
npm run check                # Run Svelte and TypeScript diagnostics
npm run lint                 # Check formatting and lint the project
npm run test:unit -- --run   # Run unit tests once
npm run build                # Build the static site into build/
npm run preview              # Preview the production build
```

## Project structure

```text
src/
├── lib/
│   ├── components/          # Brief, concept, settings, and generation UI
│   └── studio/
│       ├── agent.ts         # Deep Agents planning and research workflow
│       ├── openai.ts        # Parallel image generation and edit requests
│       ├── storage.ts       # Settings and multi-canvas persistence
│       ├── diagnostics.ts   # Browser-visible diagnostic records
│       └── types.ts         # Studio domain types
└── routes/
    ├── +page.svelte         # Conversation and application orchestration
    └── layout.css           # Desktop workspace and theme system
```

## Data and API-key model

Lattice has no application backend. The browser sends requests directly to `api.openai.com` and stores data locally:

- The OpenAI key and user settings are stored in `localStorage`.
- Canvases, prompts, reference images, and generated images are stored in IndexedDB.
- Recent error diagnostics are stored in `localStorage` to make failures inspectable.
- Clearing site data removes locally saved Lattice data.

This architecture is convenient for a personal static tool, but it is not equivalent to a server-mediated production architecture. Anyone who can execute JavaScript on the deployed origin—including a compromised dependency or browser extension—could read a locally stored key. Use a restricted project key with conservative usage limits, never use Lattice on a shared or untrusted device, and rotate a key immediately if it is exposed.

For a public multi-user product, replace persistent browser credentials with a server-side proxy or short-lived scoped credentials before launch.

## Deploying

`npm run build` writes the static application to `build/`. That directory can be deployed to GitHub Pages, Cloudflare Pages, Netlify, Vercel, or any static file host.

Before publishing a deployment:

1. Run `npm run check`, `npm run lint`, `npm run test:unit -- --run`, and `npm run build`.
2. Confirm no secrets or `.env` files are staged.
3. Configure HTTPS and appropriate security headers on the host.
4. Add a privacy notice if other people will use the deployment.
5. Set spending limits and restrictions on any key used for testing.

## Current scope

Lattice is optimized for personal desktop use and infographic ideation. Mobile refinement, a server-backed authentication model, collaborative projects, image editing, collage tools, and layout composition are natural future extensions.

## Contributing

Issues and pull requests are welcome. Keep changes focused, avoid committing generated output or credentials, and run the validation commands before opening a pull request.

## License

No license has been selected yet. Until one is added, the repository is source-available for review but standard copyright restrictions apply.
