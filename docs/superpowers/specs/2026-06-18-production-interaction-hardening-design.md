# Round 4 Production Interaction Hardening Design

Date: 2026-06-18
Project: RefForge / `灵感锻造台`
Status: Draft for implementation planning

## Purpose

第四轮聚焦生产交互加固，不扩张 RefForge 的产品边界。

前三轮已经完成 Sites 基础、生产 CRUD 验证、详情面板内联编辑、分支收口和本地浏览器 CRUD 复测。第四轮要把这些已经存在的能力变得更稳定、更可观察、更适合重复验证。

## Problem Statement

第三轮复测留下了四类明确问题：

- 生产站仍需要登录态浏览器 CRUD 复测，不能只依赖本地 `localhost`。
- Metadata preview 被触发过，但页面文本没有提供足够稳定、可检测的成功反馈。
- 删除仍依赖原生 `confirm()`，自动化和用户体验都不够稳定。
- 空数据库时会显示 seed references，开发 fallback 和真实持久化状态的边界不够清晰。

第四轮的目标是把这些问题转化为小而准的交互改进。

## Goals

- 让 metadata preview 的成功、失败、空结果状态都有明确文案和可测试状态。
- 用应用内删除确认面板替代原生 `confirm()`。
- 明确 seed fallback 是“本地/加载失败演示状态”，不要让它像真实 D1 数据。
- 补充自动化覆盖，减少后续浏览器测试依赖脆弱文本或原生弹窗。
- 为生产登录态 CRUD 复测保留清晰 QA 清单和记录格式。

## Non-Goals

- 不新增批量导入、公开展示页、媒体上传、团队协作或新 D1 表。
- 不改变来源版权策略。
- 不把 `private` 自动升级为公开状态。
- 不把 seed references 写入 D1。
- 不重做整体布局或视觉系统。

## Recommended Approach

采用小步交互加固方案：

1. 先提炼 UI 状态 helpers 和测试断言。
2. 再实现 metadata preview 状态文案。
3. 再把删除确认从原生 confirm 改为应用内确认面板。
4. 最后澄清 seed fallback 文案并完成本地与生产 QA。

这个方案比直接重构页面更稳，因为 `app/page.tsx` 已经承载了主要工作台逻辑；第四轮只触碰和风险直接相关的行为。

## User Experience Design

### Metadata Preview

用户点击 `Preview metadata` 后，表单附近必须出现明确状态：

- Loading: `Previewing metadata...`
- Success: `Metadata preview ready. Review the fields before saving.`
- Failure: `Metadata preview failed. You can still save this reference manually.`
- Invalid URL: 显示 API 返回的 URL 错误，同时保留表单内容。

成功状态应至少填充或保留以下字段：

- Title
- Site
- Canonical URL
- Preview URL

如果源站没有返回部分字段，仍可显示成功，但文案应避免暗示所有字段都已自动获取。

### Delete Confirmation

删除流程改为应用内确认面板，显示在右侧 detail panel 的 action 区域或作为轻量 dialog。

确认内容：

- 标题：`Delete reference?`
- 正文：`Delete "<reference title>" from this private research desk?`
- 取消按钮：`Cancel`
- 确认按钮：`Delete reference`

交互规则：

- 首次点击 detail panel 的 `Delete reference` 只打开确认面板，不删除。
- 点击 `Cancel` 关闭确认面板。
- 点击确认按钮后才调用 `DELETE /api/references/:id`。
- 删除成功后显示 `Reference deleted.`。
- 删除成功后 selection 移到下一个可见 reference；没有可见 reference 时显示 no-selection 状态。
- 删除失败时确认面板保持打开或返回可重试状态，并显示错误。

### Seed Fallback

当 D1 返回空数组时，当前 UI 会显示 seed references。第四轮不移除 seed fallback，但要让状态更清楚：

- 如果使用 seed references，显示轻量提示：`Showing starter examples. Add a private reference to begin using your own dataset.`
- seed reference 的卡片和详情仍可查看。
- 对 seed reference 的编辑保存不应让用户误以为写入了 D1；现有 seed-local-save 行为需要有明确反馈。
- 当 D1 中存在至少一条真实 reference 时，不显示 seed references。

### Production QA

生产 QA 不改变访问策略。生产 URL 仍保持 Sites `custom` access。

复测步骤：

1. 打开 `https://game-ref-forge.yeep-6613.chatgpt-team.site` 并确认已登录。
2. 新增一条 QA reference。
3. 点击 metadata preview，记录成功或失败反馈。
4. 保存 reference。
5. 刷新并确认仍可见。
6. 编辑 title、category、license/public status 和 notes。
7. 保存后刷新并确认更新仍可见。
8. 删除 reference，通过应用内确认面板确认。
9. 刷新并确认 QA reference 不再出现。

## Data And API Impact

不新增数据库字段。

继续使用现有 API：

- `GET /api/references`
- `POST /api/references`
- `PUT /api/references/:id`
- `DELETE /api/references/:id`
- `POST /api/metadata/preview`

API payload 不变。第四轮只增强前端状态、文案、确认交互和测试覆盖。

## Accessibility

- 删除确认必须可用键盘操作。
- 确认面板内按钮文本必须明确，不只依赖颜色。
- Metadata preview 状态应使用普通文本区域呈现，可被屏幕阅读器读取。
- 删除确认打开时应能通过 `Cancel` 或 `Escape` 取消；如果实现 Escape 风险过大，可先只做明确的 `Cancel`。

## Testing Strategy

自动化测试覆盖：

- Metadata preview success state maps API success to stable feedback.
- Metadata preview failure preserves manual form fields.
- Delete confirmation requires a second confirm action before API delete.
- Cancel delete does not call delete.
- Seed fallback message appears when using starter examples.

浏览器 QA 覆盖：

- 本地 `localhost:3000` 完整 CRUD。
- 生产登录态完整 CRUD。
- 删除确认不再依赖原生 confirm。
- metadata preview 反馈可被页面文本稳定识别。

## Acceptance Criteria

- `npm test` passes.
- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run build` passes.
- 本地 in-app browser CRUD passes.
- 生产登录态 CRUD passes or has a documented access/tooling blocker.
- Metadata preview success/failure feedback is visibly distinct.
- Delete uses app-owned confirmation UI.
- Seed fallback is visibly labeled as starter examples.

## Risks

- `app/page.tsx` 已经较大，第四轮继续修改会增加维护成本。计划中应优先抽取小型 helpers，而不是在页面内堆更多分支。
- Metadata preview 依赖外部站点，成功率不可控；设计必须允许失败但仍保存。
- Sites production access 是 `custom`，生产自动化依赖登录态浏览器。

