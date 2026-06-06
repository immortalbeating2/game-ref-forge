# Domain Docs

This is a single-context repository.

Agents should read the repo domain in this order:

1. `AGENTS.md`
2. `docs/progress/status.md`
3. Recent daily logs in `docs/progress/`
4. `docs/product/vision.md`
5. `docs/product/source-policy.md`
6. `docs/product/taxonomy.md`
7. `docs/product/frontend-design.md`
8. `docs/engineering/architecture.md`
9. `docs/engineering/data-model.md`
10. `docs/engineering/implementation-plan.md`
11. Relevant ADRs in `docs/adr/` if that directory exists

## Product Domain

RefForge is a game asset reference research desk.

Core domain terms:

- Reference: a saved source link plus metadata, classification, safety status, and inspiration notes.
- Source policy: the rules that govern attribution, license status, public-safety status, and whether media can be displayed.
- Taxonomy: normalized asset categories, media types, creative questions, and extraction layers.
- Inspiration extraction: the process of turning a reference into observations, principles, transformation ideas, and avoid-copying notes.

## Engineering Domain

Target implementation:

- Codex App Sites.
- vinext/React frontend.
- Cloudflare Worker-compatible API routes.
- D1 database binding named `DB`.
- One first-version `references` table.

## ADRs

If future architectural decisions become stable, add ADRs under:

```text
docs/adr/
```

If an implementation proposal contradicts an existing ADR or the active product docs, surface the conflict explicitly before changing code.
