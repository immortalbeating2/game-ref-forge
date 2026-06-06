# Project Status

Updated: 2026-06-07

## Current Stage

`Documentation Baseline / Sites implementation planning`

The repository has been initialized as `game-ref-forge` and connected to GitHub. The current work is setting up project identity, product documentation, engineering documentation, agent guidance, and progress traceability before starting Sites implementation.

## Current Product Direction

RefForge / `灵感锻造台` is a private-first game asset reference research desk.

It helps collect source links from game asset and game design sites, normalize them into reference records, classify them by asset type and creative use, and extract reusable inspiration for original game asset creation.

## Current Implementation Status

- Git repository initialized on `main`.
- Remote configured as `https://github.com/immortalbeating2/game-ref-forge.git`.
- Product docs exist under `docs/product/`.
- Frontend design guidance exists at `docs/product/frontend-design.md`.
- Engineering docs exist under `docs/engineering/`.
- Historical design spec is archived under `docs/archive/`.
- Agent guidance exists at `AGENTS.md`.
- Required progress trace docs exist under `docs/progress/`.
- Sites application code has not been scaffolded yet.

## Active Decisions

- Use Codex App Sites workflow for implementation.
- Use vinext/React starter when implementation begins.
- Use D1 binding `DB` for first-version persistence.
- Do not use R2 in v1.
- Keep frontend and backend APIs in one Sites-compatible Worker app.
- Use one `references` table in v1.
- Do not expose a public route in v1.
- Default new references to private-safe source/public statuses.
- First-version frontend should use the working research desk layout defined in `docs/product/frontend-design.md`.

## Current Risks

- Sites/plugin behavior may change, so current Sites docs should be checked before implementation and deployment.
- Metadata preview may fail or be blocked by source websites.
- Public display of third-party media has copyright risk unless ownership or license is clear.
- The taxonomy needs validation with real references before it should be treated as stable.

## Next Suggested Step

Create an initial commit for the documentation baseline, then start the Sites scaffold only after reviewing `docs/product/frontend-design.md` and `docs/engineering/implementation-plan.md`.
