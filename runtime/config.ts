export const SETTINGS_DIR_NAME = ".spec-ui";
export const SETTINGS_FILE_NAME = "settings.json";
export const DEFAULT_RUNTIME_PORT = 4317;
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://[::1]:3000",
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "http://[::1]:1420",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "tauri://localhost",
];

export function runtimePort(): number {
  const raw = process.env.SPEC_UI_RUNTIME_PORT;
  if (!raw) {
    return DEFAULT_RUNTIME_PORT;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RUNTIME_PORT;
}

export function runtimeHost(): string {
  return process.env.SPEC_UI_RUNTIME_HOST || "127.0.0.1";
}

export function runtimeAllowedOrigins(): string[] {
  const raw = process.env.SPEC_UI_RUNTIME_ALLOWED_ORIGINS;
  if (!raw) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isRuntimeOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  return runtimeAllowedOrigins().includes(origin);
}
