# Infographic style previews

These are static, reusable style-picker assets. They were generated once with the built-in image
generation tool on 2026-07-25, then resized to 960 × 640 JPEGs at quality 82 for the application.
The app does not generate these images at runtime.

## Shared prompt

> Create a reusable 3:2 thumbnail for an infographic style picker. Use a full-bleed, flat landscape
> infographic composition that remains clear as a small thumbnail, with no device frame or surrounding
> scene. Use only tiny abstract typographic marks, simple numerals, and short decorative labels. Keep
> it visually simple, crisp, professional, and distinctly art-directed. No logos, watermark,
> photorealistic mockup, hands, desk, or browser chrome.

## Style-specific directions

| Asset | Direction |
| --- | --- |
| `editorial-narrative.jpg` | Magazine hierarchy, oversized serif forms, vermilion accent, cream paper, modular columns, hero statistic, elegant rules, and generous negative space. |
| `swiss-data.jpg` | Strict asymmetric Swiss grid, cobalt blue, warm white and black, grotesk typography, crisp charts, dot plots, and rational comparison modules. |
| `systems-map.jpg` | Mint soft-tech field, violet connected nodes, amber highlights, curved connector paths, layered architecture modules, and a dotted technical grid. |
| `executive-noir.jpg` | Charcoal data-noir dashboard, acid-lime metrics, ultraviolet accents, luminous line charts, compact decision cards, and boardroom-ready contrast. |
| `illustrated-explainer.jpg` | Warm cream, coral and blue, friendly geometric characters, metaphor objects, and a sophisticated three-step teaching sequence. |
| `organic-editorial.jpg` | Sage, clay and parchment, botanical silhouettes, flowing columns, delicate serif forms, hand-drawn data marks, and natural texture. |
| `neo-brutalist.jpg` | Raw off-white canvas, thick black borders, condensed typography, safety yellow and signal red, offset modules, and hard shadows. |
| `isometric-3d.jpg` | Pale lavender field, modular isometric buildings and platforms, precise axonometric perspective, soft shadows, cyan and purple accents. |
| `retro-future.jpg` | Midnight navy, sunset orange and electric cyan, orbital grids, concentric rings, space-age diagrams, restrained glow, and print grain. |
| `paper-cutout.jpg` | Tactile paper layers, soft cast shadows, coral, cobalt, yellow and cream, with a friendly flowing journey and clear numeric callouts. |
| `scientific-atlas.jpg` | Bone-white archival paper, precise specimen drawings, cross-sections, numbered annotations, measurement rules, green and mineral-blue accents. |
| `cartographic.jpg` | Deep teal and warm sand map, contour lines, a highlighted route, proportional markers, geographic callouts, compass, and scale motifs. |
| `monochrome.jpg` | Pure white and black, extreme negative space, one oversized statistic, hairline rules, micro charts, and museum-catalog restraint. |
| `gradient-mesh.jpg` | Indigo, cyan, magenta and peach spectral fields, translucent glass data cards, and flowing ribbons connecting key metrics. |
| `archival-collage.jpg` | Torn paper, halftone documentary fragments, typewritten labels, red grease-pencil annotations, and an intelligent research-wall composition. |
| `whiteboard.jpg` | Warm white canvas, expressive black marker diagrams, cobalt and coral highlights, sketched arrows, sticky notes, and a structured workshop journey. |

When adding a style, generate a new full-resolution 3:2 image with the shared prompt plus one concise
style direction, save a 960 × 640 optimized derivative here, and add its metadata to
`src/lib/studio/styles.ts`.
