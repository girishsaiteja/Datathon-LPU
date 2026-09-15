const store = new Map<string, { at: number; data: unknown }>();
const TTL_MS = 30_000;

export async function cachedJson<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.data as T;
  }
  const data = await load();
  store.set(key, { at: Date.now(), data });
  return data;
}
