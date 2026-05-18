# Vercel Staging 一次到位設定清單

最後更新：2026-05-15

## 1. 目標

把 `web-admin-ui` 以 Staging 環境部署到 Vercel，並正確對接 Supabase Staging 專案，達成可遠端測試。

## 2. 前置確認

1. Repo 已包含 `web-admin-ui/` 且 `npm run build` 可通過。
2. Supabase Staging 專案可用（含已部署 `admin-p0-api`）。
3. 已準備 Staging 用 Supabase key（不可與 Production 共用）。

## 3. Vercel 專案建立

1. 登入 Vercel，`Add New Project`。
2. 選擇此 Git repository。
3. 設定：
- Framework Preset: `Next.js`
- Root Directory: `web-admin-ui`
- Build Command: `npm run build`
- Output Directory: `.next`（預設即可）
4. 建立專案名稱（建議）：`pickright-admin-staging`。

## 4. 環境變數（Staging）

在 Vercel Project Settings -> Environment Variables 設定以下變數（Environment: `Preview` + `Development`，必要時含 `Production` 但值仍指向 staging）：

1. `NEXT_PUBLIC_APP_ENV=staging`
2. `NEXT_PUBLIC_SUPABASE_URL=https://<STAGING_PROJECT_REF>.supabase.co`
3. `NEXT_PUBLIC_SUPABASE_ANON_KEY=<STAGING_ANON_KEY>`
4. `NEXT_PUBLIC_SUPABASE_FUNCTIONS_BASE=https://<STAGING_PROJECT_REF>.supabase.co/functions/v1`
5. `NEXT_PUBLIC_SUPABASE_FUNCTIONS_BASE=https://<STAGING_PROJECT_REF>.supabase.co/functions/v1`

注意：
- 不可使用 production token/key。

## 5. Supabase Staging 對接確認

1. Supabase Edge Function 確認已部署：
- `admin-p0-api`
- `security-appeals`
- `security-appeals-admin`

2. Supabase Secrets（Staging）確認：
- `SUPABASE_DB_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APPEALS_ADMIN_TOKEN`（若 `security-appeals-admin` 使用）

3. DB migration 狀態確認：
- `grid_*`, `collection_jobs`, `appeal_mail_*`, `admin_audit_logs`
- `provider_*`, `metrics_timeseries`, `admin_alerts`

## 6. 首次部署步驟

1. 在 Vercel 觸發首次 Deploy。
2. 部署成功後取得 Staging URL（例如 `https://pickright-admin-staging.vercel.app`）。
3. 開啟 URL，應先看到 `/login`。
4. 使用已在 Supabase Auth 建立、且具 `admin_user_roles` 權限的帳號登入。

## 7. Smoke Test（Staging）

登入後逐頁驗證：

1. Dashboard
- 卡片數值可載入（非 500）

2. Appeals
- 列表可載入
- 任一 `submitted` 或 `need_more_info` 票可 `Claim`

3. Appeal Mail
- 列表可載入
- `failed/retrying` 可 `Retry`
- `dead_letter` 可 `Requeue`

4. Grid
- 列表可載入
- `View` 可開 detail
- `Refresh/Pause/Resume` 可操作

5. Jobs
- 列表可載入
- `failed/cancelled` 可 `Retry`
- `queued/running` 可 `Cancel`

6. Cost
- 可新增/更新 provider limits
- `Open/Close circuit` 可操作

7. Observability
- alerts 列表可載入
- `Ack/Resolve` 可操作
- metrics list 可載入

## 8. 常見錯誤排查

1. 401 unauthorized
- 檢查瀏覽器是否已有 `sb_access_token` cookie
- 檢查帳密是否正確（Supabase Auth）

2. 403 forbidden
- 檢查使用者是否存在於 `public.admin_user_roles` 且 `is_active=true`

3. 500 server_misconfigured
- 檢查 `NEXT_PUBLIC_SUPABASE_FUNCTIONS_BASE` 與 function secret（`SUPABASE_DB_URL`/`SUPABASE_URL`/`SUPABASE_ANON_KEY`）

4. Login 後仍跳回 `/login`
- 檢查 cookie 是否被瀏覽器阻擋
- 確認 HTTPS 與網域一致

5. 某頁資料空白
- 檢查 Staging DB 是否已套用最新 migrations

## 9. 安全與流程建議

1. Staging 與 Production token 完全分離。
2. 每次 rotate token 後，同步更新 Vercel 與 Supabase secrets。
3. Staging 通過後再建立 Production 專案與域名。

## 10. Done 定義

當以下條件都成立，即可視為 Staging 一次到位：

1. Vercel 部署成功且可登入。
2. 7 個核心頁面可載入。
3. 主要寫操作可成功且無 5xx。
4. `admin_audit_logs` 可看到操作審計紀錄。
