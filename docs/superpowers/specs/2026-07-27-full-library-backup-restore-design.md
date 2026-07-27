# Round 13 全库备份与受控恢复设计

日期：2026-07-27

状态：已批准，进入实现计划

## 背景

RefForge 已支持 reference 全库 JSON 导出、单条 reference Markdown 和单份 synthesis Markdown。现有全库 JSON 导出来自 Round 8，当时系统只有 `references` 表，因此文件没有格式版本，也不包含 Round 11 后新增的 syntheses、关联顺序和历史快照，不能作为完整恢复文件。

Round 13 将现有单向 reference JSON 导出升级为版本化全库备份与受控恢复。目标是让个人研究数据可以离开当前 Sites/D1 环境后仍保持完整、可检查和可恢复，同时避免把 RefForge 扩张为通用数据迁移工具。

本机只检测到一份旧格式导出 `ref-forge-library-2026-06-29.json`，其中仅有 `seed-kenney-ui` 和 `seed-polyhaven-material` 两条内置示例。它不属于需要保留的个人研究数据，因此 Round 13 不增加旧 reference-only JSON 兼容。

## 已确认决定

- 恢复采用受控模式：备份内新 ID 新增，同 ID 完整覆盖，备份外现有数据保留。
- 研究数据始终进入备份；置顶和工作台布局作为可选设备偏好，导出与恢复均默认关闭。
- 只生成和接受 `RefForge Backup v1`，不兼容无 schema 版本的旧 JSON。
- 采用领域级备份、预览和恢复 API，不在浏览器中逐条调用现有 CRUD。
- 备份使用透明 JSON，不在本轮加入密码加密。
- 生产站使用临时 QA 数据完成真实导出、修改、预览、恢复、回读和清理。

## 目标

- 导出 references、syntheses、synthesis relations、关联顺序和历史快照。
- 使用稳定、严格、版本化且不暴露 D1 内部列名的领域格式。
- 在任何写入前展示新增、覆盖、保留和 relation 数量。
- 同 ID 记录可以从备份恢复，备份之外的当前记录不会被删除。
- 一个恢复批次要么全部成功，要么零写入。
- 恢复前检测备份文件或数据库状态是否自预览后发生变化。
- 可选备份和恢复本设备的置顶 ID 与 Round 12 布局偏好。
- 保持中文优先、英文可切换、桌面和 390px 可用。
- 通过本地自动化、浏览器和认证生产站临时数据验证真实恢复能力。

## 非目标

- 不支持完整替换或清空当前数据库。
- 不支持旧 reference-only JSON、任意第三方 JSON 或字段映射。
- 不支持 CSV、ZIP、SQL dump、媒体二进制或第三方资源副本。
- 不增加密码加密、云端备份计划、自动定时备份或备份历史。
- 不恢复 Cookie、登录信息、Sites 配置、D1 binding 或部署元数据。
- 不新增账户级偏好同步。
- 不修改 reference、synthesis 或 snapshot 的业务含义。
- 不增加 D1 migration 或新的持久化表。

## 方案比较与决定

### 方案 A：浏览器逐条调用现有 CRUD

实现量表面较小，但会产生大量请求，失败时可能只恢复部分记录，也无法可靠保留原始 ID、时间戳、relation ID、顺序和历史快照。

### 方案 B：领域级备份与恢复 API

服务端负责完整导出、严格解析、差异预览和 D1 batch 恢复；浏览器只负责文件选择、显示预览、确认和可选设备偏好。

### 方案 C：直接导出 D1 表行

可以接近数据库 dump，但会把 Drizzle 列名、JSON 字符串和当前表结构写入产品格式，未来 migration 后兼容成本高。

Round 13 采用方案 B。它在不增加 migration 的前提下提供稳定领域格式、集中校验和原子恢复。

## Backup v1 格式

顶层结构固定为：

```json
{
  "format": "ref-forge-backup",
  "schema_version": 1,
  "exported_at": "2026-07-27T00:00:00.000Z",
  "app": {
    "name": "RefForge"
  },
  "data": {
    "references": [],
    "syntheses": [],
    "synthesis_references": []
  },
  "preferences": null
}
```

### References

- 保存 `ReferenceRecord` 的全部领域字段。
- 保留原始 `id`、`created_at` 和 `updated_at`。
- 数组保持顺序，结构化 inspiration entry 保留稳定 ID。
- URL、枚举、评分、数组和文本仍受现有 reference 领域约束。

### Syntheses

- 保存 `SynthesisRecord` 的全部领域字段、状态和时间戳。
- 保留原始 `id`、`created_at` 和 `updated_at`。
- 文本长度和状态仍受现有 synthesis 领域约束。

### Synthesis relations

每条 relation 保存：

- relation `id`。
- `synthesis_id`。
- 可空的 `reference_id`。
- `position`。
- 结构化 snapshot 对象。
- `snapshot_updated_at`。

relation 不直接暴露数据库中的 `snapshot_json` 字符串。导出时解析为结构化对象，恢复时通过严格 snapshot parser 校验后再序列化。

非空 `reference_id` 必须指向同一备份中的 reference。来源已删除时必须为 `reference_id: null`，snapshot 中仍保留历史 `reference_id` 和来源信息。

### 可选设备偏好

`preferences` 为 `null` 或以下封闭结构：

```json
{
  "pinned_reference_ids": [],
  "workspace_layout": {
    "version": 1,
    "leftWidth": 260,
    "rightWidth": 420,
    "leftCollapsed": false,
    "rightCollapsed": false
  }
}
```

- 导出“包含本设备偏好”默认关闭。
- 恢复“恢复本设备偏好”默认关闭。
- 仅保存当前已有持久化契约：置顶 reference ID 与 Round 12 工作台布局。
- 语言当前不是持久化偏好，本轮不借备份功能新增语言持久化。
- 偏好中的未知 reference ID 在恢复时过滤，不阻塞研究数据恢复。

## 大小与数量边界

- 单个文件最大 `5 MB`。
- 最多 `2,000` 条 reference。
- 最多 `1,000` 份 synthesis。
- 最多 `4,000` 条 synthesis relation。
- 客户端在读取前检查文件大小；服务端再次检查实际请求体大小并作为最终边界。
- 超限返回明确错误，不尝试部分导入。

这些限制高于当前个人项目规模。超过限制时应通过后续设计调整，不在本轮加入分片或多批恢复。

## 模块边界

### `lib/backup.ts`

- 定义 Backup v1、偏好、relation 和差异摘要类型。
- 严格解析未知 JSON，不接受类型断言直接进入数据库。
- 执行封闭 key、版本、大小、数量、ID、时间戳和领域字段校验。
- 生成稳定的规范化表示和 SHA-256 backup digest。
- 生成安全文件名。

### `lib/backup-db.ts`

- 从 references、syntheses 和 synthesis relations 生成完整领域备份。
- 读取当前库并计算 state digest。
- 计算新增、覆盖、保留和 relation 统计。
- 将受控恢复编译为使用 JSON1 的有界 D1 prepared-statement batch。
- 保留领域 ID、时间戳、relation 顺序和 snapshot。

### `db/index.ts`

- 保留现有 `getDb()` Drizzle 读取路径。
- 新增聚焦的 D1 binding getter，仅供需要原生 `prepare().bind()` 与 `batch()` 的备份恢复写入使用。
- 不把 binding 或凭据暴露给浏览器。

### API routes

- `GET /api/backup`：返回不含设备偏好的完整研究数据 Backup v1。
- `POST /api/backup/preview`：接收 Backup v1，严格校验并返回差异、`backup_digest` 和 `state_digest`，不写数据库。
- `POST /api/backup/restore`：接收相同备份、两个 digest 和确认标志；重新校验并执行恢复。

设备偏好只存在于浏览器，因此由前端在下载前写入导出的 JSON，并在服务端恢复成功后按用户选择写回 localStorage。服务端 parser 仍验证偏好结构，但不会将其写入 D1。

### 前端组件

- 新建聚焦的数据管理对话框组件。
- `app/page.tsx` 只负责打开对话框、提供当前设备偏好、刷新顶层数据和协调未保存草稿。
- 文件读取、预览状态和恢复结果不混入 reference/synthesis 表单状态。

## 导出流程

1. 用户打开“数据管理”的“备份”标签。
2. 前端读取当前 reference、synthesis 和 relation 统计。
3. 用户可选择“包含本设备偏好”，默认关闭。
4. 前端请求 `GET /api/backup`。
5. 若选择偏好，前端只向返回对象的 `preferences` 写入经过现有 parser 规范化的置顶和布局值。
6. 前端生成 `ref-forge-backup-v1-YYYY-MM-DD.json`。
7. 页面提示透明 JSON 可能包含私有来源与研究笔记。

现有单条 reference Markdown 和单份 synthesis Markdown 保持不变。旧“导出 JSON”入口由“数据管理”替代，不继续生成旧格式。

## 预览流程

1. 用户选择一个 `.json` 文件。
2. 客户端检查文件大小并解析 JSON；失败时不发请求。
3. 前端将完整 Backup v1 发送到 `/api/backup/preview`。
4. 服务端执行严格校验并读取当前库。
5. 返回：
   - 文件名、大小、版本和导出时间。
   - reference 新增、覆盖、保留数量。
   - synthesis 新增、覆盖、保留数量。
   - relation 与历史快照数量。
   - 文件是否包含设备偏好。
   - `backup_digest`。
   - `state_digest`。
6. preview 绝不执行 D1 写入。

“保留”指当前数据库存在但备份中不存在的记录。它们不会在恢复时删除。

## 受控恢复语义

- 备份中不存在于当前库的 reference/synthesis ID：新增。
- 备份与当前库相同的 reference/synthesis ID：用备份完整覆盖。
- 当前库存在、备份中不存在的记录：保持不变。
- 对每个备份内 synthesis，恢复时替换该 synthesis 的全部 relation。
- 备份外 synthesis 及其 relation 保持不变。
- relation ID、position、snapshot 和 snapshot timestamp 原样恢复。
- snapshot 不根据当前 reference 重新生成。
- 备份记录保留原始 `created_at` 和 `updated_at`，恢复行为不伪装成一次业务编辑。

恢复 batch 的逻辑顺序：

1. 删除所有备份内 synthesis 当前对应的 relation。
2. upsert 备份 references。
3. upsert 备份 syntheses。
4. 插入备份 relations。

实现不能为每条记录生成一条 SQL。D1 Free 计划每次 Worker 调用最多 50 条查询，且单条查询最多 100 个绑定参数、SQL 文本不超过 100 KB、字符串或 BLOB 不超过 2 MB。恢复写入必须：

- 将三个领域数组规范化后按小于 `1 MB` 的 JSON 块切分。
- 每个块使用一个 bound JSON 参数，通过 SQLite JSON extension 的 `json_each(?)` 与 `json_extract(...)` 批量写入。
- 使用单独一个 JSON ID 数组参数删除导入 syntheses 的旧 relations。
- 在调用 D1 前断言整个恢复 batch 不超过 `40` 条语句，为同一 invocation 的 state 读取保留余量。
- 保证每条 SQL 文本小于 100 KB，单条绑定 JSON 小于 1 MB。

所有 prepared statements 进入同一个原生 D1 `batch()`。D1 将 batch 作为 SQL transaction 顺序执行；任何语句失败时整批回滚，不能返回部分成功。

## 预览新鲜度与并发边界

- preview 对规范化备份计算 `backup_digest`。
- preview 对当前 references、syntheses 和 relations 的稳定领域表示计算 `state_digest`。
- restore 重新计算两个 digest。
- backup digest 变化返回 `409 backup_changed`。
- state digest 变化返回 `409 preview_stale`，要求重新预览。
- 前端在恢复提交期间禁用重复提交、对话框关闭和同页冲突操作。

当前 schema 没有全局数据库 revision，读取 state digest 与提交 D1 batch 之间仍存在极窄的并发窗口。RefForge 是 owner-only 单用户工作台，本轮不为该窗口新增 metadata 表或 migration。实现必须在写入前尽可能临近地复核，并在文档中保留这一风险；未来若引入多人或后台写入，再增加全局 revision/CAS。

## 数据管理界面

主工具栏将“导出 JSON”升级为带数据库图标的“数据管理”按钮，打开独立模态对话框。

### 备份标签

- 显示当前 reference、synthesis 和 relation 数量。
- 提供“包含本设备偏好”复选框，默认关闭。
- 显示透明 JSON 隐私提示。
- 提供“导出完整备份”主操作。

### 恢复标签

- 使用文件选择按钮接受一个 `.json`。
- 文件选择后先显示校验和预览状态，不立即恢复。
- 摘要区分新增、覆盖、保留和 relation 数量。
- 文件包含偏好时显示“恢复本设备偏好”，默认关闭。
- 覆盖数量大于 0 时，用户必须勾选确认覆盖，恢复按钮才可用。
- 恢复完成后显示研究数据结果与设备偏好结果。
- 不渲染完整文件内容，只显示安全元数据和统计。

### 未保存草稿

- 存在 reference 或 synthesis 草稿时仍可导出。
- 进入最终恢复前必须确认放弃未保存草稿。
- 取消确认不发恢复请求。
- API 失败时现有草稿保持不变。
- API 成功后关闭草稿，重新读取 references/syntheses，并清理已失效选择。

### 可访问性与响应式

- 使用真实 dialog 语义或等效的焦点圈定。
- 打开后焦点进入标题或首个可操作控件。
- Escape 在非 busy 状态关闭并把焦点归还触发按钮。
- busy 状态禁用关闭和重复提交。
- 错误、警告和成功不只依赖颜色。
- 中文与英文文案完整。
- 桌面对话框宽度受控、内容内部滚动。
- 390px 使用全宽纵向布局，底部操作区不遮挡内容，页面级横向溢出为 0。

## 严格校验

- 顶层 `format` 必须等于 `ref-forge-backup`。
- `schema_version` 必须严格等于 `1`。
- 顶层及所有嵌套对象使用封闭 key 集合；未知关键字段拒绝。
- ID 必须为非空、有上限的字符串，并在各自集合内唯一。
- 每份 synthesis 必须包含 `2-4` 条 relation，position 必须从 `0` 开始连续且不重复。
- relation `(synthesis_id, position)` 与非空的 `(synthesis_id, reference_id)` 必须满足现有唯一性；多个已删除来源的 `reference_id: null` 可以共存。
- 非空 relation reference ID 必须存在于备份 references。
- 非空 relation reference ID 必须等于对应 snapshot 的 `reference_id`；空 relation 依靠 snapshot 保留已删除来源的原始 ID。
- relation synthesis ID 必须存在于备份 syntheses。
- snapshot 必须通过现有严格 parser。
- 时间戳必须是合法 ISO-8601 字符串。
- reference 和 synthesis 必须通过现有领域校验及备份记录额外校验。
- 不接受 `NaN`、Infinity、错误布尔值、错误数组成员或原型型对象。

错误响应使用结构化 `code`、`path` 和 `message`。`path` 指向例如 `data.references[2].source_url`，界面只展示有限数量错误并提供总数。

## 错误与恢复结果

- `invalid_json`：文件不是有效 JSON。
- `unsupported_format`：不是 RefForge Backup。
- `unsupported_version`：schema 版本不受支持。
- `backup_too_large`：大小或数量超过上限。
- `validation_failed`：字段或关系不合法。
- `backup_changed`：预览后文件内容发生变化。
- `preview_stale`：预览后数据库状态发生变化。
- `restore_failed`：D1 batch 失败并已回滚。
- `preferences_failed`：研究数据已恢复，但设备偏好写入失败。

研究数据恢复成功与设备偏好恢复结果分开报告。偏好 localStorage 失败不回滚 D1，也不能错误显示为整个恢复失败。

## 测试策略

### 纯函数与格式测试

- 生成和解析完整 Backup v1。
- 规范化表示和 digest 稳定。
- reference、synthesis、relation 和 snapshot round-trip。
- 可选偏好 round-trip 和非法偏好过滤。
- 未知版本、额外 key、重复 ID、悬空关系、损坏 snapshot、非法时间戳和超限拒绝。
- 安全文件名与透明 JSON 内容边界。

### 数据层测试

- 新 ID 新增。
- 同 ID 完整覆盖并保留备份时间戳。
- 备份外记录保留。
- 导入 synthesis 的旧 relation 被替换。
- 备份外 synthesis relation 保持。
- 已删除来源 snapshot 可恢复。
- relation 顺序和 ID 保持。
- backup/state digest 变化被拒绝。
- 注入中途 SQL 失败时数据库零部分变化。
- 使用真实内存 SQLite 执行与生产相同的关键 SQL 契约。

### API 测试

- GET 导出完整数据。
- preview 成功且零写入。
- restore 成功和结构化结果。
- invalid JSON、未知版本、超限和 validation 错误。
- backup changed 与 preview stale 状态码。
- D1 表不可用和 batch 失败错误。

### UI 与浏览器测试

- 数据管理打开、标签切换、焦点归还和 Escape。
- 文件选择、预览 loading/error/success。
- 覆盖确认门禁。
- 未保存 reference/synthesis 草稿确认。
- 恢复成功后数据刷新和选择清理。
- 可选偏好导出与恢复。
- 中文、英文、键盘和 reduced-motion。
- 1600px、1280px 和 390px 无重叠或横向溢出。
- console error 0。

### 工程门禁

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- 独立任务审查与最终审查

## 部署与生产验证

- 设计与计划文档可直接在 `main` 留痕。
- 应用实现从同步后的 `main` 创建 `codex/round-13-backup-restore` 和独立 worktree。
- 本轮不应用 D1 migration。
- 合并后保存并部署新的私有 Sites version。

认证生产站使用唯一 QA 前缀执行：

1. 记录既有非 QA 数据 ID、数量和摘要。
2. 创建 2 条 QA reference。
3. 用两条 QA reference 创建 1 份全字段 synthesis。
4. 设置临时置顶和非默认布局偏好。
5. 导出包含偏好的 Backup v1。
6. 修改 QA reference、synthesis 和偏好。
7. 重新选择备份并验证预览的新增、覆盖、保留和 relation 数量。
8. 从 UI 执行恢复。
9. 刷新后验证字段、时间戳、relation 顺序、snapshot 和设备偏好。
10. 删除 synthesis 和两条 QA reference。
11. 清除临时偏好并恢复原布局。
12. 确认 QA 前缀零残留，既有非 QA 数据未变化，console error 0。

浏览器控制超时时必须重新读取页面和 API 可见状态，不能把“点击已发出”视为操作成功。生产恢复必须经过 UI；API 和自动化证据只能补充，不能替代最终用户路径。

## 验收标准

- 新导出统一为可解析的 RefForge Backup v1。
- 文件完整包含 references、syntheses、relations、顺序和历史 snapshots。
- 用户可以在零写入预览中看清新增、覆盖和保留。
- 同 ID 记录从备份恢复，备份外数据不删除。
- relation 和已删除来源 snapshot 在恢复后保持历史可读性。
- 文件或数据库自预览后变化会阻止恢复。
- 任意 SQL 失败时零部分写入。
- 可选设备偏好默认不导出、不恢复；明确选择后可 round-trip。
- 旧 reference-only JSON 被明确拒绝。
- 透明 JSON 隐私提示可见。
- 中文、英文、桌面、平板和 390px 可用。
- 自动化、构建、本地浏览器和生产临时数据恢复均有留痕。

## 风险与控制

- 大批量 D1 batch：首版通过 5 MB 与记录数量上限控制；超限不分批恢复。
- D1 invocation 限制：使用小于 1 MB 的 JSON1 块和最多 40 条 batch 语句，禁止逐记录查询或逐记录 upsert。
- preview 与 restore 并发窗口：使用全库 state digest、临近写入复核和单用户边界控制；不声称具有多人场景的强 CAS。
- `app/page.tsx` 复杂度：新增聚焦对话框和状态 helper，页面只协调顶层数据刷新与草稿保护。
- 恢复覆盖错误数据：先预览、明确覆盖数量、要求确认且不提供整库删除。
- snapshot 与当前 reference 混淆：relation snapshot 原样恢复，不在恢复时刷新。
- 透明 JSON 泄露：导出前明确提示，不包含媒体、凭据或部署配置；加密延后独立设计。
- 生产测试污染：统一 QA 前缀、每一步状态回读、最终零残留和既有数据指纹复核。
