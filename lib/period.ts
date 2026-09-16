export function parsePeriod(searchParams: {
  [key: string]: string | string[] | undefined;
}): Set<string> | null {
  const raw = searchParams.mes;
  if (raw === undefined) return null;
  const values = Array.isArray(raw) ? raw : [raw];
  if (values.length === 0) return null;
  return new Set(values);
}
