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

## 待完成

- 合并到 `main` 后重跑完整门禁。
- 部署新的 Sites version 后，在认证生产站重复桌面拖拽、键盘、折叠/刷新、1280px/390px 无溢出和 console error 0 检查。
- 生产验证通过后补充 source SHA、Sites version、deployment ID，并清理功能分支和 worktree。
