# AGENTS.md - game-ref-forge 代理工作指南

## 目的

本文件面向在 `game-ref-forge` 仓库中工作的智能编码代理与后续开发 session。

项目已完成 RefForge / `灵感锻造台` 的文档基线、Sites 基础实现和 Round 1-11 迭代。开发重心是保持私有研究工作台稳定，小步提升人工整理效率，并持续验证真实生产可用性。

优先做小而准、可验证、可追溯的改动。不要跳过设计、来源策略和留痕直接扩张实现范围。

## 项目快照

- 仓库：`game-ref-forge`
- 远程：`https://github.com/immortalbeating2/game-ref-forge.git`
- 产品名：`RefForge`
- 中文名：`灵感锻造台`
- 类型：游戏素材参考研究台 / Game asset reference research desk
- 当前阶段：`Round 12 complete; Round 13 design-ready`
- 目标技术路线：Codex App Sites + vinext/React + Cloudflare Worker-compatible APIs + D1
- 当前产品文档目录：`docs/product/`
- 当前工程文档目录：`docs/engineering/`
- 当前留痕文档目录：`docs/progress/`
- 当前代理配置目录：`docs/agents/`

## 规则优先级

1. 用户直接要求
2. 本项目 `AGENTS.md`
3. 已批准的产品文档、工程文档与实现计划
4. 通用默认习惯与辅助技能建议

如用户要求、项目文档和默认习惯冲突，以用户要求和本项目文档为准。

## 交互语言约定

- 面向用户的说明、过程更新、任务描述和项目文档默认使用中文。
- 提交信息使用“中文 + English”。
- 代码、工具命令、第三方 API 名称、官方术语和固定 UI 可保留英文。
- 项目规范优先保证可理解性与一致性，不机械追求所有术语中文化。

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `immortalbeating2/game-ref-forge`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo. Product docs live in `docs/product/`, engineering docs live in `docs/engineering/`, and future ADRs should live in `docs/adr/`. See `docs/agents/domain.md`.

## 工作流：适配 RefForge 的混合版 Superpowers

### 大功能

满足任一条件，按大功能处理：

- 新增或重做 Sites 应用脚手架、路由结构、API 层或 D1 数据层。
- 修改核心产品方向、来源策略、版权边界或公开策略。
- 修改统一数据模型、分类体系或灵感提炼流程。
- 新增或重做主工作台 UI、引用卡片、筛选、详情面板、添加/编辑流程。
- 新增项目级目录规范、测试规范、部署规范或数据迁移规范。
- 任何明显影响后续开发方向的工作。

大功能必须遵循：

1. 设计确认或补写。
2. 实现计划确认或补写。
3. 实现。
4. 验证。
5. 更新留痕文档。

### 小改动

以下工作可按小改动处理：

- 小范围文档修订。
- 小型目录整理。
- 单一配置项调整。
- 单文件 bug 修复。
- 不影响整体架构的辅助性修改。

小改动允许轻量流程，但仍必须：

1. 先写明目标和影响范围。
2. 再实施修改。
3. 做最小必要验证。
4. 更新留痕文档。

### 强制升级为大功能的条件

即使表面看起来是小改动，只要出现以下情况，也必须升级为大功能流程：

- 需求边界不清。
- 会影响多个子系统。
- 需要新建多个核心文件或目录。
- 可能改变产品方向、公开策略或版权边界。
- 现有产品文档、工程文档与实际实现明显冲突。

## 文档留痕是强制要求

所有开发活动都必须留痕。未更新文档的开发不算完成，未记录验证结果的改动不算真正交付。

### 三个留痕文档

本项目必须保留并维护这三个进度留痕入口：

- `docs/progress/status.md`
  - 当前项目状态摘要入口。
  - 需要和 `docs/progress/timeline.md` 以及当日日志一起阅读。

- `docs/progress/timeline.md`
  - 全项目关键事件时间线。
  - 记录项目初始化、分支策略变化、阶段切换、关键提交、部署版本和重要验证结果。

- `docs/progress/YYYY-MM-DD.md`
  - 当日详细开发日志。
  - 每个实际工作日都应有对应日志；当天多次工作可以追加记录。

### 记录要求

每次记录至少写明：

- 做了什么。
- 为什么做。
- 影响了什么。
- 验证结果。
- 风险或遗留问题。
- 下一步建议。

### 文档冲突时的判断顺序

1. 当前代码与可运行结果。
2. 最新的进度文档。
3. 最新的产品与工程文档。
4. 更早的聊天上下文。

如发现设计与实现偏离，先更新文档再继续推进。

## 当前阶段与默认目标

本项目当前为 `Round 12 complete; Round 13 design-ready`。Round 12 已完成可调三栏工作台、折叠恢复、键盘控制、版本化本地偏好和响应式降级，已合并到 `main`、通过最终独立审查与 merged-main 门禁，并以 Sites version 14 完成认证生产站只读布局复测。Round 11 的 reference/synthesis 生产 CRUD 基线保持不变。

当前默认目标：

- Round 13 开始前先完成设计确认和实现计划，不直接扩张代码范围。
- 将 Sites version 14 作为当前稳定生产基线；后续修改继续执行认证生产回归，并保持只读布局测试不写业务数据。
- 以已批准设计和 `docs/superpowers/plans/` 中的逐轮计划推进实现与收口。
- 质量清单到编辑字段的引导补全路径已完成；下一轮功能必须先补设计和计划。
- 继续聚焦私有研究工作台，不做公开展示页和下载站。

第一版产品边界：

- 手动 URL 添加。
- 元数据预览。
- 统一 reference card。
- 来源、作者、授权和 public-safety 状态。
- 资产分类、用途标签、灵感提炼字段。
- 搜索、筛选、编辑、删除。
- D1 中的一张 `references` 表。

Round 11 扩展边界：

- 独立的 `syntheses` 与 `synthesis_references` 两表。
- 2-4 条有序 reference 关联，服务端创建时快照，`schema_version: 1`。
- 显式 stale/refresh、综合稿列表/编辑/归档/删除和单份 Markdown 导出。
- 综合稿不写回 reference，不公开托管第三方媒体，不新增公开路由。

Round 11 最终本地证据：21 个测试文件 / 187 项测试、typecheck、lint、build、migration 2、HTTP API CRUD、内置浏览器 CRUD、1024px 与 390px 布局检查、console error 0、清理残留 0。

Round 12 最终本地证据：23 个测试文件 / 205 项测试、typecheck、lint、build、diff check 和最终独立审查通过；Chrome 完成左右 pointer drag、最小/最大边界、1400px 约束态和刷新持久化，内置浏览器完成键盘、折叠恢复、视图切换及 1600/1280/1024/390px 布局检查，干净 Chrome console error 0。

Round 12 最终外部状态：GitHub 与 Sites runtime source 同步到 `7db349a`；Sites version 14 成功部署。认证生产站完成左右 pointer drag、刷新持久化、键盘调整、详情折叠/刷新/恢复、1280px 与 390px 无横向溢出、console error 0 和最终偏好复位；reference 数量始终为 2，未执行任何 reference/synthesis 写入。后续 `main` 只增加部署与生产 QA 证据文档，不要求重新部署。

Round 11 最终外部状态：Sites version 13 的已部署运行时代码和归档来自 `d7db34a`；GitHub `main` 在其后仅增加部署与生产 QA 证据文档，不包含新的应用、migration 或依赖改动。生产批次 `20260720-164438` 已完成两条 reference 和一份全字段 synthesis 的创建、刷新持久化、编辑、stale/refresh、删除后快照、归档筛选、删除和零残留回读。1280x900 与 390x844 的 document/body 横向溢出均为 0，console error 为 0。生产 Markdown 导出按钮已触发；控制通道仍无法捕获程序化 Blob `download` 事件，文件内容、来源链接、unsaved 标记、无媒体泄漏和安全文件名由自动化测试覆盖，该工具证据边界不阻塞 Round 11 收口。

## 来源与版权边界

RefForge 是参考研究工具，不是素材搬运或下载站。

默认规则：

- 新增记录默认私有。
- 未知授权不公开展示媒体。
- 可公开内容必须有明确来源、作者、授权或人工确认。
- `fair use` 不作为自动公开依据。
- 灵感提炼应提取原则、方法、观察和转化方向，不鼓励复制具体受保护表达。

任何影响来源策略、授权字段、公开状态或媒体托管方式的改动，都必须同步更新 `docs/product/source-policy.md`。

## 目录约定

当前项目目录：

- `docs/product/`：产品定位、来源策略、分类体系。
- `docs/engineering/`：架构、数据模型、实施计划、部署说明。
- `docs/progress/`：状态、时间线、当日日志。
- `docs/agents/`：代理配置、issue tracker、triage label、domain docs。
- `docs/archive/`：历史设计稿归档。

后续实现可逐步增加：

- `src/`：应用源码。
- `migrations/`：D1 schema migrations。
- `tests/`：API、数据层和 UI 行为测试。
- `.openai/`：Sites hosting config。

原则：

- 目录扩展小步前进。
- 没有明确需求时，不提前铺设复杂结构。
- 命名优先服务当前产品和 Sites 实现。

## 验证约定

文档类改动至少验证：

- Git 状态。
- 新增文档路径。
- 关键占位符扫描。

Sites 实现后，交付前至少验证：

- 依赖安装正常。
- 类型检查通过。
- 测试通过。
- 生产构建通过。
- D1 migration 可用。
- CRUD API 可用。
- 桌面与移动布局无明显重叠。

修 bug 时，优先补最小回归测试。未记录验证结果，不应声称“完成”。

## Subagent / Multi-Agent 与 Delegation Log

- 默认由主代理单线推进。
- 只有在任务边界清楚、可隔离或需要独立审查时，才启用 subagent。
- 当存在 2 个以上互不阻塞、写入范围可分离、且已有明确计划的任务时，才启用 multi-agent 并行。
- 主代理始终负责设计确认、任务拆分、结果整合、最终验证和对用户交付。
- 只要使用了重要的 subagent 或 multi-agent 协作，就必须在当日日志 `docs/progress/YYYY-MM-DD.md` 中增加 `Delegation Log`。
- 每条 `Delegation Log` 至少记录：用途、范围、模式、结果、收口。

## 提交约定

- 每次提交围绕一个明确进展点。
- 提交信息使用“中文 + English”。
- 提交前至少确认：
  - 改动已验证。
  - 三个留痕文档已按需要更新。
  - 未提交无关噪音文件。

若只是中途探索但结果未稳定，可暂不提交，但仍需写入当天日志。

## 分支与合并约定

- `main` 承载当前稳定、已验证的主线结果。
- 纯文档基线、小范围整理可直接在 `main` 上处理，但必须在当日日志说明理由。
- 任何会修改应用源码、API、数据层、测试、部署配置，或预期超过一次小提交的工作，都应从最新 `main` 开新分支。
- 新分支默认使用 `codex/` 前缀，例如 `codex/sites-foundation`。
- 阶段型开发、长时间实现、并行验证或需要保留主线现场时，再考虑额外 worktree。
- 重要分支操作必须写入 `docs/progress/timeline.md` 和当日日志。

## Session 接续顺序

新 session 进入项目时，建议按以下顺序读取：

1. `AGENTS.md`
2. `docs/progress/status.md`
3. 最近一篇 `docs/progress/YYYY-MM-DD.md`
4. `docs/progress/timeline.md`
5. 相关 `docs/product/` 与 `docs/engineering/` 文档

不要只凭聊天末尾几句直接进入编码。
