# Round 13 全库备份与受控恢复 QA

日期：2026-07-27

## 验收目标

- 工作树：`D:\Desktop\Project\Game\game-ref-forge\.worktrees\round-13-backup-restore`
- 分支：`codex/round-13-backup-restore`
- 本地地址：`http://127.0.0.1:3013/`
- 范围：Backup v1 全库导出、零写入预览、保留式原子恢复、可选设备偏好、工作台接线和中英文响应式交互。
- 数据边界：不新增 migration；恢复只覆盖备份中同 ID 数据，保留备份未包含的当前数据。

## 自动化与数据层证据

- Full tests：31 个测试文件、390 项测试通过。
- Typecheck：通过。
- Lint：通过。
- Build：通过，新增 `/api/backup`、`/api/backup/preview`、`/api/backup/restore` 三条 API 路由。
- Diff check：通过，仅有 Windows LF/CRLF 工作区提示。
- Backup v1 解析覆盖格式、版本、5 MB 上限、字段类型、时间戳、ID、枚举、relation 顺序、snapshot 一致性和旧 reference-only JSON 拒绝。
- SQLite 真实事务测试证明：在批次末尾注入无效 relation 后语句抛错，四张相关表回读与执行前完全一致，未发生部分恢复。
- 本地验收备份生成 4 条 D1 batch 语句，JSON1 参数块为 `40 / 1840 / 717 / 2386` 字节，最大 2,386 字节；低于 40 条和 1,000,000 字节硬上限。
- 大数据自动化覆盖 120 references、20 syntheses、40 relations，并验证所有 JSON1 块低于 1 MB；超 40 语句和单行超限在访问 D1 前返回稳定错误。
- 本轮没有 migration 文件或 schema 变更；本地继续使用既有 migration 1、2。

## 本地浏览器恢复批次

- 备份文件：`C:\Users\彭小平\AppData\Local\Temp\ref-forge-r13-baseline.json`
- 文件大小：4,983 字节。
- `exported_at`：`2026-07-27T14:13:28.037Z`。
- 顶层键：`format`、`schema_version`、`exported_at`、`app`、`data`、`preferences`。
- 内容：2 references、1 synthesis、2 ordered relations；该基线未包含设备偏好。
- Backup digest：`1f4e2ac447a0ecdda8bbe68b92050620b5839c08184aef2eedf68a9831143545`。
- 初始 state digest：`1b537c9d45405ba7ef756591af315b4baf172433be28ea2da85df43215fc5f9e`。

恢复目标：

- Reference Alpha：`2f73edf2-f463-420d-8f50-36bf282a62f4`
- Null-source Reference：`d6d2f682-af37-467a-8e0c-1ab4b7eac850`
- Synthesis：`ca2376a0-c4bc-49fe-bf0c-5c0ac45cf1d4`
- Ordered relations：`3404eda3-ef6e-4eb9-844a-56d783cc9c7c`、`3deecc5b-ea32-4c2b-9d59-2b883bb8a0ed`

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 无偏好导出 | 通过 | Backup v1 结构完整，`preferences: null`，无凭据和媒体二进制 |
| 含偏好导出 | 通过 | 仅包含 pinned reference IDs 和版本化 workspace layout |
| 零写入预览 | 通过 | overwrite references 2、syntheses 1、relations 2、historical snapshots 0；预览前后业务数据一致 |
| 精确保真恢复 | 通过 | Alpha notes 恢复为 `round13-alpha-baseline`；Null-source 的 site/author 保持 null；synthesis notes 恢复为 `round13-synthesis-baseline` |
| Relation 与 snapshot | 通过 | 顺序为 Alpha 后 Null-source；第二条 snapshot 的 site/author 仍为 null |
| 过期预览 | 通过 | 预览后修改 Alpha，恢复返回 409 并自动重新预览；覆盖确认复位，页面保留可见提示 |
| Reference 草稿保护 | 通过 | 未保存 source URL 触发“恢复会放弃当前未保存的草稿”确认 |
| Synthesis 草稿保护 | 通过 | 未保存标题触发相同门禁；确认放弃后恢复成功并清空草稿 |
| 设备偏好应用 | 通过 | pinned IDs 先与恢复后持久记录求交集；布局和 pinned 两项存储均成功后才更新 React 状态 |
| 中文与 English | 通过 | 数据管理触发器、Backup/Restore tabs、错误与成功反馈均可访问 |
| 键盘与焦点 | 通过 | Escape 关闭非 busy dialog；焦点返回“数据管理”触发按钮 |
| Busy 门禁 | 通过 | 自动化覆盖 export/preview/restore single-flight、关闭锁和重复提交锁 |
| Console errors | 通过 | 本地内置浏览器 error 日志为 0 |

## 响应式证据

| 视口 | 结果 |
| --- | --- |
| 1600x900 | document/body 横向溢出均为 0；dialog 宽 680px 并居中 |
| 1280x900 | document/body 横向溢出均为 0；dialog 宽 680px |
| 390x844 | document/body 横向溢出均为 0；dialog 左边距 12px，可用宽度约 350.67px |

390px 检查发现全宽导出按钮的图标与文字未作为一组居中。新增失败契约后，把 tabs 和 actions button 统一为居中 `inline-flex`；计算样式复核为 `align-items: center`、`justify-content: center`、`gap: 6px`，按钮尺寸稳定。

## 验收中发现并修复

1. 本地 D1 生成的时间戳可能只有 1-2 位小数，例如 `.75Z`，原解析器只接受 3 位小数，导致应用自己的导出无法导入。时间戳合同已改为接受 1-9 位小数，并增加 `.7Z`、`.75Z`、`.123456Z` 回归。
2. `preview_stale` 触发自动重新预览后，成功的重预览会清掉用户可见原因。状态机现保留安全的 `preview_stale` notice，重新勾选前用户仍能看见“研究数据在预览后发生变化”。
3. 390px 导出按钮图标对齐不一致，已按上节修复并补样式契约。

## 清理结果

- 本地 QA synthesis 先删除，再删除两条 references。
- API 最终回读：`referenceCount=0`、`synthesisCount=0`。
- 浏览器恢复中文、默认 1280x720 视口，数据管理弹窗关闭。
- 本地设备布局和 pinned 偏好已回到验收前状态。

## 待完成

- 功能分支最终独立审查与 merged-main 门禁。
- GitHub `main` 同步、Sites 新版本部署。
- 认证生产站临时 QA 批次、非 QA 数据不变证明和零残留清理。
