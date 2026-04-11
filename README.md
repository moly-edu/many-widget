# Widget Template Guide

This project is a generic template for building iframe-based learning widgets with React, TypeScript, and widget-sdk.

The goal of this README is to stay reusable for any widget domain, not only the current sample implementation.

## What This Template Covers

- A schema-first widget contract in [src/definition.ts](src/definition.ts)
- A React widget UI in [src/components/WidgetComponent.tsx](src/components/WidgetComponent.tsx)
- Widget bootstrap in [src/main.tsx](src/main.tsx)
- Submission and review-mode integration with a host app
- Optional two-way difficulty synchronization metadata (`difficultySync`)

## Tech Stack

- React 18
- TypeScript
- Vite 7
- Tailwind CSS 4
- SDK dependency: `@moly-edu/widget-sdk`

## Project Structure

```text
my-widget/
   index.html
   package.json
   tsconfig.json
   vite.config.ts
   src/
      main.tsx
      definition.ts
      index.css
      components/
         WidgetComponent.tsx
```

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start local development:

```bash
npm run dev
```

3. Build before publishing:

```bash
npm run build
```

## Scripts

- `npm run dev`: start Vite dev server
- `npm run build`: typecheck and production build
- `npm run typecheck`: TypeScript checks only
- `npm run preview`: preview built app

## Generic Workflow

1. `createWidget(...)` mounts your widget.
2. SDK resolves defaults (static + random + deriveDefaults).
3. Widget sends `WIDGET_READY` with schema metadata.
4. Host sends `PARAMS_UPDATE` config.
5. Widget reads params through `useWidgetParams()`.
6. Widget submits answers through `useSubmission()`.
7. Host can re-open submissions using review mode (`__answer`).

## Core Files

### [src/definition.ts](src/definition.ts)

Defines the widget contract:

- `parameters`: configurable fields exposed to host
- `deriveDefaults`: optional default derivation logic
- `difficultySync`: optional host-facing difficulty metadata
- `answer`: submission schema

Design guidance:

- Keep parameters composable and host-agnostic.
- Use `folder` and `visibleIf` to keep host config UIs manageable.
- Use stable parameter paths because hosts may rely on them.

### [src/components/WidgetComponent.tsx](src/components/WidgetComponent.tsx)

Implements runtime behavior:

- reads host params
- renders interaction UI
- evaluates answers
- submits structured results
- handles review mode (`isLocked`)

### [src/main.tsx](src/main.tsx)

Bootstraps widget mounting:

```ts
createWidget({
  definition: widgetDefinition,
  component: WidgetComponent,
});
```

## DifficultySync (Optional, Generic)

Use `difficultySync` when your system needs both:

- difficulty as an input (auto-assignment from host/system)
- difficulty inferred from detailed parameters (reverse mapping)

General shape:

- `difficultyPath`: path to the difficulty field in config
- `rules[]`: scoped difficulty rules (optional `when` conditions)
- `dimensions[]`: weighted dimensions for scoring and presets

Supported level rule shapes:

1. Number range

```ts
easy: { min: 1, max: 10, preset: 6 }
```

2. Boolean match

```ts
hard: { type: "boolean", equals: true, preset: true }
```

3. Select bucket

```ts
hard: { type: "select", in: ["advanced", "expert"], preset: "advanced" }
```

Best practices:

- Keep buckets non-overlapping where possible.
- If a dimension is effectively 2-level, still provide all levels explicitly.
- Prefer deterministic presets for predictable host behavior.

## Host-Widget Protocol Summary

Widget to host:

- `WIDGET_READY` payload `{ schema, resolvedDefaults, difficultySync }`
- `SUBMIT` payload `{ answer, evaluation }`
- `EVENT` payload custom
- `TTS_SYNTHESIZE`
- `TTS_STOP`

Host to widget:

- `PARAMS_UPDATE` (optionally includes `__answer` for review mode)
- `TTS_SYNTHESIZE_RESULT`

## How to Adapt This Template for a New Widget

1. Replace parameter schema in [src/definition.ts](src/definition.ts).
2. Define your answer schema and evaluation logic.
3. Replace UI flow in [src/components/WidgetComponent.tsx](src/components/WidgetComponent.tsx).
4. Keep [src/main.tsx](src/main.tsx) unchanged unless you need custom bootstrap behavior.
5. Add or remove `difficultySync` based on your platform needs.

## Publishing Checklist

1. `npm run typecheck` passes.
2. `npm run build` passes.
3. Host integration works for:
   - initial parameter load
   - submission flow
   - review mode
4. If using `file:` SDK dependency, ensure CI/CD environment supports it or switch to npm package version.

## Troubleshooting

### Widget stays on loading state when opened directly

Expected for iframe widgets without host bridge messages.

### Duplicate React hooks / invalid hook call

Keep Vite dedupe in [vite.config.ts](vite.config.ts):

```ts
resolve: {
   dedupe: ["react", "react-dom"],
}
```

### Host validation timeout (missing `WIDGET_READY`)

- Confirm [src/main.tsx](src/main.tsx) calls `createWidget(...)`.
- Check browser console for runtime errors.

## Related Docs

- SDK docs: https://raw.githubusercontent.com/moly-edu/widget-sdk/refs/heads/main/README.md
