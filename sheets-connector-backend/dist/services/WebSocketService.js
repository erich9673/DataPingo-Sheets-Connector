"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const ws_1 = __importDefault(require("ws"));
const logger_1 = require("../utils/logger");
class WebSocketService {
    static initialize(server) {
        this.wss = new ws_1.default.Server({ server });
        this.wss.on('connection', (ws) => {
            (0, logger_1.safeLog)('🔌 New WebSocket client connected');
            this.clients.add(ws);
            // Send initial connection confirmation
            this.sendToClient(ws, {
                type: 'connection',
                data: {
                    status: 'connected',
                    message: 'Real-time updates enabled',
                    timestamp: new Date().toISOString()
                }
            });
            ws.on('close', () => {
                (0, logger_1.safeLog)('🔌 WebSocket client disconnected');
                this.clients.delete(ws);
            });
            ws.on('error', (error) => {
                (0, logger_1.safeError)('WebSocket error:', error);
                this.clients.delete(ws);
            });
            // Send heartbeat every 30 seconds
            const heartbeat = setInterval(() => {
                if (ws.readyState === ws_1.default.OPEN) {
                    this.sendToClient(ws, {
                        type: 'heartbeat',
                        data: { timestamp: new Date().toISOString() }
                    });
                }
                else {
                    clearInterval(heartbeat);
                }
            }, 30000);
        });
        (0, logger_1.safeLog)('🚀 WebSocket server initialized for real-time updates');
    }
    static broadcastToAll(message) {
        if (this.clients.size === 0) {
            return; // No clients connected
        }
        const payload = JSON.stringify(message);
        let sentCount = 0;
        this.clients.forEach((client) => {
            if (client.readyState === ws_1.default.OPEN) {
                try {
                    client.send(payload);
                    sentCount++;
                }
                catch (error) {
                    (0, logger_1.safeError)('Failed to send WebSocket message to client:', error);
                    this.clients.delete(client);
                }
            }
            else {
                this.clients.delete(client);
            }
        });
        if (sentCount > 0) {
            (0, logger_1.safeLog)(`📡 Broadcasted real-time update to ${sentCount} client(s)`);
        }
    }
    static sendToClient(client, message) {
        if (client.readyState === ws_1.default.OPEN) {
            try {
                client.send(JSON.stringify(message));
            }
            catch (error) {
                (0, logger_1.safeError)('Failed to send WebSocket message:', error);
                this.clients.delete(client);
            }
        }
    }
    // Real-time event types
    static broadcastSheetChange(data) {
        this.broadcastToAll({
            type: 'sheet_change_detected',
            data: {
                ...data,
                message: `📊 Change detected in "${data.sheetTitle}"`
            }
        });
    }
    static broadcastJobUpdate(data) {
        this.broadcastToAll({
            type: 'job_update',
            data: {
                ...data,
                icon: data.platform === 'slack' ? '💬' : data.platform === 'teams' ? '💼' : '📊'
            }
        });
    }
    static broadcastNotificationSent(data) {
        this.broadcastToAll({
            type: 'notification_sent',
            data: {
                ...data,
                message: data.success
                    ? `✅ ${data.platform === 'slack' ? 'Slack' : 'Teams'} notification sent for "${data.sheetTitle}"`
                    : `❌ Failed to send ${data.platform === 'slack' ? 'Slack' : 'Teams'} notification: ${data.error}`,
                icon: data.platform === 'slack' ? '💬' : '💼'
            }
        });
    }
    static broadcastSystemStatus(data) {
        this.broadcastToAll({
            type: 'system_status',
            data: {
                ...data,
                icon: data.type === 'success' ? '✅' :
                    data.type === 'warning' ? '⚠️' :
                        data.type === 'error' ? '❌' : 'ℹ️'
            }
        });
    }
    static getClientCount() {
        return this.clients.size;
    }
}
exports.WebSocketService = WebSocketService;
WebSocketService.wss = null;
WebSocketService.clients = new Set();
