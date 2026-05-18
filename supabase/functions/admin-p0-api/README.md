# admin-p0-api

P0 backend endpoints for Web Admin UI (first batch: Appeals + Appeal Mail).

## Endpoint base

- `/functions/v1/admin-p0-api/*`

## Auth

- Header `Authorization: Bearer <supabase_access_token>`
- Function validates token with `SUPABASE_URL/auth/v1/user`, then checks
  `public.admin_user_roles` for active role mapping.
- Uses `SUPABASE_DB_URL` for privileged SQL operations.
- Required function env:
  - `SUPABASE_DB_URL`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

## Implemented routes (P0 batch 1)

1. `GET /appeals`
2. `GET /appeals/{ticket_id}`
3. `POST /appeals/{ticket_id}/claim`
4. `GET /appeal-mail-jobs`
5. `POST /appeal-mail-jobs/{job_id}/retry`
6. `POST /appeal-mail-jobs/{job_id}/requeue`
7. `GET /grid/cells`
8. `GET /grid/cells/{cell_id}`
9. `GET /collection-jobs`
10. `POST /collection-jobs/{job_id}/retry`
11. `POST /collection-jobs/{job_id}/cancel`

## Notes

- Write APIs return `request_id` for audit traceability.
- Write APIs insert audit records into `public.admin_audit_logs`.
- RLS is enabled on target tables; this function assumes service-role style DB access via `SUPABASE_DB_URL`.
- `admin_viewer` can only call read endpoints; write endpoints require
  `admin_operator` or `admin_owner`.

## Local contract test

```bash
deno test --allow-read supabase/functions/admin-p0-api/contract_test.ts
```

12. `POST /grid/cells/{cell_id}/refresh`
13. `POST /grid/cells/{cell_id}/pause`
14. `POST /grid/cells/{cell_id}/resume`

15. `GET /cost-quota/summary`
16. `POST /cost-quota/providers/{provider}/limits`
17. `POST /providers/{provider}/circuit/open`
18. `POST /providers/{provider}/circuit/close`

19. `GET /metrics/timeseries`
20. `GET /alerts`
21. `POST /alerts/{alert_id}/ack`
22. `POST /alerts/{alert_id}/resolve`
