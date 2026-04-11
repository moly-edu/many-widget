# AGENTS.md

This repository is a generic template for iframe-based widgets built with React, TypeScript, and widget-sdk of moly-edu.

## Scope

These instructions apply to all coding agents working in this repository.

## Source of Truth

For full, detailed project instructions, follow:

- [.github/copilot-instructions.md](.github/copilot-instructions.md)

If there is any conflict, prefer `.github/copilot-instructions.md`.

## Required Behavior

- Treat this project as a reusable template, not a domain-specific app.
- Keep implementation schema-driven and host-protocol compatible.
- Avoid hardcoding business-specific assumptions.
- Preserve host-widget protocol contracts (`WIDGET_READY`, `PARAMS_UPDATE`, `SUBMIT`, review mode via `__answer`).
- Keep parameter paths stable where possible.
- Respect generic `difficultySync` semantics if present.

## Core Files

- [src/main.tsx](src/main.tsx)
- [src/definition.ts](src/definition.ts)
- [src/components/WidgetComponent.tsx](src/components/WidgetComponent.tsx)

## Before Finishing Changes

- Ensure `npm run build` passes.
- Ensure widget bootstrap and host param sync still work.
- Ensure submission and review mode still work.
- If difficulty logic changed, validate both directions:
  - difficulty to params
  - params to difficulty
