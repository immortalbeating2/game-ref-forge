# Round 5 Localization Design

Date: 2026-06-18

## Goal

Make RefForge / `灵感锻造台` usable as a Chinese-first research desk while keeping an English option for bilingual work.

This round starts the fifth development cycle. It builds on the fourth-round production CRUD baseline and focuses on interface language, option labels, and user-facing feedback.

## User Direction

- Start from the first fifth-round direction: reference quality improvement.
- First practical step: localize the interface.
- Add Chinese and English options.
- Chinese is the default and preferred language.

## Product Principle

Localization should improve daily research quality without changing the data model.

Internal enum values stay stable:

- `asset_category`
- `media_type`
- `license_status`
- `public_status`

Only user-facing labels, helper copy, messages, placeholders, and action text change.

## Scope

In scope:

- Add a language switcher with `中文` and `English`.
- Default language: `中文`.
- Translate primary workspace copy:
  - filters
  - search and add-reference flow
  - card badges
  - detail panel
  - edit form
  - metadata preview states
  - starter examples messaging
  - delete confirmation
  - empty states
- Provide bilingual label mappings for:
  - asset categories
  - media types
  - license statuses
  - public statuses
- Preserve existing CRUD behavior and production-safe defaults.
- Add regression tests for label helpers and interaction copy.

Out of scope:

- D1 schema changes.
- Translating stored user data.
- Browser locale auto-detection.
- Team-level language preferences.
- Public route localization.
- Full i18n framework integration.

## UX Requirements

- Chinese copy should be concise and work-focused.
- English mode should remain equivalent to the current meaning.
- The language switcher should be visible in the sidebar, near the product identity.
- Switching language should not clear filters, form drafts, selection, edit state, or pending delete state.
- Option labels may include Chinese primary text only in Chinese mode. English mode should show English labels.
- Internal values should not leak into visible UI except where established technical terms are clearer.

## Chinese Copy Direction

Use direct product language:

- `添加参考`
- `预览元数据`
- `保存为私有参考`
- `来源链接`
- `授权状态`
- `公开状态`
- `避免复制`
- `转化思路`
- `删除参考`

Avoid:

- Long onboarding explanations.
- Legal overclaims.
- Copy implying assets are downloaded, hosted, or redistributed.

## Acceptance Criteria

- Default UI opens in Chinese.
- User can switch to English and back.
- Existing create, edit, delete, filter, metadata preview, and starter-example flows remain usable.
- Category/status/media/license labels render in the selected language.
- Automated tests cover translation helpers and localized interaction messages.
- `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- Progress docs record the fifth-round branch and localization scope.
