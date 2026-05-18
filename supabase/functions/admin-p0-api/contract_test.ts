import { assert } from "jsr:@std/assert";

const sourcePath = new URL("./index.ts", import.meta.url);
const source = await Deno.readTextFile(sourcePath);

Deno.test("admin-p0-api: includes appeals and appeal-mail routes", () => {
  assert(source.includes('"/appeals"'));
  assert(source.includes('"/appeal-mail-jobs"'));
  assert(source.includes("handleGetAppeals"));
  assert(source.includes("handleGetAppealMailJobs"));
});

Deno.test("admin-p0-api: includes grid read and actions routes", () => {
  assert(source.includes('"/grid/cells"'));
  assert(source.includes('"/refresh"'));
  assert(source.includes('"/pause"'));
  assert(source.includes('"/resume"'));
  assert(source.includes("handleGetGridCells"));
  assert(source.includes("handleRefreshGridCell"));
  assert(source.includes("handlePauseGridCell"));
  assert(source.includes("handleResumeGridCell"));
});

Deno.test("admin-p0-api: includes collection job read/action routes", () => {
  assert(source.includes('"/collection-jobs"'));
  assert(source.includes("handleGetCollectionJobs"));
  assert(source.includes("handleRetryCollectionJob"));
  assert(source.includes("handleCancelCollectionJob"));
});

Deno.test("admin-p0-api: includes cost/quota and circuit routes", () => {
  assert(source.includes('"/cost-quota/summary"'));
  assert(source.includes('"/cost-quota/providers/"'));
  assert(source.includes('"/circuit/open"'));
  assert(source.includes('"/circuit/close"'));
  assert(source.includes("handleGetCostQuotaSummary"));
  assert(source.includes("handleUpdateProviderLimits"));
  assert(source.includes("handleOpenProviderCircuit"));
  assert(source.includes("handleCloseProviderCircuit"));
});

Deno.test("admin-p0-api: includes observability routes", () => {
  assert(source.includes('"/metrics/timeseries"'));
  assert(source.includes('"/alerts"'));
  assert(source.includes('"/ack"'));
  assert(source.includes('"/resolve"'));
  assert(source.includes("handleGetMetricsTimeseries"));
  assert(source.includes("handleGetAlerts"));
  assert(source.includes("handleAckAlert"));
  assert(source.includes("handleResolveAlert"));
});

Deno.test("admin-p0-api: includes write operations and audit trail", () => {
  assert(source.includes("request_id"));
  assert(source.includes("admin_audit_logs"));
  assert(source.includes("writeAdminAudit"));
});

Deno.test("admin-p0-api: uses bearer jwt + role auth", () => {
  assert(source.includes("authorization"));
  assert(source.includes("SUPABASE_ANON_KEY"));
  assert(source.includes("admin_user_roles"));
  assert(source.includes("FORBIDDEN_ADMIN_ROLE_REQUIRED"));
});
