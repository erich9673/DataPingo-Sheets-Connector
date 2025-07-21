/**
 * Safe logging utility to prevent EIO errors when terminal/stdout is unavailable
 */
export declare class SafeLogger {
    static log(...args: any[]): void;
    static error(...args: any[]): void;
    static warn(...args: any[]): void;
    static info(...args: any[]): void;
}
export declare const safeLog: typeof SafeLogger.log;
export declare const safeError: typeof SafeLogger.error;
export declare const safeWarn: typeof SafeLogger.warn;
export declare const safeInfo: typeof SafeLogger.info;
