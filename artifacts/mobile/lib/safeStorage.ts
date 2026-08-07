import AsyncStorage from "@react-native-async-storage/async-storage";

const memoryFallback: Record<string, string> = {};

export async function safeGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    return parsed as T;
  } catch {
    const mem = memoryFallback[key];
    if (mem) {
      try {
        return JSON.parse(mem) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

export async function safeSet<T>(key: string, value: T): Promise<void> {
  const json = JSON.stringify(value);
  try {
    await AsyncStorage.setItem(key, json);
  } catch {
    memoryFallback[key] = json;
  }
}

export async function safeRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
    delete memoryFallback[key];
  } catch {
    delete memoryFallback[key];
  }
}
