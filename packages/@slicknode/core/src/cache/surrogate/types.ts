export interface SurrogateCacheObject {
  /**
   * Surrogate key of the cached object
   */
  key: string;

  /**
   * Fallback key that can be used if the combined keys exceed the limits that are supported
   * by the cache. For example, if the object is "User:234", the fallback can be "User".
   * A change to the user object can then invalidate all users
   */
  fallbackKey: string;

  /**
   * Time in seconds after which the cached response expires
   * If not provided, maxAge from settings is used, or default
   */
  maxAge?: number;
}

export interface SurrogateCacheInterface {
  /**
   * Adds information about an object that is part of the response to the surrogate cache
   * @param object
   */
  add(object: SurrogateCacheObject): void;

  /**
   * Enable / disable the surrogate cache
   * @param enabled
   */
  setEnabled(enabled: boolean): void;

  /**
   * Sets the max age for the response in seconds.
   * Ignored, if there is already a lower maxAge present in one of the objects
   * or default maxAge
   * @param seconds
   */
  setMaxAge(seconds: number): void;

  /**
   * Purge the provided surrogate keys
   * @param keys
   */
  purge(keys: string[]): Promise<void>;
}
