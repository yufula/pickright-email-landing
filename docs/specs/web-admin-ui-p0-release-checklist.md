# Web Admin UI P0 上線前 Checklist

最後更新：2026-05-15

## 1. 範圍

本清單用於確認 Web Admin UI + Supabase 後端 P0 是否達到可上線條件。

## 2. 已完成（Done）

1. P0 後端資料結構
- `grid_cells`, `grid_candidates`, `collection_jobs`
- `appeal_mail_jobs`, `appeal_mail_audit`, `admin_audit_logs`
- `provider_limits`, `provider_usage_snapshots`, `provider_circuits`
- `metrics_timeseries`, `admin_alerts`

2. `admin-p0-api` 已上線端點
- Appeals: list/detail/claim
- Appeal Mail: list/retry/requeue
- Grid: list/detail/refresh/pause/resume
- Jobs: list/retry/cancel
- Cost: summary/update-limits/circuit open/close
- Observability: metrics/alerts/ack/resolve

3. Web Admin UI 骨架與頁面
- Dashboard / Appeals / Appeal Mail / Grid / Jobs / Cost / Observability
- 最小登入保護（`/login` + middleware）
- 主要操作按鈕已接 server actions

4. 驗證與部署
- `admin-p0-api` contract test 通過
- `web-admin-ui` build 通過
- migrations 已 `db push`
- function 已 deploy

## 3. 待完成（Before Production）

1. 身份與權限
- 將「密碼登入」升級為正式 Auth（Supabase Auth + RBAC + MFA）
- 補 `admin_owner/admin_operator/admin_viewer` 權限分流

2. 安全
- 全面關閉測試用寬鬆 CORS（改白名單）
- 旋轉 `ADMIN_API_TOKEN` / `APPEALS_ADMIN_TOKEN`
- 設定 IP allowlist（可選）

3. 觀測與告警
- 設定告警通知出口（Slack/Email/Webhook）
- 補 metrics 實際寫入排程（目前表結構已就位）

4. 資料治理
- 為新表補齊 RLS policy 細則（目前為 secure-by-default 骨架）
- 補資料保留策略（TTL / 歸檔 / 清理）

5. 營運流程
- 建立 on-call runbook（故障、熔斷、回退）
- 建立變更審核流程（高風險操作需雙確認）

## 4. 上線驗收（Go/No-Go）

1. 功能驗收
- 各頁可載入、操作成功率 > 99%
- 主要寫操作都有 `request_id` 與 `admin_audit_logs`

2. 穩定性驗收
- 連續 24 小時無 P1 錯誤
- API p95 延遲在可接受範圍

3. 安全驗收
- 不可匿名進入管理頁
- 高風險操作均有審計軌跡

4. 回退驗收
- 具備 function 回退版本策略
- 具備 migration 回退腳本與流程

## 5. 建議上線節奏

1. Staging soak（至少 2~3 天）
2. 小流量 Prod 試運行（內部帳號）
3. 全量切換並觀測 48 小時

## 6. 立即下一步（建議）

1. 先完成正式 Auth/RBAC/MFA
2. 補齊 RLS policies
3. 做一次 Staging 全流程演練（Appeals -> Mail -> Grid/Jobs -> Cost -> Alerts）
