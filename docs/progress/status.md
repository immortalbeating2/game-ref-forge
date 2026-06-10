# Project Status

Updated: 2026-06-10

## Current Stage

`Round 2 Design / Live usability validation`

The repository has been initialized as `game-ref-forge`, connected to GitHub, and moved from documentation baseline into the first Sites foundation implementation branch.

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
- Initial documentation baseline commit exists: `538d43d`.
- Current implementation branch: `codex/sites-foundation`.
- Sites project has been provisioned:
  - project id: `appgprj_6a246b271d848191b88b60d1633030c7`
  - slug: `game-ref-forge`
- Sites vinext/React starter has been scaffolded.
- `.openai/hosting.json` declares D1 binding `DB` and no R2 binding.
- D1 migration exists for the first-version `references` table.
- CRUD API routes exist for references.
- Metadata preview API exists.
- First-version research desk UI exists with filters, gallery, detail panel, add form, metadata preview, and seed fallback.
- Local validation has passed for tests, typecheck, lint, and production build.
- Sites version 1 has been saved and deployed.
- Production URL: `https://game-ref-forge.yeep-6613.chatgpt-team.site`
- Local GitHub CLI is installed and authenticated for `immortalbeating2`.
- Second-round design spec exists at `docs/superpowers/specs/2026-06-10-live-usability-validation-design.md`.

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

- Sites/plugin behavior may change, so current Sites hosting flow should be checked before saving/deploying a version.
- Metadata preview may fail or be blocked by source websites.
- Public display of third-party media has copyright risk unless ownership or license is clear.
- The taxonomy needs validation with real references before it should be treated as stable.
- D1 persistence still needs live workflow validation with a real saved reference.
- Browser screenshot QA was not completed because the in-app browser tool was unavailable in the Sites foundation run.

## Next Suggested Step

Review the second-round live usability validation spec, then create an implementation plan before changing code.
