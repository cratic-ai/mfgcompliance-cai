import { useState, useEffect, useRef } from 'react';

interface WebSocketResult {
  connected: boolean;
  documentUpdates: any;
  userUpdates: any;
}

export const useWebSocket = (userId: string): WebSocketResult => {
  const [connected, setConnected] = useState(false);
  const [documentUpdates, setDocumentUpdates] = useState<any>(null);
  const [userUpdates, setUserUpdates] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Don't run on server-side or if WebSocket is not available
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      console.warn('WebSocket not available in this environment');
      return;
    }

    // Get WebSocket URL - if not set, skip WebSocket
    const wsUrl = import.meta.env.VITE_WS_URL;
    if (!wsUrl) {
      console.warn('WebSocket URL not configured, skipping live updates');
      return;
    }

    try {
      const ws = new WebSocket(`${wsUrl}/ws?userId=${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'document-update') {
            setDocumentUpdates(data);
          } else if (data.type === 'user-update') {
            setUserUpdates(data);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.warn('WebSocket error:', error);
        setConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
      };

      return () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
      };
    } catch (err) {
      console.warn('Failed to create WebSocket connection:', err);
      setConnected(false);
    }
  }, [userId]);

  return { connected, documentUpdates, userUpdates };
};