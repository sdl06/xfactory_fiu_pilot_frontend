export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

const LEVEL_ORDER: Record<LogLevel, number> = {
  silent: 99,
  error: 40,
  warn: 30,
  info: 20,
  debug: 10,
};

function getEnvLogLevel(): LogLevel {
  try {
    const raw = (import.meta as any).env?.VITE_LOG_LEVEL as string | undefined;
    if (raw && ["silent", "error", "warn", "info", "debug"].includes(raw)) {
      return raw as LogLevel;
    }
  } catch {}
  // Default: verbose in dev, warn in prod
  try {
    const isProd = (import.meta as any).env?.PROD as boolean | undefined;
    return isProd ? "warn" : "debug";
  } catch {
    return "debug";
  }
}

export interface ScopedLogger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(scope: string, level: LogLevel = getEnvLogLevel()): ScopedLogger {
  const allow = (want: LogLevel) => LEVEL_ORDER[want] >= LEVEL_ORDER[level];
  const prefix = (lvl: string) => `[${new Date().toISOString()}][${scope}][${lvl}]`;
  return {
    debug: (...args) => {
      if (allow("debug")) console.debug(prefix("debug"), ...args);
    },
    info: (...args) => {
      if (allow("info")) console.info(prefix("info"), ...args);
    },
    warn: (...args) => {
      if (allow("warn")) console.warn(prefix("warn"), ...args);
    },
    error: (...args) => {
      if (allow("error")) console.error(prefix("error"), ...args);
    },
  };
}

export const logger = createLogger("app"); 