"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeInfo = exports.safeWarn = exports.safeError = exports.safeLog = exports.SafeLogger = void 0;
/**
 * Safe logging utility to prevent EIO errors when terminal/stdout is unavailable
 */
class SafeLogger {
    static log(...args) {
        try {
            console.log(...args);
        }
        catch (error) {
            // Ignore EIO or other stream errors to prevent app crashes
            // Could optionally write to a file or use alternative logging here
        }
    }
    static error(...args) {
        try {
            console.error(...args);
        }
        catch (error) {
            // Ignore EIO or other stream errors
        }
    }
    static warn(...args) {
        try {
            console.warn(...args);
        }
        catch (error) {
            // Ignore EIO or other stream errors
        }
    }
    static info(...args) {
        try {
            console.info(...args);
        }
        catch (error) {
            // Ignore EIO or other stream errors
        }
    }
}
exports.SafeLogger = SafeLogger;
// Export convenience functions
exports.safeLog = SafeLogger.log;
exports.safeError = SafeLogger.error;
exports.safeWarn = SafeLogger.warn;
exports.safeInfo = SafeLogger.info;
