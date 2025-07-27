import WebSocket from 'ws';
import { safeLog, safeError } from '../utils/logger';

export class WebSocketService {
    private static wss: WebSocket.Server | null = null;
    private static clients: Set<WebSocket> = new Set();

    static initialize(server: any) {
        this.wss = new WebSocket.Server({ server });
        
        this.wss.on('connection', (ws: WebSocket) => {
            safeLog('🔌 New WebSocket client connected');
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
                safeLog('🔌 WebSocket client disconnected');
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                safeError('WebSocket error:', error);
                this.clients.delete(ws);
            });

            // Send heartbeat every 30 seconds
            const heartbeat = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    this.sendToClient(ws, {
                        type: 'heartbeat',
                        data: { timestamp: new Date().toISOString() }
                    });
                } else {
                    clearInterval(heartbeat);
                }
            }, 30000);
        });

        safeLog('🚀 WebSocket server initialized for real-time updates');
    }

    static broadcastToAll(message: any) {
        if (this.clients.size === 0) {
            return; // No clients connected
        }

        const payload = JSON.stringify(message);
        let sentCount = 0;

        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(payload);
                    sentCount++;
                } catch (error) {
                    safeError('Failed to send WebSocket message to client:', error);
                    this.clients.delete(client);
                }
            } else {
                this.clients.delete(client);
            }
        });

        if (sentCount > 0) {
            safeLog(`📡 Broadcasted real-time update to ${sentCount} client(s)`);
        }
    }

    static sendToClient(client: WebSocket, message: any) {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(message));
            } catch (error) {
                safeError('Failed to send WebSocket message:', error);
                this.clients.delete(client);
            }
        }
    }

    // Real-time event types
    static broadcastSheetChange(data: {
        sheetId: string;
        sheetTitle: string;
        changeType: string;
        timestamp: string;
        jobId?: string;
    }) {
        this.broadcastToAll({
            type: 'sheet_change_detected',
            data: {
                ...data,
                message: `📊 Change detected in "${data.sheetTitle}"`
            }
        });
    }

    static broadcastJobUpdate(data: {
        jobId: string;
        status: 'started' | 'checking' | 'change_detected' | 'notification_sent' | 'error';
        message: string;
        timestamp: string;
        platform?: 'slack' | 'teams';
        sheetTitle?: string;
    }) {
        this.broadcastToAll({
            type: 'job_update',
            data: {
                ...data,
                icon: data.platform === 'slack' ? '💬' : data.platform === 'teams' ? '💼' : '📊'
            }
        });
    }

    static broadcastNotificationSent(data: {
        jobId: string;
        platform: 'slack' | 'teams';
        sheetTitle: string;
        timestamp: string;
        success: boolean;
        error?: string;
    }) {
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

    static broadcastSystemStatus(data: {
        type: 'info' | 'warning' | 'error' | 'success';
        message: string;
        timestamp: string;
        details?: any;
    }) {
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

    static getClientCount(): number {
        return this.clients.size;
    }
}
