# Round 11 多参考综合工作流 QA

日期：2026-07-13  
分支：`codex/round-11-multi-reference-synthesis`  
本地地址：`http://localhost:57351/`

## 范围

- D1 migration 2 增量应用。
- reference + synthesis 真实 HTTP API CRUD。
- 主工作台 2-4 条临时选择、跨筛选保持和综合稿创建。
- 综合稿刷新持久化、编辑、状态切换、stale、显式 refresh、来源删除后的历史快照、归档和删除。
- 中文/英文、键盘确认、1024px 和 390x844 响应式布局。
- 临时数据清理和浏览器控制台错误检查。

## 本地 D1 Migration

- 将主工作树现有 `.wrangler/state` 复制到隔离 worktree；未修改源状态。
- 源状态包含 `references` 表且为 0 条记录，不包含 Round 11 两张新表。
- 只应用 `drizzle/0002_multi_reference_synthesis.sql`。
- 应用后存在 `_cf_METADATA`、`references`、`syntheses`、`synthesis_references`。
- 应用后计数：references 0、syntheses 0、synthesis_references 0。

## HTTP API CRUD

测试批次：`20260714-020456`

| 操作 | 状态 | 证据 |
| --- | --- | --- |
| POST reference A | 201 | `f39052cf-4c77-4ed5-8614-fb716e391ed7` |
| POST reference B | 201 | `dd1f85df-50e0-45ce-b8bd-99a08e56de4d` |
| POST synthesis | 201 | `a39830a8-035e-43a6-828a-cdabcde03eef` |
| GET draft list | 200 | 新综合稿存在 |
| GET detail | 200 | 2 条按序关系与服务端快照存在 |
| PATCH synthesis | 200 | 状态更新为 `actionable`，文本字段持久化 |
| PUT reference A | 200 | 来源 reference 更新 |
| GET detail | 200 | A 的 `stale=true` |
| POST snapshot refresh | 200 | 显式刷新成功 |
| GET detail | 200 | A 的 `stale=false` |
| DELETE reference B | 200 | 来源删除成功 |
| GET detail | 200 | `available=false` 且历史 snapshot title 保留 |
| DELETE synthesis | 204 | 综合稿删除成功 |
| DELETE reference A | 200 | 剩余来源删除成功 |
| 最终 GET | 200 | 所有 QA 标题均不存在 |

## 内置浏览器 CRUD

测试批次：`20260714-020539`

- 临时 reference A：`8b702910-7589-4ad9-85b6-740bbd30ff14`。
- 临时 reference B：`b0560544-98db-44d3-b25b-f67fff739254`。
- UI 综合稿标题：`Round 11 Browser Synthesis 20260714-020539`；更新后为 `Round 11 Browser Synthesis Updated 20260714-020539`。综合稿 ID 未暴露在 UI DOM 中，删除前以唯一标题和列表状态回读。
- “开始对比”进入临时选择；选择 B 后搜索 `Ref A`，计数保持 `1 / 4`；再选择 A 后进入按钮启用，证明选择跨筛选保持。
- 新建综合稿填写全部十个文本字段，首次保存反馈“综合稿已保存”。
- 页面刷新后从综合稿列表重新打开，标题、十个字段、2 条快照和 `draft` 状态保持。
- 修改标题、下一步行动和状态为 `actionable`；保存后列表与编辑器同步显示更新值。
- dirty 综合稿点击顶部“参考”出现应用内确认；初始焦点位于取消，Escape 关闭并将焦点恢复到顶部“参考”。
- 更新 reference A 后，综合稿明确显示“参考快照已过期”；点击对应卡片“刷新快照”后标题、链接、评分、标签和灵感更新，过期提示消失。
- 删除 reference B 后重新加载综合稿，历史卡片仍显示原 snapshot，并明确标记“来源已不可用；历史快照仍保留”。
- 通过列表操作归档，`archived` 筛选中仍可找到该综合稿。
- 英文切换后列表、字段、状态、快照警告和命令文案均切换为英文。
- 通过应用内删除确认删除综合稿；通过 reference 删除确认删除剩余 reference。
- 删除最后一条持久化 reference 后回到 seed examples；“Start comparison”保持禁用，seed ID 无法进入综合稿。

## Markdown 导出

- 真实按钮可见且可点击，dirty 草稿与 saved 综合稿均不影响页面状态。
- 内置浏览器对程序化 Blob 下载连续两次未产生可捕获的 `download` 事件，因此本轮没有把“浏览器捕获到下载文件”记为通过。
- `tests/synthesis-export.test.ts` 与 Task 5 focused suite 已验证：固定章节顺序、unsaved warning、来源链接、不可用快照、无 `preview_url` 泄漏和安全文件名。
- 剩余风险为浏览器下载事件证据缺口，不阻塞综合稿 CRUD 或 Markdown 生成契约；生产复测应再次尝试真实下载。

## 响应式与可访问性

- 1024px：`clientWidth=1009`、`scrollWidth=1009`、页面级横向溢出 0。
- 390x844：`innerWidth=390`、`clientWidth=375`、`scrollWidth=375`、页面级横向溢出 0。
- 390px 下返回按钮、状态 select、列表筛选 select、保存按钮和 secondary-action summary 高度均为 44px。
- 滚动到底部时最后字段 bottom 与 sticky save bar top 对齐，重叠为约 0px；保存栏未遮挡最后字段。
- 选择操作条宽度为 342.67px，两个按钮均为 44px 高，横向溢出 0，最后一张卡片和按钮无重叠。
- 删除/离开确认均使用应用内 alertdialog；dirty 离开已验证 Escape 和焦点恢复。
- 浏览器控制台 `error` 日志为 0。

## 清理证明

- 最终 `/api/references` 计数：0。
- 最终 `/api/syntheses?sort=recent` 计数：0。
- `Round 11 Local*` 与 `Round 11 Browser*` 标题残留：0。
- 浏览器回到 seed examples，开始对比入口禁用。

## 结论

Round 11 本地 migration、API CRUD、UI CRUD、快照生命周期、双语和响应式主路径通过。唯一非阻塞证据缺口是内置浏览器未捕获 Blob Markdown 下载事件；生成内容、文件名和安全边界已有自动化测试覆盖，生产复测时继续验证真实下载。

## 两轮独立终审补充

- 第一轮按 RED→GREEN 修复 refresh snapshot TOCTOU/CAS、snapshot 全层级闭集校验与稳定 fallback、reference dirty 开始对比确认、创建失败草稿恢复/重新选择、综合稿错误双语化和 refresh editor mutation busy。
- 第二轮按 RED→GREEN 修复 create 初查后、batch 写入前 reference 删除竞态；batch 失败后回查全部所选 IDs，缺失时返回精确 IDs，仍全部存在时继续抛出原持久化错误。
- 第二轮同时要求 inspiration entry `id` 必需且非空；共享 alertdialog 支持 `aria-modal`、初始焦点、Escape、Tab 焦点约束和焦点恢复；refresh loading 仅显示在目标 relation 卡片，editor 其他 mutation 仍全局 busy。
- RED 证据包括：第一轮 snapshot/DB 15 项、页面恢复 4 项与缓存重载 1 项、本地化/busy 5 项预期失败；第二轮 batch requery、entry ID、dialog/relation helper 均先失败；真实 SQLite CAS 首跑因生产条件构造器尚未导出而 1 项失败。
- GREEN 证据：聚焦 6 文件 / 88 测试通过；全量 21 文件 / 187 测试通过；typecheck、lint、build、`git diff --check` 通过。
- 真实内存 SQLite 测试直接执行生产 Drizzle CAS 条件，验证旧 refresh 不覆盖较新 snapshot、事务回滚无半更新、成功事务同步更新 relation snapshot 与 synthesis `updated_at`。未引入新依赖，未修改 migration。
- 本补充仅为本地自动化终审证据，没有重新执行浏览器布局/CRUD，也没有执行 GitHub push、Sites deployment、生产 D1 migration 或生产 CRUD。生产验证仍未完成。
