# my-widget Project Instructions for Coding Agents

This project is a reusable template for building iframe-based widgets with `@moly-edu/widget-sdk`.
The official README.md of widget-sdk: https://raw.githubusercontent.com/moly-edu/widget-sdk/refs/heads/main/README.md
If you are not sure about something about sdk, you can get the official docs from here!

These instructions are project-level and always apply in this repository.

## Primary Goal

- Treat this repository as a generic widget template, not a domain-specific app.
- Produce reusable, configurable, schema-driven widgets.
- Keep host integration protocol-compatible with widget-sdk.

## Core Principles

- Prefer schema-driven behavior over hardcoded logic.
- Keep naming generic and reusable unless explicitly requested otherwise.
- Avoid assumptions about subject/domain (math, language, science, etc.).
- Preserve backward compatibility for host communication.
- Keep edits focused and minimal.

## Project Architecture

- `src/main.tsx`: widget bootstrap using `createWidget(...)`.
- `src/definition.ts`: widget contract (`parameters`, `deriveDefaults`, `difficultySync`, `answer`).
- `src/components/WidgetComponent.tsx`: widget runtime UI and evaluation logic.
- `src/index.css`: styling entry.

## SDK Capabilities You Must Understand

### 1) Parameter DSL

Supported parameter factories:

- `param.string(defaultValue?)`
- `param.number(defaultValue?)`
- `param.boolean(defaultValue?)`
- `param.color(defaultValue?)`
- `param.image(defaultValue?)`
- `param.select(options, defaultValue?)`

Common modifiers:

- `.label(text)`
- `.description(text)`
- `.required()`
- `.visibleIf(condition)`
- `.random()`
- `.random((utils) => value)`
- `.readOnly()`
- `.hidden()`

Number modifiers:

- `.min(value)`
- `.max(value)`
- `.step(value)`
- `.minFrom(path)`
- `.maxFrom(path)`

Folder/grouping:

- `folder("Title", fields).expanded(...).visibleIf(...)`

### 2) Visibility Conditions

Available condition builders:

- `when(path).equals(value)`
- `when(path).notEquals(value)`
- `when(path).in(values)`
- `when(path).gt(value)`
- `when(path).gte(value)`
- `when(path).lt(value)`
- `when(path).lte(value)`
- `and(...)`
- `or(...)`

### 3) Default Resolution Order

Defaults are resolved in this order:

1. Static defaults from schema.
2. `.random()` rules.
3. `deriveDefaults(defaults, utils)` overrides.

Utilities available:

- `randomInt(min, max)`
- `randomFloat(min, max)`
- `randomChoice(items)`

### 4) Difficulty Sync Metadata

`difficultySync` is host-facing metadata for two-way sync:

- difficulty value can drive parameter presets.
- parameter changes can infer difficulty.

Shape:

- `difficultyPath`
- `rules[]`
- `dimensions[]` with optional `weight`

Level rule variants:

- Number range: `{ min, max, preset? }`
- Boolean match: `{ type: "boolean", equals, preset? }`
- Select bucket: `{ type: "select", in, preset? }`

Guidelines:

- Avoid overlapping buckets where possible.
- Keep rules deterministic.
- Use stable parameter paths.

### 5) React Hooks and Runtime

Use these APIs by default:

- `useWidgetParams<T>()` to read host params.
- `useSubmission<TAnswer>({ evaluate })` for answer state + scoring + submit.
- `useWidgetState` only for legacy compatibility.
- `Speak` for host-managed TTS UI.

Use `WidgetRuntime` advanced APIs only when necessary.

## Host-Widget Protocol Requirements

Widget to host:

- `WIDGET_READY` with payload `{ schema, resolvedDefaults, difficultySync }`
- `SUBMIT` with payload `{ answer, evaluation }`
- `EVENT` for custom events
- `TTS_SYNTHESIZE`
- `TTS_STOP`

Host to widget:

- `PARAMS_UPDATE` with config payload
- optional `__answer` in `PARAMS_UPDATE` to enter review mode
- `TTS_SYNTHESIZE_RESULT`

Rules:

- Never break `WIDGET_READY` contract.
- Preserve review mode behavior (`__answer` means lock answer editing).

## Authoring Rules for `definition.ts`

- Keep parameter schema declarative and host-friendly.
- Use labels/descriptions for host-side configurators.
- Prefer path stability over frequent renames.
- Keep `answer` schema explicit and minimal.
- Add `difficultySync` only if needed, but keep it generic.

## Authoring Rules for `WidgetComponent.tsx`

- Treat params as source of truth.
- Keep evaluation pure and deterministic.
- Respect `isLocked` in review mode.
- Avoid direct host messaging in component logic when hooks already cover it.
- Keep UI generic unless user explicitly asks for domain-specific UX.

## Template Safety Rules

- Do not hardcode business/domain assumptions into core template behavior.
- Do not hardcode specific host URLs in component logic.
- Do not remove dedupe config for React in Vite.
- Do not bypass `npm run build` verification after significant changes.

## Validation Checklist Before Finishing

- `npm run build` passes.
- Type errors are resolved.
- Widget still emits `WIDGET_READY`.
- Params flow from host to widget still works.
- Submission flow still works.
- Review mode still works (`__answer`).
- If difficultySync changed: both directions are validated.

## Response Style for Agent Contributions

When proposing or applying code changes:

- Explain what changed and why.
- Include file paths.
- Mention protocol-impacting changes explicitly.
- Keep suggestions generic for template reuse.
