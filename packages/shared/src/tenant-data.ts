const TENANT_BLOCKLIST = new Set(["id", "companyId", "createdAt", "updatedAt"]);

/** Pick allowed fields from body; always set companyId from session last. */
export function tenantCreateData<T extends Record<string, unknown>>(
  body: Record<string, unknown>,
  companyId: string,
  allowedFields: readonly string[],
): T {
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body && !TENANT_BLOCKLIST.has(field)) {
      data[field] = body[field];
    }
  }
  data.companyId = companyId;
  return data as T;
}

/** Strip tenant-escape fields from PATCH bodies. */
export function tenantPatchData(
  body: Record<string, unknown>,
  allowedFields: readonly string[],
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body && !TENANT_BLOCKLIST.has(field)) {
      data[field] = body[field];
    }
  }
  return data;
}

export { TENANT_BLOCKLIST };
