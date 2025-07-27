export interface WebSocketMessage {
  type: 'connection' | 'heartbeat' | 'sheet_change_detected' | 'job_update' | 'notification_sent' | 'system_status';
  data: any;
}

export interface JobUpdate {
  jobId: string;
  status: 'started' | 'checking' | 'change_detected' | 'notification_sent' | 'error';
  message: string;
  timestamp: string;
  platform?: 'slack' | 'teams';
  sheetTitle?: string;
  icon?: string;
}

export interface SheetChange {
  sheetId: string;
  sheetTitle: string;
  changeType: string;
  timestamp: string;
  jobId?: string;
  message?: string;
}

export interface NotificationSent {
  jobId: string;
  platform: 'slack' | 'teams';
  sheetTitle: string;
  timestamp: string;
  success: boolean;
  error?: string;
  message?: string;
  icon?: string;
}

export interface SystemStatus {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
  details?: any;
  icon?: string;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private isIntentionallyClosed = false;
  
  // Event handlers
  private onConnectionChange: ((connected: boolean) => void) | null = null;
  private onJobUpdate: ((update: JobUpdate) => void) | null = null;
  private onSheetChange: ((change: SheetChange) => void) | null = null;
  private onNotificationSent: ((notification: NotificationSent) => void) | null = null;
  private onSystemStatus: ((status: SystemStatus) => void) | null = null;

  constructor(
    private url: string = `ws://localhost:3001`
  ) {}

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    try {
      console.log('🔌 Connecting to WebSocket server...');
      this.ws = new WebSocket(this.url);
      this.isIntentionallyClosed = false;

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected - real-time updates enabled');
        this.reconnectAttempts = 0;
        this.onConnectionChange?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.onConnectionChange?.(false);
        
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    console.log('📡 WebSocket message received:', message.type, message.data);

    switch (message.type) {
      case 'connection':
        console.log('🔌 Connection confirmed:', message.data.message);
        break;

      case 'heartbeat':
        // Silent - just keep connection alive
        break;

      case 'job_update':
        this.onJobUpdate?.(message.data as JobUpdate);
        break;

      case 'sheet_change_detected':
        this.onSheetChange?.(message.data as SheetChange);
        break;

      case 'notification_sent':
        this.onNotificationSent?.(message.data as NotificationSent);
        break;

      case 'system_status':
        this.onSystemStatus?.(message.data as SystemStatus);
        break;

      default:
        console.log('🤷 Unknown WebSocket message type:', message.type);
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    console.log('🔌 WebSocket disconnected intentionally');
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Event handler setters
  setConnectionChangeHandler(handler: (connected: boolean) => void): void {
    this.onConnectionChange = handler;
  }

  setJobUpdateHandler(handler: (update: JobUpdate) => void): void {
    this.onJobUpdate = handler;
  }

  setSheetChangeHandler(handler: (change: SheetChange) => void): void {
    this.onSheetChange = handler;
  }

  setNotificationSentHandler(handler: (notification: NotificationSent) => void): void {
    this.onNotificationSent = handler;
  }

  setSystemStatusHandler(handler: (status: SystemStatus) => void): void {
    this.onSystemStatus = handler;
  }
}
