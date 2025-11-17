export function assertSupabase(result, message = 'Error inesperado en Supabase') {
  if (result.error) {
    throw new Error(result.error.message ?? message);
  }
  return result.data;
}

export function buildPagedQuery(query, { search, limit = 50, offset = 0 }, searchable = []) {
  let q = query;
  if (search && searchable.length > 0) {
    const ilike = `%${search}%`;
    const orConditions = searchable.map((field) => `${field}.ilike.${ilike}`).join(',');
    q = q.or(orConditions);
  }
  const to = offset + limit - 1;
  return q.range(offset, to);
}
