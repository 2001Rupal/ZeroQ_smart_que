'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function getSocketUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1' && (process.env.NEXT_PUBLIC_SOCKET_URL?.includes('localhost') || !process.env.NEXT_PUBLIC_SOCKET_URL)) {
      return `http://${host}:5000`;
    }
  }
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
}

interface UseSocketOptions {
  storeId?: string;
  tokenUuid?: string;
  onQueueStateChanged?: (state: any) => void;
  onTicketUpdated?: (ticket: any) => void;
  onTokenCalled?: (event: any) => void;
}

export function useSocket({
  storeId,
  tokenUuid,
  onQueueStateChanged,
  onTicketUpdated,
  onTokenCalled
}: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      if (storeId) {
        socket.emit('join_store', storeId);
      }
      if (tokenUuid) {
        socket.emit('join_token', tokenUuid);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    if (onQueueStateChanged) {
      socket.on('QUEUE_STATE_CHANGED', onQueueStateChanged);
    }

    if (onTicketUpdated) {
      socket.on('TICKET_UPDATED', onTicketUpdated);
    }

    if (onTokenCalled) {
      socket.on('TOKEN_CALLED', onTokenCalled);
    }

    return () => {
      socket.disconnect();
    };
  }, [storeId, tokenUuid]);

  // Handle re-emitting join if storeId or tokenUuid changes dynamically
  useEffect(() => {
    if (socketRef.current && isConnected) {
      if (storeId) socketRef.current.emit('join_store', storeId);
      if (tokenUuid) socketRef.current.emit('join_token', tokenUuid);
    }
  }, [storeId, tokenUuid, isConnected]);

  return { socket: socketRef.current, isConnected };
}
