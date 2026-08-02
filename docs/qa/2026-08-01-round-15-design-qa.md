# Round 15 Protected-A 本地设计与交互 QA

日期：2026-08-01 至 2026-08-02

结论：**Task 9 首轮复审的 3 项 Important 与 1 项 Minor 已完成修复，等待 scoped 独立复审。** 本轮重新以 16:9 预览、自然卡高和正文完整可见为准，撤销了被首轮复审否决的固定 `380/440px`、`54%/46%` 与整体裁切方案；同时补齐 seed `2/4` 的 persisted-only 阻断理由、修复真实 diff gate，并更新同视口三联图。本文不把修复者自验写成最终批准。

## 验收范围

- 对比批准目标、Round 14 基线和 Round 15 实现的同高三联图。
- 使用 12 条真实 UI 创建的 QA reference，覆盖 8 个资产分类、完整/不完整评分、稀疏/密集标签、远程预览和失败回退。
- 覆盖参考、对比、综合稿、添加、编辑、质量引导、数据管理、分栏、双语和响应式链路。
- 不修改 API、D1、migration、Backup v1、领域模型、来源策略或生产数据。

## 视觉比较

三联证据：`docs/qa/2026-08-01-round-15-target-comparison.png`

- 尺寸：`4461 x 1120`，依次为批准目标、Round 14 基线、Round 15 实现。
- Round 15 明显恢复了图像主导的分类画面、四列密度、石墨与浅色表面层次、连续检查器和有序对比坞。
- 相比 Round 14，背景材质、卡片图像感、画布构图和检查器连续性均发生了实质变化，不再只是文字和交互重排。
- 保留的受保护差异：目标图的工具栏更接近单行概念构图；当前实现为保持单选筛选、既有动作与中心优先宽度，在部分宽度允许命令动作换行。目标图使用更丰富的摄影素材；当前实现仅使用原创抽象分类纹理和用户提供的远程预览，不引入第三方媒体。

## 自动化门禁

- `npm test`：44 个测试文件 / 463 项测试通过。
- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm run build`：通过。
- `node .agents/skills/impeccable/scripts/detect.mjs --json app`：`[]`。
- `git diff --check 6033f22233a559656ebbc329b858c049e152be43...HEAD`：在修复提交 `defe475a1c2f2bc848c378c8b5aa14673df6773d` 上 exit `0`，无诊断输出。

## QA 期间的红绿修复

1. **seed 示例无法启动对比**
   - 失败证据：默认两条种子参考存在且预览正常，但“开始对比”被禁用。
   - 修复：seed 与 persisted 均允许进入对比探索；只有 persisted 且达到 2 条时才允许交接综合稿。
   - 回归：`tests/synthesis-page-state.test.ts` 先红后绿，focused 12/12。

2. **1480px 紧凑/舒适列数不足**
   - 失败证据：中心轨道 892px，但内部可用网格约 850px，原 `214/282px` 轨道只能得到紧凑 3 列。
   - 修复：将 protected-A 网格下限校正为紧凑 `204px`、舒适 `272px`。
   - 回归：视觉合同先红后绿；真实 1480px 为紧凑 4 列、舒适 3 列。

3. **390px 研究栏控件低于 44px**
   - 失败证据：语言与五个筛选 select 为 39px，“清除筛选”为 40px。
   - 修复：最终 `<=820px` 规则统一设置最小高度 44px。
   - 回归：新增精确合同先红后绿；重建后语言、五个筛选和清除均实测 44px。

4. **390px 搜索命令栏被 flex-wrap 裁切并异常拉高**
   - 失败证据：搜索输入先后实测 172px/149px 高，横向位置被换到第二列或产生巨大空白。
   - 修复：移动命令栏使用 `flex-wrap: nowrap`，并让 toolbar actions、search/sort label 使用 `flex: 0 0 auto`。
   - 回归：新增精确合同先红后绿；重建后搜索输入为 `313 x 44px`，命令栏位于 `x=16..359`，无裁切或横向溢出。

## 多视口测量

| 视口 | 布局证据 | 横向溢出 |
| --- | --- | --- |
| 1600 x 1058 | 左 220 / 中 1012 / 右 352；中心 63.25%；紧凑 4 列约 235px；舒适 3 列约 314px | 0 |
| 1480 x 1058 | 左 220 / 中 892 / 右 352；中心 60.27%；紧凑 4 列约 205px；舒适 3 列约 274px | 0 |
| 1280 x 900 | 两轨响应式；12 卡紧凑 4 列约 243px | 0 |
| 1024 x 768 | 两轨响应式；紧凑 3 列约 242px；详情下置全宽 | 0 |
| 390 x 844 | 单列；卡宽约 343px；研究栏、命令栏、视图切换、置顶和对比坞主控均为 44px | 0 |

内置浏览器视口物理上限为 1480px；1600px 证据由同一 browser-client 绑定的 Chrome 实际窗口补齐。

## 完整交互证据

- `/` 聚焦搜索；搜索结果、六种排序入口、五个单选筛选和清除筛选均正常。
- 紧凑/舒适切换及刷新持久化正常。
- 置顶/取消置顶、添加/取消、普通编辑/取消、质量清单引导到作者字段/取消均正常。
- 数据管理打开/关闭正常；390px 对话框为 `351 x 339px`，完整位于视口内，主操作 44px。
- 评分矩阵 disclosure 可折叠/恢复；完整评分绘制五轴数据多边形；不完整评分显示本地化回退且无数据多边形，权威数字矩阵保留。
- 远程预览成功时覆盖原创分类图；失败 URL 回退到对应分类图，broken image 为 0。
- 左分栏 pointer drag `220 -> 270px`；键盘调整、双击复位、左右收起和恢复均正常，复位后为 `220/352px`。
- 中文/English 控件和文案切换正常。
- 有序对比覆盖 `0/4 -> 4/4`、1-based 标记、坞内顺序、移除再加入、上限后未选卡禁用与 `not-allowed`、折叠、Escape 和取消。
- 390px 对比坞在 2/4 时，toggle、remove、取消和进入综合稿均为 44px；下置布局不遮挡卡片或详情。
- 4 条 persisted reference 交接综合稿成功，保存后参考卡组顺序与对比选择一致；脏草稿离开保护的取消与确认离开均通过。

## Fixture 与清理

- 前缀：`QA-R15-20260802-0206-`
- 通过真实 UI 创建 12 条 reference，覆盖角色、环境、道具、界面/HUD、特效、材质、动画、音频。
- 通过真实 UI 创建 1 份含 4 条有序快照的 synthesis。
- 验收结束后通过真实 UI 删除 synthesis 和全部 12 条 reference。
- UI 搜索回读：`0 条参考`，前缀文本不存在。
- 临时 SQLite 只读回读：references `0`、syntheses `0`、synthesis_references `0`。
- Chrome console error `0`；内置浏览器 console error `0`。

## 历史 Fix round 1：已被 Task 9 首轮复审否决

以下固定卡高与 `54% / 46%` 数据仅为历史审计记录，不再代表当前实现或批准结论。Task 9 首轮独立复审确认该方案把 16:9 预览改成近方形/4:3，并以正文裁切换取图像占比；当前修复已完整撤销这些规则，现状与复测值见后文“Task 9 首轮复审修复”。

Task 8 初次提交后的独立复审指出：卡片虽然已接入原创分类图，但图像可见面积仍不足以证明“图像主体优先”，同时原报告没有留下可逐 ID 复核的 fixture、URL 重试、雷达降级和 detector 命令证据。本修复轮不改变 API、D1、migration、Backup v1、领域模型、筛选或对比状态机，只校正卡片视觉比例、自动化合同和验收留痕。

### 红绿修复

- 红：新增 `tests/workstation-visual-contract.test.ts` 合同，按真实 1480/1600px 紧凑与舒适卡宽计算可见预览比例；旧实现无法给出固定可测轨道，且正文没有裁切边界。
- 绿：紧凑卡固定 `380px`、舒适卡固定 `440px`，`.reference-card__select` 使用 `54% / 46%` 两轨并裁切正文；标题、授权、公开、质量状态和三项评分继续可见，仅收起重复站点、派生质量 chip 与紧凑次要标签。
- 兼容合同：将 `tests/visual-assets.test.ts` 的旧 `max-content 1fr` 断言更新为 `54% / 46%` 图像轨道与 `overflow: hidden`，避免旧 Round 14 实现细节阻止新的已批准目标。

### 四组真实浏览器卡片测量

| 视口与密度 | 卡片 / 预览高度 | 可见预览占比 | 列数 / 必需信息 |
| --- | --- | --- | --- |
| 1480 紧凑 | `378.667 / 204.479px` | `53.9998%` | 4 列；前 8 卡标题 + 3 状态 + 3 评分均可见 |
| 1480 舒适 | `438.667 / 236.875px` | `53.9989%` | 3 列；前 8 卡必需信息均可见 |
| 1600 紧凑 | `378.667 / 204.479px` | `53.9998%` | 4 列；前 8 卡必需信息均可见 |
| 1600 舒适 | `438.667 / 236.875px` | `53.9989%` | 3 列；前 8 卡必需信息均可见 |

四组均为 `broken image = 0`、document 横向溢出 `0`。更新后的三联图仍为 `4461 x 1120`；人工审阅结论是当前实现已明显形成图像主体、信息从属的卡片层级，比初次 Task 8 更接近批准目标，同时没有移除研究台的来源、安全和评分信息。目标图仍具有更高的纯图库密度，这是受保护产品边界下保留的差异。

### Fix fixture ID 清单

前缀：`QA-R15-FIX-20260802-0318-`。12 条记录均由真实 UI 创建；SQLite 只读查询得到 `count = 12`、`duplicates = []`。

| 序号 | 标题 | Reference ID |
| --- | --- | --- |
| 01 | `01-character` | `97a4b983-cb50-4b24-9005-2093e56e5ab8` |
| 02 | `02-environment` | `080ec803-88b7-4eb4-a954-69afe3d53a25` |
| 03 | `03-prop` | `40ae8d89-9810-47d3-85ec-e9fe7af8119c` |
| 04 | `04-ui-hud` | `43c42a30-d8bb-47fa-aa28-6077768b1a6c` |
| 05 | `05-vfx` | `beb8be90-32fe-4d0d-b161-9f7b5f1f952d` |
| 06 | `06-material` | `b407f583-c16a-45e9-aaa2-1da53f19bb0c` |
| 07 | `07-animation` | `6880c51f-341d-4666-9e12-e44ac1cbb20f` |
| 08 | `08-audio` | `f9bf7355-cf15-4863-8062-3687b5eec3b1` |
| 09 | `09-character-sparse` | `e9b852d8-fb04-4aeb-a0fc-b4ee84261909` |
| 10 | `10-environment-dense` | `fd3e9fa3-df33-4ec6-be20-e570f1bf26e1` |
| 11 | `11-prop` | `c797a6d7-0018-4751-b342-5797434ed8f7` |
| 12 | `12-ui` | `2550e0c4-0ba2-43a5-a9d5-385c4f409499` |

综合稿 ID 为 `09d33e25-9c6f-4344-ad33-bda14532b9d5`；引用位置 `0..3` 依次为 `04 / 10 / 03 / 06` 的上述 ID，与真实对比坞顺序一致。

### URL、雷达、响应式与 seed 证据

- 变更有效 URL 重试：`04-ui-hud` 的预览从 `https://placehold.co/640x480/244b45/eef5f2.png?text=QA-R15-FIX-BEFORE` 改为 `https://placehold.co/640x480/365f58/f5fbf8.png?text=QA-R15-FIX-AFTER`；两次均为 `remoteCount = 1`、`naturalWidth = 640`、`broken = 0`，变更后 DOM `src` 精确指向 AFTER。
- 完整雷达 accessible summary：`评分画像, 评分 5, 参考价值 5, 可转化性 5, 制作就绪度 5, 安全性 5`，count `1`。
- 不完整雷达：`09-character-sparse` 的 `.score-radar__data` count `0`；本地化回退 `补全五项评分后可查看画像。` count `1`。
- 1280 / 1024 / 390px 紧凑复测分别为 `4 / 3 / 1` 列，预览占比均 `53.9998%`，必需 7 项信息均可见，横向溢出均为 `0`；390px 添加与进入综合稿按钮高度均为 `44px`，4/4 对比坞宽 `342.667px` 且完整位于视口横向范围。
- persisted fixture 清理后，入口示例恢复为 `2 条参考`：`Kenney UI Pack` 与 `Poly Haven Material Reference`；入口示例对比可选到 `2/4`，但“进入综合稿”继续保持 persisted-only 禁用边界。

### Fix 清理与工具收口

- 综合稿和 12 条 reference 均通过真实 UI 逐条确认删除；随后按 12 个 ID、前缀、syntheses 和 synthesis_references 回读均为 `[]`，UI 前缀搜索结果为 `0`。
- Chrome 开发日志 `tab.dev.logs()` 返回 `[]`；本修复轮使用 Chrome 是因为重新初始化时内置 Browser 不可用，未把 browser-client 的 Statsig 遥测超时误记为应用 console error。
- 视口已 reset，Chrome tabs 已 finalized；57356 的 `workerd 9412 / node 33916 / node 45012` 精确进程树已停止，`RemainingProcesses = 0`、`ListenerCount = 0`。
- detector 实际命令为 `node D:\Desktop\Project\Game\game-ref-forge\.agents\skills\impeccable\scripts\detect.mjs --json app`；cwd 为 `D:\Desktop\Project\Game\game-ref-forge\.worktrees\round-15-protected-a`，exit code `0`，stdout `[]`。detector 只证明规则扫描为空，不代表人工视觉批准；视觉结论来自上述同视口三联图和真实浏览器测量。

## Fix round 2：seed 最终态原始审计值

本轮只在新的空 D1 上启动既有 `dist/server` Worker，并审阅应用完成异步回退后的两条入口示例；没有重建 12 条 fixture，没有修改实现、样式、测试、设计规格、API、D1、migration、Backup v1、领域模型、依赖或来源策略。临时 Worker 为 `http://127.0.0.1:57358/`，浏览器实际视口为 `1707 x 898`、DPR `1.5`，document `scrollWidth/clientWidth = 1707/1707`。

### 两张 seed 卡片的逐项原始值

| 卡片 | 分类 | 实际分类图源 | 远程图 | 预览 rect `width x height` | 标题 | 三个状态 | broken image |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Kenney UI Pack` | `界面/HUD` | `src=/art/reference-ui-hud.svg`；`currentSrc=http://127.0.0.1:57358/art/reference-ui-hud.svg`；natural `267 x 150`；display `block`；opacity `1` | `[]` | `262.66668701171875 x 204.4791717529297` | `Kenney UI Pack`；`readable=true` | `CC0 或公有领域` / `待复核` / `已分析`；三项均 `readable=true` | `0` |
| `Poly Haven Material Reference` | `材质` | `src=/art/reference-material-texture.svg`；`currentSrc=http://127.0.0.1:57358/art/reference-material-texture.svg`；natural `267 x 150`；display `block`；opacity `1` | `[]` | `262.66668701171875 x 204.4791717529297` | `Poly Haven Material Reference`；`readable=true` | `CC0 或公有领域` / `待复核` / `已分析`；三项均 `readable=true` | `0` |

两张卡片的预览宽、高原始值完全相同；分类分别为 `界面/HUD` 与 `材质`，实际加载的本地 SVG 路径也不同，因此不是远程图，也不是两卡复用同一图。页面全部 `<img>` 的 broken-image 总数为 `0`。

### seed 对比边界原始值

- 完成 seed 回退后，`开始对比`：`disabled=false`、`aria-disabled=null`、rect `118 x 40`，证明默认两条示例可以直接进入对比探索。
- 依次选择 `Kenney UI Pack` 与 `Poly Haven Material Reference` 后，对比坞精确显示 `已选择 2 / 4`，序号为 `1`、`2`。
- 同一 `2 / 4` 状态下，`进入综合稿`：`disabled=true`、`aria-disabled=null`、rect `103.33333587646484 x 40`，证明综合稿交接仍只接受已持久化 reference，seed 不会越过 persisted-only 边界。
- 取消对比后入口恢复；`tab.dev.logs()` 原始返回为 `[]`。最终只读 D1 回读为 references `0`、syntheses `0`、synthesis_references `0`，证明本轮没有业务写入。
- 浏览器 tabs 已 finalized；57358 的已验证进程树 `workerd 2480 / node 9276 / node 37080` 已精确停止，`RemainingProcesses=0`、`ListenerCount=0`。

## Task 9 首轮复审修复（2026-08-02）

Task 9 独立复审对 `6033f222..09db202` 判定为 `With fixes`，报告 3 项 Important 与 1 项 Minor：参考卡违反 16:9/自然内容高度合同、规格文件 7 处尾随空格令 diff gate 实际失败、seed `2/4` 缺少 persisted-only 禁用原因，以及 `status.md` 的下一步仍停留在 Round 15 启动前。本修复只处理这四项，不修改 API、D1、migration、Backup v1、领域模型、来源策略、筛选或比较选择状态机。

### TDD 与实现

- 红：受影响的 6 个测试文件 / 58 项中出现 12 个预期失败，覆盖固定卡高、`54% / 46%` 裁切、一行标题、移动卡高，以及 seed-only 阻断理由的 helper、组件、页面接线和中英文文案。
- 绿：预览改为 `width: 100%` 与 `aspect-ratio: 16 / 9`；卡片恢复自然高度，正文不再整体裁切，标题最多两行并允许长词换行；`.reference-card__select` 使用 `auto minmax(0, 1fr)` 保持同排预览上下边界一致。来源、三项安全/质量状态和三项评分继续可见，紧凑态只隐藏可派生的次级标签。
- 额外红绿：真实浏览器首次复测发现短正文会令同排预览上移 `8.53px`，随后增加自然 grid track 对齐合同并以 `align-content: start` 修复；同排预览顶部和底部最终完全一致。
- 比较 availability 新增 `needs-more` / `persisted-only` 两类本地化阻断原因。seed `2/4` 保持综合稿按钮禁用，但坞内持续解释下一步；persisted `2/4` 仍可正常交接。
- 设计规格 7 处尾随空格已移除；状态文档的接续建议改为先完成 Task 9 scoped re-review，再合并与部署。

### 当前卡片几何与可见性

| 视口与密度 | 列数 / 卡宽 | 预览尺寸与比例 | 当前卡高 / 内容证据 |
| --- | --- | --- | --- |
| 1480 紧凑 | 4 列 / `205px` | `203.667 x 114.563px` / `1.77778` | `312.083px`；12/12 标题两行、来源、3 状态、3 评分可见 |
| 1480 舒适 | 3 列 / `274px` | `272.667 x 153.375px` / `1.77778` | `315.344..332.406px`；上述信息与标签均可见 |
| 1600 紧凑 | 4 列 / `235px` | `233.667 x 131.438px` / `1.77778` | `284.75px`；12/12 必需信息可见 |
| 1600 舒适 | 3 列 / `314px` | `312.667 x 175.875px` / `1.77778` | `337.844..354.906px`；必需信息与标签可见 |
| 1280 紧凑 | 4 列 / `243.167px` | 16:9，比例 `1.77778` | 同排预览对齐；document/body 溢出 `0/0` |
| 1024 紧凑 | 3 列 / `242.22px` | 16:9，比例约 `1.77789` | 必需信息可见；document/body 溢出 `0/0` |
| 390 移动 | 1 列 / `342.667px` | 16:9，比例 `1.77778` | 标题、来源、3 状态、3 评分和标签均可见 |

- 1480px 中心轨道仍为 `892 / 1480 = 60.27%`，1600px 为 `1012 / 1600 = 63.25%`；所有桌面组同排预览上下边界一致。
- 390px 相关可见控件均不低于 `44 x 44px`，密度控件按既有合同隐藏；2/4 对比坞与最后一张卡相隔 `16px`，添加表单与首卡相隔约 `66px`，均为文档流布局且不遮挡内容。
- 全部视口 document/body 横向溢出为 `0`，broken image 为 `0`；最终应用 console error 为 `0`。

### seed 阻断理由、fixture 与清理

- 空 D1 回到两条 seed 后可以启动对比；选中两条显示 `已选择 2 / 4`，`进入综合稿` 为 disabled，并持续显示中文 `示例可用于对比探索；保存至少两条参考后才能进入综合稿。`。
- 切换 English 后持续显示 `Examples can be explored in comparison; save at least two references before entering synthesis.`，`Enter synthesis` 同样 disabled。对比坞折叠、展开、取消后入口复位。
- 本轮前缀为 `QA-R15-T9-20260802-`；12 个真实 UI 创建的 reference ID 依次为：`93909b6b-342f-4341-a2ab-5f5e31438c1e`、`c69dfc80-23b1-4bf3-8a83-2519c70ee276`、`2759c9db-6991-47e9-a300-86f9a3a30ccb`、`2ea2b126-e61d-442f-9861-bd298aed3588`、`90cc13ff-f065-459e-865a-481ccccdd876`、`94b092c7-2e5f-482b-82ea-a0bb57fb5107`、`639b4ead-b7ff-4787-8363-60814646f56a`、`8bf421e9-6360-4c67-b05c-10f9b986373b`、`dde48542-5794-4f67-8ffb-7188f0d96642`、`3c709917-f732-426a-aced-b1f42472693e`、`c639596d-6615-4cbc-994e-a7b9beab4312`、`fbc5a90d-acf6-4c28-a234-ca3d13493f03`。
- 12/12 记录均经真实 UI 删除。API 回读 references `0`、prefix `0`；临时 SQLite 只读回读 references/syntheses/synthesis_references 为 `0/0/0`，prefix `0`，上述 12 个 ID 命中 `0`。
- 浏览器视口已 reset，tabs 已 finalized。更新后的三联图仍为 `4461 x 1120`，前两栏保持不变，第三栏替换为当前 1487 x 1058 实现；它展示了更接近批准目标的 16:9 图像墙密度，而非历史近方形高卡。
- QA 完成后 57360 的进程与监听均已自然退出并复核为 `0/0`；已验证绝对路径位于用户 Temp 且叶目录精确匹配后，删除临时 D1 根目录 `refforge-r15-t9-20260802-101521`，删除后不存在。

### 修复后门禁

- focused 红绿：6 个测试文件 / 58 项从 12 项预期失败恢复为全绿；对齐补测 2 个文件 / 21 项通过。
- `npm test`：44 个测试文件 / 463 项通过。
- `npm run typecheck`、`npm run lint`、`npm run build`：通过。
- `node D:\Desktop\Project\Game\game-ref-forge\.agents\skills\impeccable\scripts\detect.mjs --json app`：exit `0`，stdout `[]`。
- `git diff --check`：提交前工作树检查 exit `0`，无输出；提交 `defe475a1c2f2bc848c378c8b5aa14673df6773d` 形成后执行 `git diff --check 6033f22233a559656ebbc329b858c049e152be43...HEAD`，exit `0`，无诊断输出。

## 风险与下一步

- Statsig 遥测网络偶发超时只发生在 browser-client 控制通道，应用 console error 仍为 0，且每次动作均以页面状态重新确认；不判为产品缺陷。
- 本文包含 Task 8 本地综合 QA 与 Task 9 首轮 findings 的修复者验收，不替代 scoped 独立复审，也不代表已合并、部署或完成生产 QA。
- 下一步对上述 3 项 Important 与 1 项 Minor 执行 scoped 独立复审；只有复审通过后才合并、执行 Sites 精确源部署并开展生产只读/受控写入验收。
