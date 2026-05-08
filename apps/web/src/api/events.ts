import { API_BASE_URL, API_KEY, getAuthToken } from "./client";
import type { SessionEvent, SessionEventType } from "./types";

const SESSION_EVENT_TYPES: SessionEventType[] = [
  "session_started",
  "stage_started",
  "agent_message",
  "conflict_detected",
  "tool_event",
  "stage_completed",
  "session_completed",
  "session_failed",
];

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];
const HEARTBEAT_INTERVAL = 30_000;

export interface SessionEventSubscription {
  close: () => void;
}

export interface SubscribeCallbacks {
  onEvent: (event: SessionEvent) => void;
  onError?: (message: string) => void;
  onReconnecting?: (attempt: number, maxRetries: number) => void;
  onReconnected?: () => void;
  onHeartbeatTimeout?: () => void;
  onHeartbeatRestored?: () => void;
  onMaxRetriesExceeded?: () => void;
  /** 返回 true 表示继续重连；Session 已完成/失败时应返回 false。 */
  shouldReconnect?: () => boolean;
}

/**
 * 创建 SSE 订阅，支持指数退避重连和心跳检测。
 * 服务端会按 sequence 回放事件，因此重连后由调用方按 event.id 去重。
 */
export function subscribeToSessionEvents(
  sessionId: string,
  callbacks: SubscribeCallbacks,
): SessionEventSubscription {
  let retryCount = 0;
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let source: EventSource | null = null;
  let closed = false;

  function clearHeartbeat() {
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function resetHeartbeat() {
    clearHeartbeat();
    heartbeatTimer = setTimeout(() => {
      callbacks.onHeartbeatTimeout?.();
    }, HEARTBEAT_INTERVAL);
  }

  function closeSource() {
    source?.close();
    source = null;
  }

  function connect() {
    if (closed) return;

    const url = new URL(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/events`);
    const token = getAuthToken();
    if (token) {
      url.searchParams.set("token", token);
    } else if (API_KEY) {
      url.searchParams.set("api_key", API_KEY);
    }
    source = new EventSource(url.toString());

    source.onopen = () => {
      if (retryCount > 0) {
        callbacks.onReconnected?.();
        retryCount = 0;
      }
      resetHeartbeat();
    };

    const handleMessage = (message: MessageEvent<string>) => {
      try {
        const event = JSON.parse(message.data) as SessionEvent;
        callbacks.onEvent(event);
        callbacks.onHeartbeatRestored?.();
        resetHeartbeat();
      } catch (error) {
        // 单条坏事件不应中断 SSE 连接，但要暴露给页面方便定位协议问题。
        callbacks.onError?.(error instanceof Error ? error.message : "解析 SSE 事件失败");
      }
    };

    SESSION_EVENT_TYPES.forEach((type) => source?.addEventListener(type, handleMessage));

    source.onerror = () => {
      clearHeartbeat();
      closeSource();

      if (closed) return;

      // 已收到终态事件后，服务端正常关闭 SSE 不是连接故障。
      if (callbacks.shouldReconnect && !callbacks.shouldReconnect()) {
        return;
      }

      if (retryCount < MAX_RETRIES) {
        retryCount += 1;
        callbacks.onReconnecting?.(retryCount, MAX_RETRIES);

        const delay = RETRY_DELAYS[retryCount - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
        reconnectTimer = setTimeout(() => {
          connect();
        }, delay);
      } else {
        callbacks.onMaxRetriesExceeded?.();
      }
    };
  }

  connect();

  return {
    close: () => {
      closed = true;
      clearHeartbeat();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      closeSource();
    },
  };
}
