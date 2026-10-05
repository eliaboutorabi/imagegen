# Infogen

> An agentic visual studio for turning ideas into polished infographics.

Infogen is a desktop-first SvelteKit application that helps you research a topic, explore several creative directions, refine production-ready prompts, and generate image batches with OpenAI. The experience is organized like a conversation, with interactive brief controls in the center and a persistent generation wall alongside it.

The application is fully static and bring-your-own-key: there is no Infogen server, account, or hosted database.

## Highlights

- **A real creative agent** — Deep Agents 1.14.1 runs a tool-driven conversation in the browser, choosing between answering, visual controls, concept drafting, and direct image edits. No mandatory wizard.
- **Parallel creative direction** — independent text-model calls stream distinct prompt cards and start first drafts as each complete prompt arrives.
- **Live planning and rendering** — fills prompt cards as structured text arrives, then displays progressive image passes while independent image jobs run.
- **Generative UI** — audience, information density, format, canvas size, batch size, quality, and output format are editable without rewriting the brief.
- **Reference images** — upload source material or reuse a previous generation as a new reference.
- **Current image models** — choose quality-first GPT Image 2.5 Sunburst, faster GPT Image 2.5 Flare, or GPT Image 2 for an existing workflow.
- **Editable prompts** — inspect the complete prompt and revise it before generating a batch.
- **Generation wall** — review every queued, active, completed, and failed render in a resizable timeline.
- **Persistent canvases and conversations** — projects, chat transcripts, recent complete tool-call turns, prompts, references, and generated images survive refreshes in IndexedDB.
- **Light and dark themes** — designed primarily for a spacious desktop workflow.
- **Offline demo mode** — explore the briefing flow without making an API request.

## How it works

Describe an idea, ask a question, or attach a reference. The creative partner picks an appropriate next step—not a fixed sequence. Broad infographic topics can use the style gallery and optional brief controls; a clear reference edit goes straight to one image by default. You can shortlist multiple styles, inspect and edit complete prompts, generate up to ten images, or reuse any result as a reference.

Image jobs are queued immediately in the wall, with at most two requests running at once across batches and canvases. They can continue while you switch canvases. Stop controls cancel pending work and request cancellation for active work; OpenAI may still bill a request that was already sent. Failed or interrupted jobs are never automatically retried on reload.

## Stack

| Layer         | Technology                                                              |
| ------------- | ----------------------------------------------------------------------- |
| Application   | SvelteKit 2, Svelte 5, TypeScript                                       |
| Styling       | Tailwind CSS 4 plus component CSS                                       |
| Agent harness | Deep Agents 1.14.1 (`deepagents/browser`)                               |
| Planning      | `gpt-6.1-sol` with compatible fallbacks                                 |
| Images        | GPT Image 2.5 Flare by default; Sunburst and GPT Image 2 also available |
| Persistence   | `localStorage` and IndexedDB                                            |
| Validation    | Zod, Vitest, Svelte Check, ESLint, Prettier                             |
| Output        | Fully prerendered static site                                           |

## Getting started

### Requirements

- Node.js 20 or newer
- npm
- An OpenAI project API key for live planning, web research, and image generation

### Install and run

```bash
git clone https://github.com/eliaboutorabi/imagegen.git
cd imagegen
npm install
npm run dev
```

Open the URL printed by Vite. Infogen starts in demo mode; use **Settings** to connect an OpenAI project key when you want to make live requests.

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
│       ├── runtime.ts       # Deep Agents tools, streaming and conversation memory
│       ├── agent.ts         # Independent streamed concept-drafting calls
│       ├── openai.ts        # Bounded image queue and streamed edit requests
│       ├── storage.ts       # Settings and multi-canvas persistence
│       ├── diagnostics.ts   # Browser-visible diagnostic records
│       └── types.ts         # Studio domain types
└── routes/
    ├── +page.svelte         # Conversation and application orchestration
    ├── layout.css           # Viewer, overlays and shared controls
    └── studio.css           # Desktop workspace and theme tokens
```

## Data and API-key model

Infogen has no application backend. The browser sends requests directly to `api.openai.com` and stores data locally:

- The OpenAI key and user settings are stored in `localStorage`.
- Canvases, chat transcripts, the latest 12 complete agent turns (including tool results), prompts, reference images, and generated images are stored in IndexedDB.
- Recent error diagnostics are stored in `localStorage` to make failures inspectable.
- Clearing site data removes locally saved Infogen data.

This architecture is convenient for a personal static tool, but it is not equivalent to a server-mediated production architecture. Anyone who can execute JavaScript on the deployed origin—including a compromised dependency or browser extension—could read a locally stored key. Use a restricted project key with conservative usage limits, never use Infogen on a shared or untrusted device, and rotate a key immediately if it is exposed.

For a public multi-user product, replace persistent browser credentials with a server-side proxy or short-lived scoped credentials before launch.

## Agent design and verification

The agent exposes `show_style_picker`, `show_brief_controls`, `draft_directions`, `generate_images`, `select_direction`, and OpenAI's hosted web search. Filesystem, shell, task delegation, and planning-list tools are excluded through the harness profile. Tool effects are deduplicated within a turn, interactive steps cannot be stacked repeatedly, and a turn is limited to ten image reservations. Model requests have timeouts and cancellation; image requests have no automatic retry.

The harness is lazy-loaded when live conversation starts. Browser compatibility adapters cover the harness's transitive path/pattern dependencies; optional Node filesystem access explicitly throws rather than pretending it is available. Changing the text model is supported in Settings. All LangChain runtime packages are version-pinned with compatible peer dependencies.

`npx playwright test` exercises the actual production browser bundle and Deep Agents loop against mocked OpenAI streams, including reference edits, canvas history, theme switching, and reloads. No paid images are generated by the tests. Live model quality and account/model availability still require testing with your own key.

Upstream dependency advisories should be reviewed before public hosting (`npm audit`). The current Deep Agents release still inherits a `braces`/`micromatch` advisory with no patched upstream release; the affected file/glob tools are not exposed by this app. This restriction does not constitute a blanket security guarantee.

## Deploying

The repository includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`. Every push to `main` runs the Svelte and TypeScript checks, linting, unit tests, and Playwright end-to-end tests before building and deploying the static site. The workflow can also be run manually from the **Actions** tab.

To enable the first deployment, open **Settings → Pages** in the GitHub repository and select **GitHub Actions** as the source. After the workflow succeeds, this repository is published at:

`https://eliaboutorabi.github.io/imagegen/`

The workflow reads the Pages base path from GitHub and passes it to SvelteKit as `BASE_PATH`, so generated scripts, styles, and navigation work from the repository subdirectory. `npm run build` without that variable still produces a root-hosted local build in `build/`.

Before publishing a deployment:

1. Run `npm run check`, `npm run lint`, `npm run test:unit -- --run`, `npx playwright test`, and `npm run build`.
2. Confirm no secrets or `.env` files are staged.
3. Configure HTTPS and appropriate security headers on the host.
4. Add a privacy notice if other people will use the deployment.
5. Set spending limits and restrictions on any key used for testing.

## Current scope

Infogen is optimized for personal desktop use and infographic ideation. Mobile refinement, a server-backed authentication model, collaborative projects, advanced masked editing, collage tools, and layout composition are natural future extensions.

## Contributing

Issues and pull requests are welcome. Keep changes focused, avoid committing generated output or credentials, and run the validation commands before opening a pull request.

## License

No license has been selected yet. Until one is added, the repository is source-available for review but standard copyright restrictions apply.
