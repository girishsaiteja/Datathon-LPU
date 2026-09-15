export function assertReadOnlySelect(sql: string) {
  const cleaned = sql.trim().replace(/;+\s*$/g, "");
  const compact = cleaned.replace(/\s+/g, " ");
  if (!/^\s*select\b/i.test(compact)) {
    throw new Error("Only SELECT queries are allowed.");
  }
  if (/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|call|do|comment|vacuum|analyze|refresh|execute|prepare|deallocate|set|reset)\b/i.test(compact)) {
    throw new Error("That SQL is not allowed.");
  }
  if (compact.includes(";")) {
    throw new Error("Multiple SQL statements are not allowed.");
  }
  if (!/\bdatathon\./i.test(compact)) {
    throw new Error("Query must use the datathon schema.");
  }
  return compact;
}

export function withLimit(sql: string, limit = 200) {
  if (/\blimit\s+\d+/i.test(sql)) return sql;
  return `${sql} LIMIT ${limit}`;
}
