/**
 * Safe logging utility to prevent EIO errors when terminal/stdout is unavailable
 */
export class SafeLogger {
    static log(...args: any[]) {
        try {
            console.log(...args);
        } catch (error) {
            // Ignore EIO or other stream errors to prevent app crashes
            // Could optionally write to a file or use alternative logging here
        }
    }

    static error(...args: any[]) {
        try {
            console.error(...args);
        } catch (error) {
            // Ignore EIO or other stream errors
        }
    }

    static warn(...args: any[]) {
        try {
            console.warn(...args);
        } catch (error) {
            // Ignore EIO or other stream errors
        }
    }

    static info(...args: any[]) {
        try {
            console.info(...args);
        } catch (error) {
            // Ignore EIO or other stream errors
        }
    }
}

// Export convenience functions
export const safeLog = SafeLogger.log;
export const safeError = SafeLogger.error;
export const safeWarn = SafeLogger.warn;
export const safeInfo = SafeLogger.info;
