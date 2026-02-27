import { describe, expect, it } from "vitest";

import {
  normalizeThemeMode,
  readThemeMode,
  resolveTheme,
  saveThemeMode,
  THEME_STORAGE_KEY
} from "../../src/lib/theme";

describe("theme helper", () => {
  it("normalizuje tryb motywu i fallbackuje do system", () => {
    expect(normalizeThemeMode("light")).toBe("light");
    expect(normalizeThemeMode("dark")).toBe("dark");
    expect(normalizeThemeMode("system")).toBe("system");
    expect(normalizeThemeMode("other")).toBe("system");
    expect(normalizeThemeMode(null)).toBe("system");
  });

  it("rozwiazuje tryb wynikowy na podstawie systemu", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("czyta i zapisuje ustawienie motywu", () => {
    let persisted: string | null = null;
    const storage = {
      getItem: (key: string) => (key === THEME_STORAGE_KEY ? persisted : null),
      setItem: (key: string, value: string) => {
        if (key === THEME_STORAGE_KEY) {
          persisted = value;
        }
      }
    };

    expect(readThemeMode(storage)).toBe("system");
    saveThemeMode(storage, "dark");
    expect(readThemeMode(storage)).toBe("dark");
  });
});
