// hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface DocumentStatusUpdate {
  documentId: string;
  status: string;
  progress?: number;
  message?: string;
  error?: string;
  documentName?: string;
  timestamp: string;
}

interface UserDocumentsUpdate {
  userId: string;
  type: 'document-ready' | 'document-failed' | 'document-deleted';
  documentId: string;
  documentName?: string;
  error?: string;
  timestamp: string;
}

export const useWebSocket = (userId: string | null) => {
  const [connected, setConnected] = useState(false);
  const [documentUpdates, setDocumentUpdates] = useState<DocumentStatusUpdate | null>(null);
  const [userUpdates, setUserUpdates] = useState<UserDocumentsUpdate | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
      socket.emit('subscribe-user', userId);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setConnected(false);
    });

    socket.on('document-status', (data: DocumentStatusUpdate) => {
      console.log('📡 Document status update:', data);
      setDocumentUpdates(data);
    });

    socket.on('user-documents-update', (data: UserDocumentsUpdate) => {
      console.log('📡 User documents update:', data);
      setUserUpdates(data);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        socket.emit('unsubscribe-user', userId);
        socket.close();
      }
    };
  }, [userId]);

  const subscribeToDocument = (documentId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('subscribe-document', documentId);
    }
  };

  const unsubscribeFromDocument = (documentId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe-document', documentId);
    }
  };

  return {
    connected,
    documentUpdates,
    userUpdates,
    subscribeToDocument,
    unsubscribeFromDocument,
  };
};