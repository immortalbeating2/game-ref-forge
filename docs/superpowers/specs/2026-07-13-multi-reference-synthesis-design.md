# Round 11 多参考综合工作流设计

日期：2026-07-13

状态：已完成交互设计确认，等待书面规格审阅

## 背景

Round 1-10 已完成 reference 的采集、来源与授权记录、质量结构、搜索筛选、整理队列和质量引导编辑。当前工作台能够把单条参考整理完整，但用户仍需在多条 reference 之间来回切换，并在外部文档中手工归纳共同原则、关键差异和原创转化方向。

Round 11 聚焦从“整理单条参考”迈向“比较多条参考并形成可执行创作简报”。综合稿是独立、持久化的研究产物，不写回任一 reference，也不依赖 AI 自动生成。

## 目标

- 从现有参考库临时选择 2-4 条 reference，进入独立全宽对比工作区。
- 并列查看来源安全、评分、标签和灵感摘要，同时保留缺失信息警告。
- 通过人工填写的结构化字段形成可执行综合稿。
- 将综合稿作为独立 D1 实体保存，并维护与原 reference 的可追踪关联。
- 使用创建时快照保证 reference 更新或删除后，历史综合稿仍可理解。
- 提供综合稿列表、查看、编辑、删除、状态管理和单份 Markdown 导出。
- 在桌面、平板和 390px 移动视口保持可操作、无页面级横向溢出。

## 非目标

- 不接入 AI、模型调用或自动摘要。
- 不增加项目、文件夹、多人协作、评论或审批。
- 不自动同步 reference 更新到既有综合稿快照。
- 不改造现有全库 JSON 导出，也不增加综合稿导入恢复。
- 不把综合稿写回某条 reference，也不把两种实体塞入同一张表。
- 不改变来源与版权策略，不公开托管第三方媒体。
- 不在 Round 11 建立跨综合稿分析、引用频率统计或知识图谱。

## 已批准方案

采用规范化持久化方案：`syntheses` 主表保存综合稿内容，`synthesis_references` 关联表保存 2-4 条有序 reference 关系和创建时快照。

未采用以下方案：

- 单表加快照 JSON 数组：实现较轻，但后续反查关系、检测过期快照和维护顺序较弱。
- 复用 `references` 表并增加记录类型：会混淆 reference 与综合稿语义，并污染现有筛选、质量检查和 CRUD 契约。

## 产品信息架构

主工作台增加“参考 / 综合稿”顶层视图切换：

- “参考”保留现有研究工作台、筛选、卡片和详情编辑行为。
- “综合稿”显示独立列表，可按状态筛选并按最近更新排序。
- 新建综合稿从参考视图的“开始对比”进入，不在综合稿列表中复制一套 reference 搜索器。
- 对比工作区保留应用导航，但将原中栏和详情栏合并为全宽编辑区域。

Round 11 沿用当前单页应用的状态式工作区切换，不新增公开路由或可分享深链接。刷新未保存的新综合稿会丢失草稿；离开前必须显示未保存确认。

## 核心流程

### 新建综合稿

1. 用户在参考视图点击“开始对比”。
2. reference 卡片进入临时多选状态，卡片点击改为选择或取消选择。
3. 底部固定操作条显示已选数量、取消和“进入对比”。
4. 少于 2 条时禁用进入；达到 4 条后禁用其余未选卡片。
5. 搜索和筛选仍可使用，已选 reference 跨当前筛选结果保留。
6. 用户进入独立对比工作区，应用按选择顺序创建客户端新稿草案。
7. 顶部展示 2-4 张紧凑参考摘要卡；下方显示结构化综合稿表单。
8. 用户填写内容并手动保存。服务端在一次原子写入中创建综合稿、关联和快照。

### 查看与编辑

1. 用户从综合稿列表打开已有记录。
2. 应用读取综合稿主体、按顺序排列的关联以及快照状态。
3. 用户可修改综合稿字段和状态，并通过一个手动保存按钮提交。
4. Round 11 中，保存后的 reference 组合和顺序保持固定；用户可以刷新快照，但不增加、替换、移除或重排关联。需要不同组合时新建综合稿。

### 快照生命周期

- reference 未变化：显示当前快照。
- reference 的 `updated_at` 晚于 `snapshot_updated_at`：显示“来源已更新”，但不自动修改综合稿。
- 用户点击单条“刷新快照”：重新读取当前 reference，并只替换该关联的快照和快照时间。
- reference 被删除：外键置空，关联与快照保留，显示“原记录不可用，仅保留历史快照”。
- 刷新失败：旧快照保持不变，并显示可重试错误。

### 删除与导出

- 删除综合稿前使用应用内确认弹框；确认后主体和关联级联删除。
- Markdown 导出使用当前表单状态生成单个 `.md` 文件。
- 存在未保存修改时允许导出，但界面明确提示导出内容尚未保存。
- Markdown 包含标题、目标资产、状态、参考来源清单、全部结构化字段和导出时间；不嵌入第三方媒体。

## 综合稿字段

| 字段 | 数据键 | 要求 |
| --- | --- | --- |
| 标题 | `title` | 必填，1-160 字符 |
| 目标资产 | `target_asset` | 可选，最多 240 字符 |
| 共同原则 | `shared_principles` | 可选，最多 8000 字符 |
| 关键差异 | `key_differences` | 可选，最多 8000 字符 |
| 原创方向 | `original_direction` | 可选，最多 8000 字符 |
| 避免照搬 | `avoid_copying_notes` | 可选，最多 8000 字符 |
| 设计约束 | `design_constraints` | 可选，最多 8000 字符 |
| 实验计划 | `experiment_plan` | 可选，最多 8000 字符 |
| 下一步行动 | `next_actions` | 可选，最多 8000 字符 |
| 补充笔记 | `additional_notes` | 可选，最多 8000 字符 |
| 状态 | `status` | `draft`、`actionable` 或 `archived` |

新建记录默认状态为 `draft`。切换到 `actionable` 不设置硬性完整度门槛，但界面继续提示空缺的目标资产、原创方向、实验计划和下一步行动。

## 数据模型

### `syntheses`

```sql
CREATE TABLE syntheses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  target_asset TEXT,
  shared_principles TEXT,
  key_differences TEXT,
  original_direction TEXT,
  avoid_copying_notes TEXT,
  design_constraints TEXT,
  experiment_plan TEXT,
  next_actions TEXT,
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

索引覆盖 `status` 和 `updated_at`，服务综合稿列表筛选与最近更新排序。

### `synthesis_references`

```sql
CREATE TABLE synthesis_references (
  id TEXT PRIMARY KEY,
  synthesis_id TEXT NOT NULL,
  reference_id TEXT,
  position INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  snapshot_updated_at TEXT NOT NULL,
  FOREIGN KEY (synthesis_id) REFERENCES syntheses(id) ON DELETE CASCADE,
  FOREIGN KEY (reference_id) REFERENCES references(id) ON DELETE SET NULL,
  UNIQUE (synthesis_id, position),
  UNIQUE (synthesis_id, reference_id)
);
```

`position` 使用 0-3 的连续整数。服务端负责保证每份综合稿存在 2-4 条关联、位置连续且非空 `reference_id` 不重复。reference 删除后，`UNIQUE` 约束允许多条空外键存在。

### 快照结构

`snapshot_json` 使用 `schema_version: 1`，至少包含：

- reference ID 与 reference 的 `updated_at`。
- 标题、来源 URL、canonical URL、站点、作者、媒体类型和资产分类。
- 授权状态、公开状态和质量状态。
- 综合评分、参考价值、可转化性、版权风险和制作就绪度。
- 风格、用途、机制、氛围和视觉语言标签。
- 灵感要点、结构化灵感条目、拆解笔记、转化思路和避免照搬说明。

快照不保存预览媒体二进制内容，也不改变来源公开边界。

## API 契约

### 列表与创建

- `GET /api/syntheses?status=<status>&sort=recent`
  - 返回列表所需的主体摘要、关联数量和更新时间。
  - 未传 `status` 时返回全部状态；首版仅支持 `sort=recent`。
- `POST /api/syntheses`
  - 接收综合稿字段和按顺序排列的 `reference_ids`。
  - 验证标题、字段长度、状态、2-4 条数量和去重。
  - 验证所有 reference 在写入时仍存在。
  - 从服务端读取 reference 生成快照，不信任客户端提交的快照内容。

### 详情、编辑与删除

- `GET /api/syntheses/:id`
  - 返回完整主体和有序关联。
  - 关联派生 `available` 和 `stale`，不把这两个状态持久化。
- `PATCH /api/syntheses/:id`
  - 只更新主体字段和状态，不接受关联集合变化。
  - 更新成功后刷新 `updated_at`。
- `DELETE /api/syntheses/:id`
  - 删除主体并依赖外键级联清理关联。

### 显式刷新快照

- `POST /api/syntheses/:id/references/:relationId/refresh`
  - 校验关联属于目标综合稿且 `reference_id` 仍存在。
  - 从当前 reference 重新生成快照。
  - 原子替换 `snapshot_json` 和 `snapshot_updated_at`，同时更新综合稿 `updated_at`。
  - reference 不可用或写入失败时不改变旧快照。

所有错误使用现有 API 错误响应约定，并为字段验证、记录不存在、reference 失效和持久化失败提供可区分的错误码。

## 模块边界

- 数据类型与校验：定义 synthesis、关联、快照、状态和 API payload 类型。
- 快照模块：只负责从 `ReferenceRecord` 生成版本化快照和判断过期。
- Markdown 模块：纯函数生成可测试的单份综合稿 Markdown。
- 数据访问层：负责两表查询、原子创建、主体更新、快照刷新和删除。
- API routes：负责请求解析、鉴权沿用、错误映射和响应序列化。
- 参考选择 UI：只管理临时选择状态和 2-4 条约束。
- 综合稿列表 UI：管理筛选、排序和 CRUD 入口。
- 对比工作区 UI：管理表单草稿、未保存状态、快照提示、保存和导出。

`app/page.tsx` 已较大。Round 11 应把综合稿数据逻辑和主要界面拆到聚焦模块中，仅在页面层保留顶层视图切换与现有 reference 工作台协调；不做与本轮无关的全面重构。

## 界面设计

### 参考选择模式

- “开始对比”是清晰的命令按钮，不长期显示卡片选择框。
- 进入后，选中卡片显示复选状态和稳定边框。
- 底部操作条使用固定高度，动态计数不得引发布局跳动。
- 取消恢复普通卡片点击和详情查看行为。

### 对比工作区

- 顶部命令区包含返回、标题、状态、保存和 Markdown 导出。
- 参考摘要区按位置并列显示 2-4 张紧凑卡，重点突出可比较字段而非大图。
- 缺失来源、安全、评分、标签或灵感内容时显示分组警告，但不阻止编辑和保存。
- 表单按“方向、对比、边界、执行、记录”五组排列，不使用嵌套卡片。
- 保存有“保存中、已保存、保存失败”状态；失败时保留草稿。

### 综合稿列表

- 每项显示标题、目标资产、状态、reference 数量和更新时间。
- 提供全部、草稿、可执行和已归档状态筛选。
- 默认按最近更新排序。
- 支持打开、归档和删除；删除必须确认。

### 390px 移动布局

- 页面单列，无 document 或 body 横向溢出。
- 参考摘要使用横向滑动与 scroll snap，每张卡保留可读宽度，不压成四个窄栏。
- 表单字段全部单列，长标题、标签和状态允许换行。
- 次要顶部命令收进操作菜单，底部保留不遮挡内容的保存操作。
- 触控目标高度至少约 44px，键盘焦点和错误信息保持可见。

## 状态与异常处理

- 新建、编辑、刷新和删除均使用明确加载状态，防止重复提交。
- 创建时若 reference 在选择后被删除，服务端拒绝写入并返回失效 ID；客户端保留草稿并要求重新选择。
- 保存失败保留全部表单内容和当前工作区。
- 快照刷新失败保留旧快照。
- 综合稿读取失败返回列表并显示可重试反馈，不使用示例数据冒充持久化结果。
- 未保存离开、切换顶层视图或打开其他综合稿时显示确认。
- 单用户场景采用最后写入生效，Round 11 不增加协同版本冲突协议。

## 本地化与无障碍

- 新增综合稿、状态、警告、错误和导出文案全部提供中文与英文版本，中文默认。
- 选择卡、状态筛选、快照刷新、操作菜单和确认弹框支持键盘操作。
- 图标按钮使用现有图标库，并提供 tooltip 与本地化 `aria-label`。
- 状态、过期和失效不能只依赖颜色表达。
- 横向参考卡组提供可感知的滚动位置和键盘到达路径。

## 测试策略

### TDD 单元测试

- synthesis 字段、状态和 2-4 条 reference 校验。
- 快照序列化、版本字段和过期判断。
- reference 删除后的不可用派生状态。
- Markdown 标题、来源列表、结构字段、空字段和未保存标记。
- 中英文新增文案完整性。

### 数据与 API 测试

- 创建综合稿时主体、关联、顺序和快照一次成功。
- 无效数量、重复 ID、缺失 reference 和非法状态被拒绝且不产生半成品。
- 读取、编辑、状态切换和删除可用。
- 删除综合稿级联删除关联。
- 删除 reference 后关联外键置空、快照仍可读取。
- reference 更新后详情返回 `stale: true`，显式刷新后恢复为 `false`。
- 刷新失败不覆盖旧快照。

### UI 与浏览器测试

- 临时选择模式、2-4 条边界、跨筛选保留选择和取消恢复。
- 综合稿创建、刷新持久化、编辑、状态筛选、归档、Markdown 导出和删除。
- reference 更新后的过期提示与显式刷新。
- reference 删除后的历史快照显示。
- 未保存离开确认和 API 失败草稿保留。
- 中文、英文、键盘操作、1440px、1024px 和 390px 布局。

### 工程门禁

- D1 migration 可在空库和已有 references 数据的本地库上应用。
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 迁移、部署与生产验证

- 从最新 `main` 创建 `codex/round-11-multi-reference-synthesis`，应用代码不直接在主线开发。
- migration 只新增两张表和索引，不改写现有 reference 行。
- 本地完成 migration、自动化测试、构建和浏览器 CRUD 后，再应用远程 migration。
- 保存新的 Sites 版本并部署；旧应用版本可以忽略新增表，因此应用回滚不要求破坏性数据库回滚。
- 生产复测使用 QA 前缀的临时 reference 和综合稿：创建 2 条 reference、创建综合稿、刷新确认、编辑并切换状态、导出 Markdown、删除其中 1 条 reference 验证历史快照、删除综合稿和剩余 reference，最后确认无临时数据残留。
- 自动化通道超时时，必须通过重新读取 UI/API 状态确认实际结果；只读 smoke 不能记作完整 CRUD 通过。

## 验收标准

- 用户能从参考视图选择 2-4 条 reference 并进入独立对比工作区。
- 综合稿保存后刷新仍可读取，全部结构化字段和状态保持一致。
- 综合稿与 reference 通过有序关联表连接，快照来自服务端当前记录。
- reference 更新不会静默改变综合稿；过期提示和显式刷新可用。
- reference 删除不会破坏综合稿历史可读性。
- 综合稿列表的查看、编辑、状态筛选、归档和删除可用。
- 单份 Markdown 包含当前综合稿和来源清单，不包含第三方媒体副本。
- 中文、英文、桌面、平板和 390px 移动布局无明显重叠或页面级横向溢出。
- migration、测试、类型检查、lint、构建、本地 CRUD 和生产临时数据清理均有留痕。

## 风险与控制

- D1 外键行为：migration 和 API 测试必须覆盖 `ON DELETE SET NULL` 与 `ON DELETE CASCADE` 的真实结果。
- `app/page.tsx` 复杂度：综合稿模块采用聚焦组件和纯 helper，页面层只协调顶层状态。
- 快照体积增长：首版限制每稿 2-4 条，并只保存研究所需字段，不保存媒体二进制。
- 快照与当前 reference 混淆：界面明确区分历史快照、当前可用和来源已更新。
- 字段较多导致移动端过长：使用语义分组和稳定底部保存，不引入多步向导。
- 生产自动化偶发超时：先完成本地全量门禁，再通过状态回读和最终清理证明生产结果。
