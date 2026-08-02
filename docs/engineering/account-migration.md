# RefForge 账号与服务器迁移说明

Updated: 2026-08-02

## 迁移执行结果（2026-08-03）

- 新 OpenAI 账号下已创建独立 Sites 项目 `appgprj_6a6f651ceaf08191812f3b7d0ed39cea`；旧账号项目在新账号下不可访问，没有复用或修改。
- `.openai/hosting.json` 已切换到新项目 ID，并继续使用 D1 binding `DB`、无 R2 binding。
- 新账号 Sites source `main` 已精确同步到 `be442557c25a8e6482d099b6a47ae7fd5e6fc64f`。
- Sites version 1 `appgprj_6a6f651ceaf08191812f3b7d0ed39cea~appgver_77a1a83069bc8191bee8392ab4338184` 已通过 owner-only 私有部署发布。
- 新生产入口：`https://game-ref-forge.ping819376526729888.chatgpt.site`。
- 三份 migration 已包含在部署包并生效；部署后 `/api/backup` 回读为 Backup v1 schema `1`、references / syntheses / relations `0 / 0 / 0`。
- `backups/ref-forge-backup-v1-2026-08-02.json` 的恢复预览与正式恢复均成功；备份摘要 `48ab991c3732001bc44ac7162f60a895aff0d4a153117a67573c742e8b0d5338` 与本地 SHA-256 一致，恢复响应为 `restored: true`。
- 恢复后再次导出仍为 `0 / 0 / 0` 且不含设备偏好，符合源站空业务库基线；最近 30 分钟 Worker error 事件为 `0`。
- 新项目保持 `custom` owner-only，非所有者用户、外部访客和群组均为 `0`；自定义域名列表为空。

迁移完成后，旧站仍作为短期回滚入口保留。后续若绑定自定义域名，应以新项目实际返回的 DNS 目标为准。

## 当前迁移基线

- GitHub：`https://github.com/immortalbeating2/game-ref-forge`，公开仓库，默认分支 `main`；本次迁移审计开始时本地与 `origin/main` 同步到 `24a1e494511fe411dae41b115fb9de9bda44bf51`。
- Sites：生产 URL 为 `https://game-ref-forge.yeep-6613.chatgpt.site/`，当前稳定运行时是 Sites version 19，源提交为 `83b31f5b39de5528f95129195782d4b1a389aee6`。
- Hosting：当前项目 ID 为 `appgprj_6a246b271d848191b88b60d1633030c7`，D1 binding 名称为 `DB`，没有 R2 binding。
- 数据库迁移：按顺序使用 `drizzle/0000_melodic_colleen_wing.sql`、`0001_massive_zodiak.sql`、`0002_multi_reference_synthesis.sql`。
- 自定义域名：当前 Sites 项目未配置自定义域名。
- 私有 Backup v1：位于本机 `backups/ref-forge-backup-v1-2026-08-02.json`，已由 Git 忽略；校验计数为 references / syntheses / relations `0 / 0 / 0`，未包含设备偏好。

## 推荐方式：迁移到目标账号的新 Sites 项目

这是风险最低的方案，因为现有应用直接依赖 Worker 运行时、名为 `DB` 的 D1 binding 和 Sites 提供的 owner-only 访问控制，无需改写运行时或数据库适配层。

1. 暂停旧站写入，并保留旧 Sites version 19 作为回滚入口。
2. 让目标账号取得 GitHub 仓库读取权限；若后续不希望代码公开，先建立目标账号可访问的私有镜像，再迁移部署源。
3. 在目标账号新建 Sites 项目，不复用旧账号的 `project_id`。在目标部署分支更新 `.openai/hosting.json` 的新项目 ID，同时保留 `"d1": "DB"` 与 `"r2": null`。
4. 在目标项目创建新的 D1 数据库，并按文件名顺序应用三个 SQL migration。先验证表和索引，再部署应用。
5. 从已验证的 `main` 构建并保存一个未公开的 Sites version，保持 owner-only；完成预览后再部署。
6. 在新站通过“数据管理 → 恢复”导入 Backup v1。先预览，再确认同 ID 覆盖；备份中不存在的目标站记录会保留，因此首次恢复应使用空的新 D1。
7. 验收登录、参考 CRUD、综合稿、Backup v1 再导出、桌面/移动布局和零 console error。新导出的业务计数应与迁移前一致。
8. 验收通过后切换域名；旧站至少保留 24–72 小时，只读观察后再决定是否下线。

本次正式备份为空业务库：生产界面的 Kenney 与 Poly Haven 两张卡是入门示例，不是 D1 记录。恢复后仍看到这两张示例属于正常结果，不应把历史 QA fixture 备份导入新账号。

## 域名建议

优先使用独立子域名，例如 `ref.example.com` 或 `forge.example.com`，不要在新项目创建前预填猜测的 DNS 值。

- Sites 方案：在目标 Sites 项目中先添加自定义域名，再按照平台当时给出的验证记录和 CNAME 目标配置 DNS。目标值由新项目生成，不能复用或臆测旧项目值。
- 根域名方案：仅在 DNS 服务商支持 CNAME flattening、ALIAS 或 ANAME 时使用根域名；否则让根域名跳转到推荐子域名。
- 切换前：将 DNS TTL 临时降低，先验证 HTTPS 证书、owner-only 访问和 Backup v1 恢复，再切换正式流量。
- 回滚：保留旧 `chatgpt.site` URL；若新域名异常，可撤回 DNS 或恢复到旧入口。

## 另一个服务器部署：可行但不推荐作为首次迁移

当前代码直接导入 `cloudflare:workers` 并使用 `drizzle-orm/d1`。普通 VPS 不能只靠 `npm run build && npm run start` 获得等价数据层和 owner-only 认证，至少需要先完成以下工程改造：

- 将 `cloudflare:workers` 的 `env.DB` / D1 适配为目标服务器上的 SQLite 或 PostgreSQL，并补数据库迁移、事务与 Backup v1 回归验证。
- 新增真正的登录与会话层；反向代理上的 Basic Auth 只能作为临时防护，不等价于当前 Sites owner-only 身份边界。
- 配置 Node.js `>=22.13.0`、持久化数据库目录或托管数据库、进程守护、日志轮转、定时备份和恢复演练。
- 使用 Nginx/Caddy 等反向代理终止 HTTPS；子域名通常配置 A/AAAA 到服务器公网地址，若前置 CDN 则按 CDN 给出的 CNAME 配置。
- 在真实域名下重新验收元数据预览、API CRUD、备份恢复、文件下载、移动布局、安全头和来源策略。

因此建议先完成 Sites-to-Sites 迁移；只有在确认必须脱离 Sites/D1 后，再单独立项设计 VPS 运行时与数据层迁移。
