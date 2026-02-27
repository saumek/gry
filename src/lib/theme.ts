import type { ResolvedTheme, ThemeMode } from "./types";

export const THEME_STORAGE_KEY = "duoplay_theme_mode";

export function normalizeThemeMode(value: string | null | undefined): ThemeMode {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return "system";
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === "light") {
    return "light";
  }

  if (mode === "dark") {
    return "dark";
  }

  return prefersDark ? "dark" : "light";
}

export function readThemeMode(storage: Pick<Storage, "getItem">): ThemeMode {
  return normalizeThemeMode(storage.getItem(THEME_STORAGE_KEY));
}

export function saveThemeMode(storage: Pick<Storage, "setItem">, mode: ThemeMode): void {
  storage.setItem(THEME_STORAGE_KEY, mode);
}
