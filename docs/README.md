# Project Documentation

This directory is the project documentation home for `game-ref-forge`.

The original design discussion was condensed from a Codex handoff and the prior product spec. These docs split that single design direction into stable documents for later implementation work.

## Document Map

### Product

- [vision.md](product/vision.md): product identity, goals, non-goals, and first-version scope.
- [source-policy.md](product/source-policy.md): source handling, copyright boundary, public-safety status, and intake rules.
- [taxonomy.md](product/taxonomy.md): asset categories, creative questions, and inspiration extraction framework.
- [frontend-design.md](product/frontend-design.md): first-version workspace layout, flows, components, states, and responsive rules.

### Engineering

- [architecture.md](engineering/architecture.md): Sites app architecture, frontend layout, API boundaries, and storage approach.
- [data-model.md](engineering/data-model.md): `references` table, enum values, JSON fields, and API payload shape.
- [implementation-plan.md](engineering/implementation-plan.md): phased development checklist for the first implementation pass.
- [deployment.md](engineering/deployment.md): Sites, D1, build, version, deployment, and access notes.

### Progress Trace

- [status.md](progress/status.md): current project status summary.
- [timeline.md](progress/timeline.md): project-wide timeline and branch/worktree events.
- [2026-06-07.md](progress/2026-06-07.md): first daily development log.

These three progress documents are required project traceability documents.

### Agents

- [issue-tracker.md](agents/issue-tracker.md): GitHub issue tracker conventions.
- [triage-labels.md](agents/triage-labels.md): triage label mapping.
- [domain.md](agents/domain.md): domain documentation reading order and domain vocabulary.

### Archive

- [2026-06-06-game-asset-reference-research-desk-design.md](archive/2026-06-06-game-asset-reference-research-desk-design.md): original design spec copied into this project for traceability.

## Current Source Of Truth

Use the split docs above as the active source of truth. The archived spec is historical context.

When a decision changes, update the smallest active document that owns that decision:

- Product scope changes go in `product/vision.md`.
- Copyright, source, and public-display changes go in `product/source-policy.md`.
- Classification changes go in `product/taxonomy.md`.
- API, data, or deployment changes go in the matching `engineering/` document.
