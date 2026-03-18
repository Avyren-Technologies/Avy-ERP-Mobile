import Env from 'env';

const isDev = Env.EXPO_PUBLIC_APP_ENV !== 'production';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, tag: string, message: string, data?: unknown) {
  // Suppress debug logs in production
  if (!isDev && level === 'debug') return;

  const prefix = `[${tag}]`;
  const args = data !== undefined ? [prefix, message, data] : [prefix, message];

  switch (level) {
    case 'info':
      console.log(...args);
      break;
    case 'debug':
      console.log(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
  }
}

export function createLogger(tag: string) {
  return {
    info: (message: string, data?: unknown) => log('info', tag, message, data),
    warn: (message: string, data?: unknown) => log('warn', tag, message, data),
    error: (message: string, data?: unknown) => log('error', tag, message, data),
    debug: (message: string, data?: unknown) => log('debug', tag, message, data),
  };
}
