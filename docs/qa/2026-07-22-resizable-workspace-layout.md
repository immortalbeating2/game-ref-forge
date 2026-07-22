# Round 12 可调工作台布局本地 QA

日期：2026-07-22

## 验收目标

- 工作树：`D:\Desktop\Project\Game\game-ref-forge\.worktrees\round-12-resizable-workspace`
- 分支：`codex/round-12-resizable-workspace`
- 本地命令：`npm run dev -- --port 3012`
- 本地地址：`http://127.0.0.1:3012/`
- 服务证据：vinext dev 成功监听 3012；PowerShell `Invoke-WebRequest` 返回 HTTP 200，响应长度 18518。
- 证据边界：HTTP 200 只证明本地服务可访问，不作为浏览器布局或交互验收证据。

## TDD 与自动化证据

- RED：`npm test -- tests/workspace-layout-components.test.ts` 按预期失败；新增契约首先报告 `useWorkspaceLayout` 尚未接入，原有 2 项测试通过。
- GREEN focused：3 个测试文件、18 项测试通过。
- Full tests：23 个测试文件、197 项测试通过。
- Typecheck：通过。
- Build：通过。
- Diff check：通过，仅有 Git 的 LF/CRLF 工作区提示。
- Lint：未通过。2 个错误均位于 Task 2 文件 `app/workspace/use-workspace-layout.ts`：第 76 行 render 期间更新 ref，第 89 行 effect 内同步 setState。Task 3 禁止修改 helper/hook，因此本任务未越界修复。

## 浏览器验收

按 `browser-use:browser` 的 in-app Browser 流程尝试初始化 `iab` backend。首次初始化失败后重置 Node REPL 并重试，仍在创建 browser runtime 前失败；未获得 tab、DOM snapshot、截图、viewport、交互或 console 日志。

因此以下项目均为 **未验证**，没有用源码检查、HTTP 结果或推测替代浏览器证据：

| 项目 | 结果 | 说明 |
| --- | --- | --- |
| 1600x900 左右 pointer drag 到 min/max，中心宽度 >=560 | 未验证 | Browser runtime 未初始化 |
| Arrow/Shift/Home/End 与双击 reset | 未验证 | Browser runtime 未初始化 |
| 左右 collapse/recovery 保留选中 reference 与 active view | 未验证 | Browser runtime 未初始化 |
| references -> syntheses -> references 保留右侧宽度 | 未验证 | Browser runtime 未初始化 |
| reload 保留宽度/折叠偏好，损坏 storage 安全回退 | 未验证 | Browser runtime 未初始化 |
| 1600x900 document/body 横向溢出 0、外层纵向溢出 0 | 未验证 | Browser runtime 未初始化 |
| 1280x900 无 splitter、重叠和页面级横向溢出 | 未验证 | Browser runtime 未初始化 |
| 1024x768 无 splitter、重叠和页面级横向溢出 | 未验证 | Browser runtime 未初始化 |
| 390x844 无 splitter、重叠和页面级横向溢出 | 未验证 | Browser runtime 未初始化 |
| 中文与英文 label/tooltip 可见 | 未验证 | Browser runtime 未初始化；localization 自动化测试通过不等同于浏览器证据 |
| Console error count = 0 | 未验证 | 未取得 console 日志 |

## 风险与后续

- 浏览器验收需在可正常初始化 in-app Browser 的环境中完整补跑。
- 全量 lint 需由 Task 2 hook 所有者处理上述 2 个错误后重跑；Task 3 允许文件内没有 lint 报错证据。
