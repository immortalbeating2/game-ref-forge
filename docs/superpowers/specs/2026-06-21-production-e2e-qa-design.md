# 第六轮生产自动化复测设计

## 背景

第五轮引用质量结构已经部署到生产站，但生产 CRUD 自动化在写入入口反复受阻：

- 内置浏览器和 Chrome 插件可以读取生产页面与 DOM。
- `+ 添加参考` 可见，但自动化点击会超时并重置控制环境。
- 命令行直接访问生产 API 会被 Sites 登录页拦截，返回 `Sign in required`。
- Windows 层控制因无法确认当前浏览器 URL，被安全策略终止。

因此，继续把生产 CRUD 复测完全绑定到浏览器点击链路，会让每轮发布的验证成本过高。第六轮需要引入受控、可重复、可记录的生产复测能力。

## 目标

建立一个长期可维护的生产 smoke test 基础设施，用于验证：

- `POST /api/references` 可以创建测试 reference。
- `GET /api/references` 刷新读取后能看到测试 reference。
- `PUT /api/references/:id` 可以更新测试 reference。
- `DELETE /api/references/:id` 可以删除测试 reference。
- `POST /api/metadata/preview` 对成功/失败输入都有结构化反馈。

## 非目标

- 不改变 RefForge 的默认私有研究台定位。
- 不让第三方绕过 Sites 登录访问普通产品页面。
- 不把 e2e token 写入仓库。
- 不保留生产测试数据。
- 不把测试入口做成用户可见产品功能。

## 方案

采用“应用内受控 token + 独立复测脚本”的方案。

### 受控 token

- 新增 `x-ref-forge-e2e-token` 请求头。
- token 由环境变量 `REF_FORGE_E2E_TOKEN` 提供。
- token 为空时，e2e token 能力关闭。
- token 错误时返回 `401`，并给出 `e2e token is invalid`。
- token 正确时允许脚本调用当前已有 API。

### 复测脚本

新增 Node 脚本：

```bash
npm run qa:production-crud
```

脚本读取：

- `REF_FORGE_PRODUCTION_URL`
- `REF_FORGE_E2E_TOKEN`

脚本行为：

1. 生成唯一标题，例如 `E2E RefForge 20260621-123456`。
2. 创建带第五轮字段的测试 reference。
3. 读取列表并确认新记录存在。
4. 更新标题、质量状态和制作就绪度。
5. 再次读取并确认更新存在。
6. 调用 metadata preview 成功路径。
7. 调用 metadata preview 失败路径。
8. 删除测试 reference。
9. 再次读取并确认记录消失。
10. 输出 JSON 摘要。

### Sites 访问限制

如果 Sites 登录层在请求到达 Worker 前拦截脚本请求，脚本应明确输出：

```text
Production request was intercepted by the Sites sign-in layer.
```

这不代表应用 API 实现失败，而代表当前 Sites 访问策略尚未允许自动化脚本到达 Worker。

后续可通过 Sites 访问策略、专用验证路径或部署环境设置，让带 e2e token 的请求到达 Worker。脚本和 API 支持会作为长期基础设施保留。

## 安全边界

- 测试 token 只作为 QA 基础设施，不作为用户身份系统。
- token 只保护自动化测试写入路径，不改变默认数据私有策略。
- 测试数据统一以 `E2E RefForge` 前缀创建。
- 脚本在失败时也会尝试清理已创建的测试数据。
- 日志不打印 token。

## 验证标准

本轮本地交付需要通过：

- 单元测试覆盖 token 校验。
- 单元测试覆盖脚本结果分类。
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- 无 token 时运行脚本应给出配置错误。

生产交付标准：

- 设置 `REF_FORGE_E2E_TOKEN` 环境变量。
- Sites 访问策略允许带 token 请求到达 Worker。
- `npm run qa:production-crud` 返回所有步骤 `ok`。
