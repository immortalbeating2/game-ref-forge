# Task 5 Implementer Report

## Scope

Task 5 implements the isolated data-management state machine and accessible backup/restore dialog. It does not integrate the dialog into `app/page.tsx`, and it does not modify the project ledger.

## Original TDD Evidence

### RED

- `npx vitest run --config vitest.config.ts tests/data-management-state.test.ts` failed because `app/data-management/data-management-state` did not exist.
- `tests/localization.test.ts` failed because `uiCopy().dataManagement` and its English equivalent were undefined.
- `tests/data-management-components.test.ts` failed because `app/data-management/data-management-dialog.tsx` did not exist.

### GREEN

- Implemented the pure reducer, restore guard, localized Backup v1 copy/error mapping, and the standalone dialog.
- Focused Task 5 tests passed after implementation; the original Task 5 handoff baseline completed with 30 test files / 362 tests, typecheck, lint, build, and diff check passing.

## Fix Loop 1

### RED

Added tests for the reported regression and accessibility boundary, then ran:

```powershell
npx vitest run --config vitest.config.ts tests/data-management-state.test.ts tests/data-management-components.test.ts tests/localization.test.ts
```

The run failed as expected:

- `file_selection_started` was unhandled, so replacing a backup could leave the previous parsed backup and preview eligible for restore.
- `getDataManagementDialogLayer` did not exist.
- The dialog source had no inert/`aria-hidden` background isolation or alertdialog-local focus trap.
- `backup_operation_failed` fell through to the restore-specific message in both languages.

### GREEN

- Added `file_selection_started`, which clears file metadata, parsed backup, preview, overwrite acknowledgement, preference selection, issues, and retry eligibility before the next file is read.
- Added explicit `backup_operation_failed` copy: `备份操作未完成，请稍后重试。` / `The backup operation did not complete. Try again shortly.`
- Split the visible background dialog from the discard `alertdialog`. While the confirmation is open, the background is both `inert` and `aria-hidden`; Tab and Escape are handled only by the alertdialog, focus opens on its confirm action, and closing returns to the initiating control when it still exists.
- Focused regression suite passed: 3 files / 24 tests.

## Final Verification

```powershell
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Results: 30 test files / 365 tests passed; typecheck, lint, build, and diff check passed. The only test-runtime notices were Node's existing experimental SQLite warnings.
