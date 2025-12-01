import { useState, useEffect } from 'react';

interface WebSocketResult {
  connected: boolean;
  documentUpdates: any;
  userUpdates: any;
}

export const useSafeWebSocket = (userId: string): WebSocketResult => {
  const [connected, setConnected] = useState(false);
  const [documentUpdates, setDocumentUpdates] = useState<any>(null);
  const [userUpdates, setUserUpdates] = useState<any>(null);

  useEffect(() => {
    // Only try to connect WebSocket in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Dynamically import the WebSocket hook to avoid SSR issues
      import('../hooks/websocket').then(({ useWebSocket }) => {
        try {
          const ws = useWebSocket(userId);
          setConnected(ws.connected);
          setDocumentUpdates(ws.documentUpdates);
          setUserUpdates(ws.userUpdates);
        } catch (err) {
          console.warn('WebSocket connection failed:', err);
        }
      }).catch(err => {
        console.warn('WebSocket module not available:', err);
      });
    } catch (err) {
      console.warn('Failed to initialize WebSocket:', err);
    }
  }, [userId]);

  return { connected, documentUpdates, userUpdates };
};