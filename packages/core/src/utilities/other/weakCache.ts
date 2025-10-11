export type ActualWeakKey = object | ((...args: unknown[]) => unknown) | symbol;
export function createWeakCacheForParametrizedFactory<Param extends ActualWeakKey, T>(
  factory: (param: Param) => T
): (param: Param) => T {
  const cache = new WeakMap<any, T>();

  return (param: Param): T => {
    if (!cache.has(param)) {
      const value = factory(param);
      cache.set(param, value);
      return value;
    } else {
      return cache.get(param)!;
    }
  };
}