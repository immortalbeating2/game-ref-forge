# Round 12 可调工作台布局 QA

日期：2026-07-22

## 验收目标

- 工作树：`D:\Desktop\Project\Game\game-ref-forge\.worktrees\round-12-resizable-workspace`
- 分支：`codex/round-12-resizable-workspace`
- 本地命令：`npm run dev -- --port 3012`
- 本地地址：`http://127.0.0.1:3012/`
- 服务证据：vinext dev 成功监听 3012；PowerShell `Invoke-WebRequest` 返回 HTTP 200。
- 范围边界：本轮只改变工作台布局，不改依赖、API、D1、migration、reference/synthesis 模型或生产业务数据。

## TDD 与自动化证据

- Task 1 RED：`lib/workspace-layout.ts` 不存在时 focused test 按预期失败。
- Task 1 GREEN：布局解析、序列化、静态/动态约束、折叠轨道和键盘目标测试通过；非有限宽度回归已补测。
- Task 2 RED/GREEN：hook、ARIA 分隔条和中英文文案契约先失败后通过；审查发现的 effect 时序和 stale-read 风险均已修复并复审通过。
- Task 3 RED/GREEN：页面接线与响应式契约先失败后通过；浏览器发现 1024px 工具栏横向溢出后，新增失败测试并以单列工具栏修复。
- 最终审查修复 RED：1400px 约束态新增 4 项回归后，18 项布局测试中 3 项先失败，分别暴露键盘仍从存储宽度起算、单侧调整未保留另一侧可见宽度的问题。
- Focused：`tests/workspace-layout-components.test.ts`、`tests/workspace-layout.test.ts`、`tests/localization.test.ts` 共 26 项通过。
- Full tests：23 个测试文件、205 项测试通过。
- Typecheck：通过。
- Lint：通过。
- Build：通过。
- Diff check：通过，仅有 Git 的 LF/CRLF 工作区提示。

## 本地浏览器验收

使用内置浏览器完成 DOM、键盘、折叠、视图切换、多视口和截图检查；使用 Chrome 控制通道完成真实 pointer drag。两个浏览器均加载同一工作树的 `http://127.0.0.1:3012/`。

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 1600x900 桌面轨道 | 通过 | 内置浏览器初始五轨为 `260px 8px 904px 8px 420px`；document/body/workspace 均为 `1600x900` 且 client/scroll 尺寸相等，workspace 为 `overflow: hidden` |
| 1400x900 约束桌面 | 通过 | Chrome 建立 `360/464` 约束态后，右侧首次 ArrowLeft 立即变为 `448`，中心 `560 -> 576`；恢复右侧 `464` 后左侧拖至 `220`，右侧保持 `464`，console error 0 |
| 左右 pointer drag | 通过 | Chrome 中左侧 `260 -> 320`、右侧 `420 -> 470`；最小组合 `220/340`，最大组合 `360/640` |
| 中心安全宽度 | 通过 | Chrome `1707px` 视口下左右均为最大值时中心轨道 `691.33px`，不低于 `560px`；与上一行 `1600px` 初始值属于两套明确标注的浏览器证据 |
| 键盘调整与复位 | 通过 | 左侧 Arrow/Shift/Home/End 得到 `292/332/220/360`，双击复位 `260`；右侧覆盖 `420/380/340/640`，双击复位 `420` |
| 左右折叠与恢复 | 通过 | 折叠后面板宽度为 0，恢复轨道可用；选中项保持 `Kenney UI Pack`，刷新后折叠状态仍在 |
| 视图切换 | 通过 | references 在左分隔条外额外包含右侧详情分隔条；syntheses 仅保留左分隔条；切回 references 后宽度和选中项保持 |
| 刷新持久化 | 通过 | pointer 调整到 `320/470` 后刷新，布局稳定后恢复为 `320/470`；损坏存储回退由纯函数自动化测试覆盖 |
| 1280x900 | 通过 | 分隔条和折叠控件隐藏，详情面板下移，document/body 横向溢出为 0 |
| 1024x768 | 通过 | 工具栏在该断点改单列；document/body `clientWidth == scrollWidth == 1009`，分隔条隐藏 |
| 390x844 | 通过 | 单栏 `374.67px`，document/body `clientWidth == scrollWidth == 375`，分隔条和折叠控件隐藏，截图无重叠 |
| 中英文可访问文案 | 通过 | 中文分隔/折叠标签和英文 `Resize/Collapse filters/details panel` 均在真实 DOM 可见 |
| Console errors | 通过 | 全新 Chrome QA 标签页完成拖拽后 error count 为 0 |

## 工具证据边界

- 内置浏览器的坐标拖拽调用会停在 `pointerdown` 状态且不产生移动；点击可释放该状态。相同页面在 Chrome 控制通道中左右拖拽、边界约束和释放均通过，因此判定为内置浏览器 CUA 通道限制，不是产品拖拽故障。
- 浏览器安全约束禁止直接读取或写入 localStorage；刷新持久化通过用户可见布局结果验证，损坏值回退由 `parseWorkspaceLayoutPreferences` 自动化测试验证。
- 本地无生产 D1 binding，页面使用既有入门示例；本轮不执行 reference/synthesis 写入测试。

## 合并与部署

- 功能分支以 fast-forward 合并到 `main`，运行时代码 source SHA 为 `7db349a08d7dfe50e9fe06af7646bfb0ce3cc0fd`。
- 合并后重新执行完整门禁：23 个测试文件 / 205 项测试、typecheck、lint、build 均通过。
- `main` 已推送到 GitHub；后续仅追加部署与生产 QA 文档，不改变 Sites v14 的运行时代码。
- Sites version 14：`appgprj_6a246b271d848191b88b60d1633030c7~appgver_7ee067837bf481919dd71d8d70271c24`。
- Deployment：`appgdep_6a60dcd2f09481919dc981b8bba830ac`，状态 `succeeded`，生产地址为 `https://game-ref-forge.yeep-6613.chatgpt.site`。
- 本轮没有依赖、API、D1、migration 或业务数据变更。

## 生产浏览器验收

在认证生产站执行只读布局回归；未创建、编辑、归档或删除 reference/synthesis。

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 1600px 桌面轨道 | 通过 | 内置浏览器初始五轨为 `260px 8px 904px 8px 420px`；document/body/workspace 的 client/scroll 尺寸一致，workspace 为 `overflow: hidden` |
| 左右 pointer drag | 通过 | Chrome 实际指针拖拽将左侧 `260 -> 320`、右侧 `420 -> 470`，轨道更新为 `320px 8px 901.33px 8px 470px` |
| 刷新持久化 | 通过 | 刷新并等待页面稳定后仍为 `320/470` |
| 折叠、恢复与选中态 | 通过 | 右侧折叠后宽度为 0，刷新后保持折叠；`Kenney UI Pack` 选中态保持，恢复按钮可重新展开 |
| 键盘调整 | 通过 | 右侧在 `470` 时按 ArrowLeft 后立即变为 `454` |
| 1280x900 | 通过 | document/body `clientWidth == scrollWidth == 1265`；分隔条和折叠控件隐藏，详情面板下移 |
| 390x844 | 通过 | document/body `clientWidth == scrollWidth == 375`；单栏约 `374.67px`，工具栏约 `313.33px`，分隔条和折叠控件隐藏 |
| Console errors | 通过 | Chrome 页面 console error 为 0 |
| 数据完整性 | 通过 | 回归前后 reference 数量均为 2；未进行任何生产业务写入 |
| 最终状态 | 通过 | 左右面板均已展开并双击复位到 `260/420`，页面无横向溢出 |

## 生产工具证据边界

- 390px 生产截图捕获在控制通道超时，但同一页面的 DOM 尺寸、控件可见性和横向溢出指标已读取成功；本地 390px 截图也已通过。因此这是截图通道证据缺口，不是布局失败。
- Statsig 遥测请求在浏览器控制通道中间歇超时；页面 console error 仍为 0，逐项操作与状态读取均成功，未影响产品行为判断。
- 内置浏览器生产会话曾重置，最终状态、真实 pointer drag、持久化和多视口指标由 Chrome 控制通道复核。

## 最终结论

Round 12 的可调三栏工作台已完成本地与生产验收。两项控制工具边界均有独立的 DOM、自动化测试或 Chrome 实际交互证据补足，不阻塞本轮收口。
