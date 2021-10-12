export interface ContextCacheInterface<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  clear(): void;
}

export class ContextCache<K = any, V = any>
  implements ContextCacheInterface<K, V> {
  private cache: Map<K, V>;

  constructor() {
    this.cache = new Map<K, V>();
  }

  public get(key: K): V | undefined {
    return this.cache.get(key);
  }

  public set(key: K, value: V) {
    this.cache.set(key, value);
  }

  public has(key: K) {
    return this.cache.has(key);
  }

  public clear() {
    this.cache = new Map<K, V>();
  }
}
