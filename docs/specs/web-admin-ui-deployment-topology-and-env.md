# Web Admin UI 部署拓樸與環境變數清單（Prod/Staging）

最後更新：2026-05-15

## 1. 部署目標

1. 讓 Web Admin UI 可在任何有網路的裝置透過瀏覽器操作。
2. 與 Supabase（DB/Auth/Edge Functions）安全整合。
3. 支援 `Staging` 與 `Production` 雙環境，避免測試影響正式環境。

## 2. 推薦部署拓樸

```text
[Admin Browser]
    |
    | HTTPS
    v
[Vercel: Web Admin UI (Next.js)]
    |
    | HTTPS + Bearer JWT
    v
[Supabase Project]
  - Auth
  - Postgres
  - Edge Functions (admin-p0-api, security-appeals-admin, ...)
  - Storage (optional)
```

說明：

1. Web UI 跑在 Vercel（或等價雲端 Web 平台）。
2. 業務 API 與資料仍由 Supabase 提供。
3. 管理端高權限操作統一走 Edge Functions，不讓瀏覽器直接持有資料庫憑證。

## 3. 環境切分策略

1. 建議使用兩個 Supabase 專案：
- `pickright-admin-staging`
- `pickright-admin-prod`

2. 建議使用兩個 Web 部署環境：
- `admin-staging.yourdomain.com`
- `admin.yourdomain.com`

3. 規則：
- Staging UI 僅連 Staging Supabase
- Prod UI 僅連 Prod Supabase
- 禁止跨環境混接

## 4. Web Admin UI 環境變數清單

以下以 Next.js 為例。

### 4.1 前端可見（`NEXT_PUBLIC_*`）

1. `NEXT_PUBLIC_APP_ENV`
- 值：`staging` 或 `production`

2. `NEXT_PUBLIC_SUPABASE_URL`
- 對應環境 Supabase project URL

3. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 對應環境 anon key（僅前端必要用途）

4. `NEXT_PUBLIC_SUPABASE_FUNCTIONS_BASE`
- 範例：`https://<project-ref>.supabase.co/functions/v1`

### 4.2 伺服器端機密（不可前端暴露）

1. `APPEALS_ADMIN_TOKEN`
- 給 `security-appeals-admin` 驗證

2. `SUPABASE_SERVICE_ROLE_KEY`（若你的 Next.js server action 需要）
- 僅 server-side 使用，嚴禁下發到瀏覽器

3. `SENTRY_DSN`（可選）
- 管理端錯誤監控

4. `ALERT_WEBHOOK_URL`（可選）
- 告警外送（Slack/Teams）

## 5. Supabase Edge Functions 必備環境變數

### 5.1 `admin-p0-api`

1. `SUPABASE_DB_URL`
2. `SUPABASE_URL`
3. `SUPABASE_ANON_KEY`

### 5.2 `security-appeals-admin`

1. `SUPABASE_DB_URL`
2. `APPEALS_ADMIN_TOKEN`
3. `RESEND_API_KEY`（若啟用申訴結果 mail）
4. `APPEALS_EMAIL_FROM`
5. `APP_PUBLIC_NAME`（可選）

## 6. 網域與存取控制

1. 全站 HTTPS 強制。
2. Admin UI 啟用 SSO 或 Supabase Auth + MFA。
3. 可加 IP Allowlist（公司網段/固定營運網段）。
4. 重要操作（解鎖、熔斷切換、配額變更）需二次確認與審計。

## 7. 部署流程（Staging -> Prod）

1. 先部署 Staging UI。
2. 先打 Staging Supabase API 做 smoke test。
3. 驗證通過後，再部署 Prod UI。
4. Prod 上線前檢查：
- API base 指向 Prod
- token/key 指向 Prod
- 沒有殘留 staging 變數

## 8. Smoke Test 清單（最小）

1. `GET /appeals` 可回資料。
2. `GET /appeal-mail-jobs` 可回資料。
3. `GET /grid/cells` 可回資料。
4. `GET /collection-jobs` 可回資料。
5. `POST /appeals/{ticket_id}/claim` 可寫入且有 `request_id`。
6. `admin_audit_logs` 有新增審計資料。

## 9. 成本與可用性建議

1. UI 由 Vercel 承載，成本可預測且部署快。
2. 資料與 API 集中 Supabase，避免多系統分裂。
3. 以 Edge Functions 為管理層，避免在前端暴露高權限邏輯。

## 10. 結論

1. Web Admin UI 建議放在 Vercel（或同級 Web 平台），不是直接跑在 Supabase。
2. Supabase 負責後端能力（DB/Auth/Functions）。
3. 以 Staging/Prod 雙環境隔離，確保長期維運與安全。
