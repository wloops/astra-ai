import { API_BASE_URL } from "./client";
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

export interface SessionEventSubscription {
  close: () => void;
}

export function subscribeToSessionEvents(
  sessionId: string,
  handlers: {
    onEvent: (event: SessionEvent) => void;
    onError?: (error: Event) => void;
  },
): SessionEventSubscription {
  const source = new EventSource(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/events`);

  const handleMessage = (message: MessageEvent<string>) => {
    try {
      handlers.onEvent(JSON.parse(message.data) as SessionEvent);
    } catch {
      // SSE 流属于演示闭环的关键路径，单条异常事件不应中断后续事件消费。
    }
  };

  SESSION_EVENT_TYPES.forEach((type) => source.addEventListener(type, handleMessage));
  source.onerror = (error) => handlers.onError?.(error);

  return {
    close: () => source.close(),
  };
}
