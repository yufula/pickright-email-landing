# Web Admin UI + Grid Candidate Pool + Appeals Mail 技術規格 v2

最後更新：2026-05-15

## 1. 目標與範圍

本規格統一定義完整後台設計，包含三個核心子系統：

1. Web Admin UI（管理與監控中樞）
2. Supabase 整合後台能力（Auth / Appeals / Grid / Scheduler / Metrics）
3. 網格候選池資料收集引擎（Grid Collection Engine）

產品目標：

1. App 查詢餐飲資訊時，優先回傳後端已收集之網格候選池資料。
2. 超出網格覆蓋或命中不足時，才依當下 GPS 走 live fallback 查詢。
3. 申訴審核決策（approved/rejected）後，系統可發送結果 mail 並保留審計。

本文件以規格為主，尚不做大量程式改造。

## 2. 架構總覽（統一後台）

```text
[Web Admin UI]
   | (admin actions + monitoring)
   v
[Admin API / Supabase Edge Functions]
   |        |                |
   |        |                +--> [Appeals Decision + Mail Queue + Mail Sender]
   |        +-------------------> [Collection Scheduler]
   |                                 |
   |                                 v
   |                          [Collector Workers/Bots] ---> [Places Providers]
   |                                 |
   +-------------------------------> [Grid Candidate Pool]
                                      |
                                      v
                             [Query Router API]
                                |           |
                                |           +--> live places fallback proxy
                                +--------------> App
```

核心原則：

1. pre-collected first
2. fallback only when needed
3. centralized governance（成本、配額、熔斷、審計）

## 3. Web Admin UI 模組邊界

v2 Admin UI 最小模組：

1. Appeals Console
- 申訴佇列、狀態遷移、審核決策、審計紀錄
- 顯示 mail 發送狀態（queued/sent/failed/retrying）

2. Grid Coverage Console
- 網格覆蓋圖（base/hot）
- cell 熱度、更新時間、新鮮度、命中率

3. Collection Engine Console
- 任務排程（full/incremental）
- 任務狀態、失敗重試、手動重抓

4. Cost & Quota Console
- provider 配額、日/小時預算
- fallback 成本、熔斷狀態與切換

5. Observability Console
- 命中率、延遲、新鮮度、成本、錯誤率、排程積壓

## 3A. 優先搬進 Web Admin UI 的 Supabase 管理項目（重點藍圖）

本章定義「盡量完整、先做不漏」的後台項目，並以 P0/P1/P2 做主次分層。

### P0（上線必備，日常高頻 + 高風險）

1. 使用者與安全中心
- 帳號狀態檢視（active/locked/appeal）
- 申訴審核決策（approved/rejected）
- 鎖定池查詢與解鎖操作
- 申訴與解鎖全鏈路審計

2. 申訴通知中心（Mail）
- 任務佇列（queued/sending/sent/failed/retrying/dead_letter）
- 失敗重送與重試策略可視化
- 模板版本管理（中/英）
- 寄送結果追蹤與錯誤碼檢視

3. 網格候選池營運中心
- 覆蓋地圖（base/hot）、更新時間、新鮮度
- cell 命中率與 fallback 率
- 手動重抓指定 cell
- out-of-grid 熱點追蹤

4. 收集引擎與排程中心
- full/incremental 任務建立與停啟
- 任務失敗重試、backoff 狀態
- job backlog 與執行耗時
- worker/provider 健康狀態

5. 成本與配額中心
- provider 每日/每小時配額
- fallback API 成本看板
- 速率限制參數管理
- 熔斷器狀態與手動切換

6. 即時觀測與告警中心
- hit/miss/partial_hit/out_of_grid 比率
- 查詢延遲 p50/p95
- provider error rate
- 告警事件流與處置狀態

### P1（第二階段，強化治理與維運效率）

1. Edge Functions 管理摘要
- function 版本、最近部署時間
- 執行錯誤趨勢
- 關鍵 function 健康檢查

2. 資料治理中心
- 關鍵表成長趨勢（rows/storage）
- TTL 過期比例
- 去重率/重複資料趨勢
- 索引命中與慢查詢摘要（read-only）

3. 政策與權限快照
- RLS/policy 一致性檢查結果
- 服務角色權限檢查清單
- 高風險設定異動審計

4. 設定中心
- provider 優先序與路由權重
- grid 層級參數（base/hot 尺寸）
- TTL 與質量分數權重配置

### P2（第三階段，進階營運與自動化）

1. 自動調參建議
- 熱區自動擴縮建議
- 排程節奏自動調整建議
- 成本/命中最佳化建議

2. 營運報表中心
- 週報/月報匯出
- 城市/區域比較
- 成本與命中率關聯分析

3. AI 輔助運營（可選）
- 告警摘要與處置建議
- 任務失敗原因聚類
- 申訴審核輔助摘要（人審最終決策）

### 為何這樣分層

1. P0：不做會直接影響上線可運營性與風險控制。
2. P1：做了可顯著降低維運成本與排障時間。
3. P2：追求效率提升與自動化，不阻塞首版上線。

### 官方 Supabase Console 的定位

1. 日常操作目標：80~90% 在自建 Web Admin UI 完成。
2. 官方 Console 保留：低頻進階維護、緊急除錯與平台級設定。


## 3B. P0 Admin UI 導航與頁面清單（可落地規格）

本章將 P0 轉成可實作的 Web Admin UI 規格，定義頁面、欄位、按鈕、API、權限。

### 3B.1 全域導覽（Navigation）

P0 側邊欄建議：

1. `Dashboard`（總覽）
2. `Appeals`（申訴審核）
3. `Appeal Mail`（申訴通知）
4. `Grid Coverage`（網格覆蓋）
5. `Collection Jobs`（收集任務）
6. `Cost & Quota`（成本配額）
7. `Observability`（觀測告警）

全域頂欄：

1. 環境標示（Prod/Staging）
2. 全域搜尋（ticket_id/user_id/cell_id/job_id）
3. 最近告警數
4. 登入者角色與 MFA 狀態

### 3B.2 權限模型（P0）

1. `admin_owner`
- 全功能（含高風險操作：解鎖、熔斷切換、配額變更）

2. `admin_operator`
- 可審核、可重抓、可重送 mail
- 不可修改高風險全域設定（例如硬配額上限）

3. `admin_viewer`
- 僅可讀（儀表板、查詢、審計）

### 3B.3 Dashboard（總覽）

主要卡片：

1. 今日查詢總數 / hit / partial_hit / miss / out_of_grid
2. 今日 fallback 次數與成本
3. 活躍申訴票數（submitted/under_review）
4. mail 失敗佇列數（failed/dead_letter）
5. collection job backlog
6. provider 錯誤率與熔斷狀態

主要按鈕：

1. `查看失敗任務`
2. `前往申訴待審`
3. `前往 out-of-grid 熱點`

對應 API（read）：

1. `GET /admin/v1/dashboard/summary`
2. `GET /admin/v1/alerts/open`

### 3B.4 Appeals（申訴審核）

列表欄位：

1. `appeal_ticket_id`
2. `email`
3. `status`
4. `created_at`
5. `updated_at`
6. `last_message`
7. `lock_state`
8. `reviewer`

篩選：

1. status
2. created_at 區間
3. lock_state
4. ticket_id/email 關鍵字

詳情頁：

1. 申訴內容與歷史狀態遷移
2. 帳號安全摘要（鎖定資訊）
3. 相關審計事件

操作按鈕：

1. `Claim`（submitted -> under_review）
2. `Need more info`
3. `Approve + Unlock`
4. `Reject`

對應 API：

1. `GET /admin/v1/appeals`
2. `GET /admin/v1/appeals/{ticket_id}`
3. `POST /functions/v1/security-appeals-admin`（decision）
4. `POST /admin/v1/appeals/{ticket_id}/claim`

### 3B.5 Appeal Mail（申訴通知）

列表欄位：

1. `job_id`
2. `ticket_id`
3. `email`
4. `template_key`
5. `status`
6. `retry_count`
7. `last_error_code`
8. `created_at`
9. `sent_at`

篩選：

1. status
2. template_key
3. created_at 區間

操作按鈕：

1. `Retry now`（failed/retrying）
2. `Move to dead-letter`（人工終止）
3. `Requeue`（dead-letter -> queued）
4. `Preview template`（只讀）

對應 API：

1. `GET /admin/v1/appeal-mail-jobs`
2. `POST /admin/v1/appeal-mail-jobs/{job_id}/retry`
3. `POST /admin/v1/appeal-mail-jobs/{job_id}/requeue`
4. `GET /admin/v1/appeal-mail-templates/{template_key}`

### 3B.6 Grid Coverage（網格覆蓋）

地圖與列表欄位：

1. `cell_id`
2. `grid_level`（base/hot）
3. `heat_score`
4. `last_collected_at`
5. `freshness_age`
6. `hit_rate`
7. `miss_rate`
8. `fallback_rate`
9. `candidate_count`

操作按鈕：

1. `Refresh cell now`
2. `Pause cell collection`
3. `Resume cell collection`
4. `Open cell candidates`

對應 API：

1. `GET /admin/v1/grid/cells`
2. `GET /admin/v1/grid/cells/{cell_id}`
3. `POST /admin/v1/grid/cells/{cell_id}/refresh`
4. `POST /admin/v1/grid/cells/{cell_id}/pause`
5. `POST /admin/v1/grid/cells/{cell_id}/resume`

### 3B.7 Collection Jobs（收集任務）

列表欄位：

1. `job_id`
2. `job_type`（full/incremental）
3. `target_grid_level`
4. `target_cell_count`
5. `status`
6. `started_at`
7. `finished_at`
8. `api_call_count`
9. `error_count`

操作按鈕：

1. `Create full job`
2. `Create incremental job`
3. `Retry failed job`
4. `Cancel running job`
5. `View job logs`

對應 API：

1. `GET /admin/v1/collection-jobs`
2. `POST /admin/v1/collection-jobs`
3. `POST /admin/v1/collection-jobs/{job_id}/retry`
4. `POST /admin/v1/collection-jobs/{job_id}/cancel`
5. `GET /admin/v1/collection-jobs/{job_id}/logs`

### 3B.8 Cost & Quota（成本配額）

主要欄位：

1. provider 日配額 / 已使用 / 剩餘
2. provider 小時配額 / 已使用 / 剩餘
3. fallback 成本（今日/近 7 日）
4. 熔斷狀態（closed/open/half-open）

操作按鈕：

1. `Update hourly quota`
2. `Update daily quota`
3. `Open circuit`（手動熔斷）
4. `Close circuit`（手動恢復）

對應 API：

1. `GET /admin/v1/cost-quota/summary`
2. `POST /admin/v1/cost-quota/providers/{provider}/limits`
3. `POST /admin/v1/providers/{provider}/circuit/open`
4. `POST /admin/v1/providers/{provider}/circuit/close`

### 3B.9 Observability（觀測告警）

主要圖表：

1. 命中率趨勢（hit/partial/miss/out_of_grid）
2. 查詢延遲（p50/p95）
3. provider 錯誤率
4. job 失敗率
5. mail 發送成功率

告警列表欄位：

1. `alert_id`
2. `severity`
3. `category`
4. `message`
5. `triggered_at`
6. `status`（open/ack/closed）
7. `owner`

操作按鈕：

1. `Acknowledge`
2. `Assign owner`
3. `Resolve`

對應 API：

1. `GET /admin/v1/metrics/timeseries`
2. `GET /admin/v1/alerts`
3. `POST /admin/v1/alerts/{alert_id}/ack`
4. `POST /admin/v1/alerts/{alert_id}/resolve`

### 3B.10 共用 UX 規範（P0）

1. 所有高風險操作需二次確認（confirm modal）。
2. 所有寫操作需顯示 audit trail（操作者、時間、變更前後）。
3. 列表頁支援 CSV 匯出（僅 admin_owner / admin_operator）。
4. 所有時間統一顯示 UTC 與本地時區切換。

### 3B.11 實作先後建議（P0）

1. Wave 1
- Dashboard
- Appeals
- Appeal Mail

2. Wave 2
- Grid Coverage
- Collection Jobs

3. Wave 3
- Cost & Quota
- Observability

## 3C. P0 API Contract（表格版草案）

以下為 Admin UI P0 對接契約草案（實作前可再收斂路由命名）。

### 3C.1 Appeals API

1. `GET /admin/v1/appeals`
- Query: `status`, `from`, `to`, `keyword`, `page`, `page_size`
- 200 Response:
```json
{
  "items": [{
    "appeal_ticket_id": "APR-202605150001-0001",
    "email": "user@example.com",
    "status": "submitted",
    "created_at": "2026-05-15T01:00:00Z",
    "updated_at": "2026-05-15T01:00:00Z"
  }],
  "total": 120
}
```
- Errors: `401 unauthorized`, `403 forbidden`, `500 internal_error`

2. `GET /admin/v1/appeals/{ticket_id}`
- 200 Response: appeal detail + audit timeline
- Errors: `404 ticket_not_found`, `401`, `403`, `500`

3. `POST /admin/v1/appeals/{ticket_id}/claim`
- Request:
```json
{ "reviewer": "ops_oncall" }
```
- 200 Response:
```json
{ "status": "under_review" }
```
- Errors: `409 invalid_state_transition`, `404`, `401`, `403`, `500`

4. `POST /functions/v1/security-appeals-admin`
- Request:
```json
{
  "ticket_id": "APR-202605150001-0001",
  "decision": "approved",
  "message": "Approved after review.",
  "reviewer": "ops_oncall"
}
```
- 200 Response:
```json
{
  "status": "ok",
  "appeal_status": "approved",
  "unlock_applied": true
}
```
- Errors: `409 terminal_state`, `400 invalid_decision`, `401`, `403`, `500`

### 3C.2 Appeal Mail API

1. `GET /admin/v1/appeal-mail-jobs`
- Query: `status`, `template_key`, `from`, `to`, `page`, `page_size`
- 200 Response: list + pagination total
- Errors: `401`, `403`, `500`

2. `POST /admin/v1/appeal-mail-jobs/{job_id}/retry`
- Request: `{ "reason": "manual_retry" }`
- 200 Response: `{ "status": "retrying" }`
- Errors: `409 invalid_status`, `404`, `401`, `403`, `500`

3. `POST /admin/v1/appeal-mail-jobs/{job_id}/requeue`
- Request: `{ "reason": "manual_requeue" }`
- 200 Response: `{ "status": "queued" }`
- Errors: `409 invalid_status`, `404`, `401`, `403`, `500`

### 3C.3 Grid & Collection API

1. `GET /admin/v1/grid/cells`
- Query: `grid_level`, `heat_min`, `stale_only`, `page`, `page_size`
- 200 Response: cell list with freshness/hit metrics
- Errors: `401`, `403`, `500`

2. `POST /admin/v1/grid/cells/{cell_id}/refresh`
- Request: `{ "priority": "high" }`
- 200 Response: `{ "accepted": true, "job_id": "JOB-..." }`
- Errors: `404`, `409 cell_paused`, `401`, `403`, `500`

3. `GET /admin/v1/collection-jobs`
- Query: `status`, `job_type`, `from`, `to`, `page`, `page_size`
- 200 Response: jobs list
- Errors: `401`, `403`, `500`

4. `POST /admin/v1/collection-jobs`
- Request:
```json
{
  "job_type": "incremental",
  "target_grid_level": "hot",
  "target_cell_ids": ["h3_xxx"]
}
```
- 202 Response:
```json
{ "accepted": true, "job_id": "JOB-20260515-001" }
```
- Errors: `400 invalid_payload`, `401`, `403`, `500`

### 3C.4 Cost/Quota & Alerts API

1. `GET /admin/v1/cost-quota/summary`
- 200 Response: provider limits/usage + circuit status
- Errors: `401`, `403`, `500`

2. `POST /admin/v1/cost-quota/providers/{provider}/limits`
- Request:
```json
{ "daily_limit": 10000, "hourly_limit": 800 }
```
- 200 Response: updated limits
- Errors: `400 invalid_limit`, `401`, `403`, `500`

3. `GET /admin/v1/alerts`
- Query: `status`, `severity`, `category`, `page`, `page_size`
- 200 Response: alerts list
- Errors: `401`, `403`, `500`

4. `POST /admin/v1/alerts/{alert_id}/ack`
- Request: `{ "owner": "ops_oncall" }`
- 200 Response: `{ "status": "ack" }`
- Errors: `404`, `409 invalid_state`, `401`, `403`, `500`

### 3C.5 錯誤碼共用規範

1. API 錯誤格式：
```json
{
  "error": {
    "code": "invalid_state_transition",
    "message": "Cannot claim terminal ticket",
    "request_id": "req_abc123"
  }
}
```
2. 所有寫入 API 必須回傳 `request_id` 供審計追蹤。
3. 高風險操作失敗需明確區分 `403 forbidden` 與 `409 business_conflict`。

## 12B. Supabase DDL 草案（P0）

以下為 P0 需要新增的資料表草案，實作時需遵循 migration policy，並補 RLS 與索引。

### 12B.1 `grid_cells`

```sql
create table if not exists public.grid_cells (
  cell_id text primary key,
  grid_level text not null check (grid_level in ('base','hot')),
  center_lat double precision not null,
  center_lng double precision not null,
  heat_score double precision not null default 0,
  is_active boolean not null default true,
  is_paused boolean not null default false,
  last_collected_at timestamptz,
  next_collect_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 12B.2 `grid_candidates`

```sql
create table if not exists public.grid_candidates (
  candidate_id text primary key,
  cell_id text not null references public.grid_cells(cell_id),
  name text not null,
  normalized_name text not null,
  lat double precision not null,
  lng double precision not null,
  provider text not null,
  provider_place_id text,
  address text,
  categories_json jsonb not null default '[]'::jsonb,
  rating double precision,
  rating_count int,
  price_level int,
  last_seen_at timestamptz not null,
  first_seen_at timestamptz not null,
  expires_at timestamptz not null,
  quality_score double precision not null default 0,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_grid_candidates_cell on public.grid_candidates(cell_id);
create index if not exists idx_grid_candidates_expires on public.grid_candidates(expires_at);
create unique index if not exists uq_grid_candidates_provider_ref
  on public.grid_candidates(provider, provider_place_id)
  where provider_place_id is not null;
```

### 12B.3 `collection_jobs`

```sql
create table if not exists public.collection_jobs (
  job_id text primary key,
  job_type text not null check (job_type in ('full','incremental')),
  target_grid_level text not null check (target_grid_level in ('base','hot')),
  target_cell_count int not null default 0,
  status text not null check (status in ('queued','running','succeeded','failed','cancelled')),
  api_call_count int not null default 0,
  error_count int not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_collection_jobs_status on public.collection_jobs(status);
```

### 12B.4 `appeal_mail_jobs`

```sql
create table if not exists public.appeal_mail_jobs (
  job_id text primary key,
  ticket_id text not null,
  user_id uuid,
  email text not null,
  template_key text not null check (template_key in ('approved','rejected')),
  status text not null check (status in ('queued','sending','sent','failed','retrying','dead_letter')),
  retry_count int not null default 0,
  max_retries int not null default 5,
  last_error_code text,
  last_error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_appeal_mail_jobs_status on public.appeal_mail_jobs(status);
create index if not exists idx_appeal_mail_jobs_ticket on public.appeal_mail_jobs(ticket_id);
```

### 12B.5 `appeal_mail_audit`

```sql
create table if not exists public.appeal_mail_audit (
  audit_id bigserial primary key,
  job_id text not null references public.appeal_mail_jobs(job_id),
  event_type text not null,
  event_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_appeal_mail_audit_job on public.appeal_mail_audit(job_id, created_at desc);
```

### 12B.6 `admin_audit_logs`（共用管理操作審計）

```sql
create table if not exists public.admin_audit_logs (
  id bigserial primary key,
  request_id text not null,
  actor_user_id uuid,
  actor_role text not null,
  action text not null,
  resource_type text not null,
  resource_id text,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_audit_logs_request on public.admin_audit_logs(request_id);
create index if not exists idx_admin_audit_logs_created on public.admin_audit_logs(created_at desc);
```

## 3D. P0 第二批設計（Grid / Jobs / Cost / Observability）

本章定義 P0 batch 2 的實作設計，作為 `admin-p0-api` 下一批路由與 UI 對接藍圖。

### 3D.1 Grid Coverage 設計

目標：讓管理端能快速定位「覆蓋不足、資料老化、命中下滑」的 cell。

1. 核心查詢視圖（建議）
- `admin_grid_cell_overview_v1`
- 欄位：`cell_id`, `grid_level`, `heat_score`, `last_collected_at`, `freshness_age_min`, `candidate_count`, `hit_rate_24h`, `miss_rate_24h`, `fallback_rate_24h`, `is_paused`

2. API 草案
- `GET /admin/v1/grid/cells`
- `GET /admin/v1/grid/cells/{cell_id}`
- `POST /admin/v1/grid/cells/{cell_id}/refresh`
- `POST /admin/v1/grid/cells/{cell_id}/pause`
- `POST /admin/v1/grid/cells/{cell_id}/resume`

3. 商業規則
- refresh 只建立任務，不同步阻塞查詢。
- paused cell 不可被 scheduler 自動挑選。
- hot cell 允許較高 refresh 優先級。

### 3D.2 Collection Jobs 設計

目標：任務可追蹤、可重試、可取消、可審計。

1. 狀態機
- `queued -> running -> succeeded`
- `queued/running -> failed`
- `queued/running -> cancelled`

2. 任務執行欄位
- `status`, `started_at`, `finished_at`, `api_call_count`, `error_count`
- 建議新增：`error_summary_json`, `progress_pct`

3. API 草案
- `GET /admin/v1/collection-jobs`
- `POST /admin/v1/collection-jobs`
- `POST /admin/v1/collection-jobs/{job_id}/retry`
- `POST /admin/v1/collection-jobs/{job_id}/cancel`
- `GET /admin/v1/collection-jobs/{job_id}/logs`

4. 調度規則
- 同一 cell 同時僅允許一個 running job。
- full job 預設低優先級，避免壓縮即時 fallback 預算。

### 3D.3 Cost & Quota 設計

目標：在不進 Supabase 官方 Console 的前提下，完成預算控管與熔斷操作。

1. 配額模型
- provider 日配額：`daily_limit`, `daily_used`
- provider 小時配額：`hourly_limit`, `hourly_used`
- 軟上限告警 + 硬上限阻擋

2. 熔斷模型
- 狀態：`closed`, `open`, `half_open`
- 觸發：錯誤率或延遲超閾值
- 恢復：連續健康檢查成功 N 次

3. API 草案
- `GET /admin/v1/cost-quota/summary`
- `POST /admin/v1/cost-quota/providers/{provider}/limits`
- `POST /admin/v1/providers/{provider}/circuit/open`
- `POST /admin/v1/providers/{provider}/circuit/close`

### 3D.4 Observability 設計

目標：統一呈現可運營指標與告警處置流程。

1. 指標分群
- 查詢群：`hit_rate`, `miss_rate`, `fallback_rate`, `latency_p95`
- 任務群：`job_success_rate`, `job_backlog`, `job_duration_p95`
- 通知群：`mail_sent_rate`, `mail_failed_rate`, `dead_letter_count`
- 成本群：`daily_cost`, `cost_per_query`

2. 告警級別
- `SEV1`：服務不可用/成本暴衝
- `SEV2`：命中率顯著下降/錯誤率升高
- `SEV3`：局部異常或單一 provider 警訊

3. API 草案
- `GET /admin/v1/metrics/timeseries`
- `GET /admin/v1/alerts`
- `POST /admin/v1/alerts/{alert_id}/ack`
- `POST /admin/v1/alerts/{alert_id}/resolve`

### 3D.5 P0 Batch 2 實作順序

1. Wave A
- `grid/cells` read + `collection-jobs` read

2. Wave B
- `grid refresh/pause/resume`
- `collection-jobs create/retry/cancel`

3. Wave C
- `cost-quota summary + limits update`
- `provider circuit open/close`

4. Wave D
- `metrics/alerts` + ack/resolve 流程

### 3D.6 驗收條件（Batch 2）

1. 管理者可在 3 分鐘內定位高 miss 熱區並建立 refresh。
2. 任務失敗可在 UI 直接 retry，且有 audit log。
3. 單一 provider 異常時可在 UI 手動熔斷並回復。
4. 告警可完成 ack/resolve，全程有 request_id 可追溯。

## 4. 網格切分策略

1. 網格層級
- `L_base`：一般區，約 0.6~1.2 km 級距
- `L_hot`：熱區，約 0.2~0.4 km 級距

2. 覆蓋策略
- 先覆蓋高活躍城市/商圈
- 同區同時有 base/hot 時，以 hot 優先
- 低流量區維持 base 降成本

3. 熱區優先
- `grid_heat_score` = query volume + fallback rate + freshness decay + admin weight
- 高分 cell 優先排程

## 5. 候選池資料模型

主要實體：

1. `grid_cells`
- `cell_id`, `grid_level`, `center_lat`, `center_lng`
- `heat_score`, `is_active`, `last_collected_at`, `next_collect_at`

2. `grid_candidates`
- `candidate_id`, `cell_id`, `name`, `normalized_name`
- `lat`, `lng`, `provider`, `provider_place_id`
- `address`, `categories_json`, `rating`, `rating_count`, `price_level`
- `last_seen_at`, `first_seen_at`, `expires_at`
- `quality_score`, `dedupe_key`

3. `grid_candidate_sources`
- `candidate_id`, `source_provider`, `source_payload_hash`
- `collected_at`, `collection_job_id`, `source_freshness_score`

4. `collection_jobs`
- `job_id`, `job_type`（full/incremental）
- `target_grid_level`, `target_cell_count`
- `status`, `started_at`, `finished_at`, `api_call_count`, `error_count`

去重鍵：

1. 首選 `provider + provider_place_id`
2. 後備 `normalized_name + geohash_prefix + normalized_address`

品質分數（0~100）來源：

1. 新鮮度
2. 多來源一致性
3. 欄位完整度
4. App 命中與最終選擇轉換率

## 6. 排程與更新策略

1. 全量（Full Refresh）
- 每 7 天至少一次 base 全覆蓋（分批）

2. 增量（Incremental Refresh）
- 依熱度動態更新（15 分鐘到 24 小時）

3. TTL
- hot: 24~48h
- base: 3~7d

4. 重抓節奏
- 穩定 cell 拉長間隔
- miss 飆升 cell 縮短間隔
- provider error 高時退避

## 7. App 查詢命中流程（Hit/Miss/Fallback）

1. App 傳入 `lat/lng/radius/cuisine`
2. Router 定位 cell 並查 grid pool
3. 先過濾再排序
4. `HIT`：直接回傳
5. `PARTIAL_HIT`：補打 live proxy 後 merge + dedupe
6. `MISS/OUT_OF_GRID`：直接 fallback，結果 async 回寫 pool

## 8. 成本護欄與配額策略

1. 預算層級
- global daily budget
- hourly guardrail
- cell-level budget

2. 速率限制
- collector 按 provider QPS/QPM
- live fallback 依裝置/IP/user 限流

3. 熔斷
- 5 分鐘錯誤率超閾值進入半開熔斷
- 熔斷期間以池資料 + 降級策略服務

## 9. 監控指標

1. 命中率：`hit_rate`, `partial_hit_rate`, `miss_rate`, `out_of_grid_rate`
2. 延遲：`query_latency_p50/p95`, `fallback_latency_p50/p95`
3. 新鮮度：平均 age、過期占比、cell 更新延遲
4. 成本：daily API calls、cost/query、cost/cell
5. 品質：去重後唯一店家數、低品質候選占比
6. 健康：provider error、circuit breaker 次數、job backlog

## 10. 風險與回退方案

1. 服務失效
- 停 full refresh，保最小增量
- App 提高 fallback 保障
- 啟動告警與任務降載

2. 資料過期
- 過期候選降權不立刻清空
- 熱點 miss 立即補抓

3. 異常飆量
- 啟用硬配額與節流
- 暫停低優先區蒐集

## 11. 申訴結果 Mail 通知設計（新增）

### 11.1 觸發點

當管理端執行：

1. `decision = approved`
2. `decision = rejected`

系統需在更新 `security_appeals` 狀態後，建立 mail 通知任務。

### 11.2 通知流程

1. Admin UI 決策提交
2. `security-appeals-admin` 寫入決策結果
3. 寫入 `appeal_mail_jobs`（`queued`）
4. Mail sender worker 取件發送
5. 回寫 `sent` 或 `failed`，失敗可重試

### 11.3 資料表建議

1. `appeal_mail_jobs`
- `job_id`, `ticket_id`, `user_id`, `email`
- `template_key`（approved/rejected）
- `status`（queued/sending/sent/failed/retrying/dead_letter）
- `retry_count`, `max_retries`
- `last_error_code`, `last_error_message`
- `created_at`, `updated_at`, `sent_at`

2. `appeal_mail_audit`
- `audit_id`, `job_id`, `event_type`, `event_payload_json`, `created_at`

### 11.4 重試與熔斷

1. 退避重試（例：1m/5m/15m）
2. 超過 `max_retries` 進 dead-letter
3. Mail provider 錯誤率異常時暫停出信並告警

### 11.5 文案與安全

1. 不暴露風控規則細節
2. approved: 引導重新登入與必要驗證
3. rejected: 提供再次申訴條件與冷卻說明
4. 保留中英模板與版本欄位，支援後續 A/B 與法規調整

## 12. Supabase 整合介面（v2）

1. Edge Functions
- `security-appeals`
- `security-appeals-admin`
- `grid-collection-scheduler`（規劃）
- `grid-live-fallback-proxy`（規劃）
- `appeals-mail-dispatcher`（規劃）

2. Postgres / Tables
- 既有：`security_appeals`, `locked_accounts_pool`
- 新增規劃：`grid_cells`, `grid_candidates`, `grid_candidate_sources`, `collection_jobs`, `appeal_mail_jobs`, `appeal_mail_audit`

3. 角色與權限
- Admin Role：可審核、調整排程、查看成本與監控
- Service Role：可執行排程、寫入候選池、發信任務處理

## 13. 分階段落地（MVP -> Beta -> GA）

1. MVP
- 上線 base grid + hit/miss/fallback
- 上線 appeals 決策後 mail queue + sender
- Admin UI 最小版（Appeals + Grid 概覽 + Job 狀態）

2. Beta
- 加入 hot grid 與熱度動態排程
- 成本配額/熔斷可視化與手動控制

3. GA
- 品質分數優化、覆蓋策略自動調參
- 完整審計與營運報表

## 13A. 跨平台技術選型（主流 + AI 可接軌）

目標：任何有網路的地方都可透過瀏覽器登入操作，不綁單一 OS。

1. 前端與後台主體
- 語言：`TypeScript`
- 框架：`Next.js + React`
- UI：`Tailwind CSS + shadcn/ui`
- 驗證：Supabase Auth（RBAC + admin role）

2. 後端服務層
- Supabase Postgres（資料主存）
- Supabase Edge Functions（API、排程入口、通知派送）
- pg_cron / job queue（排程與非同步任務）

3. AI 接軌策略
- 主線維持 TypeScript（前後台一致）
- 若後續有重型 AI/批次任務，再加 Python worker（FastAPI）作輔助
- Admin UI 保留 AI 建議面板與人工覆核流程（human-in-the-loop）

4. 跨平台與部署
- Web-first：桌機/平板/手機瀏覽器可用
- 建議部署：Vercel 或 Cloud Run（前端）+ Supabase（後端）
- 管理端強制 HTTPS、MFA、IP allowlist（可選）

## 14. 與既有安全文件對齊

對齊文件：

1. `docs/security/supabase-auth-status-mapping-and-appeal-api-spec.md`
2. `docs/security/supabase-anomaly-detection-playbook.md`
3. `docs/security/security-appeals-review-runbook.md`

對齊原則：

1. App 端僅顯示通用狀態與行動，不暴露風控細節
2. 後端統一執行限流、配額、熔斷、審計
3. Admin 操作可追溯，含 mail 發送與重試紀錄
