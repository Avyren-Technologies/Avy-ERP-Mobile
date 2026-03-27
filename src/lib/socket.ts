import { io, Socket } from 'socket.io-client';
import Env from 'env';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        const apiUrl = Env.EXPO_PUBLIC_API_URL || 'https://avy-erp-api.avyren.in';
        const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '');
        socket = io(baseUrl, {
            transports: ['websocket', 'polling'],
            autoConnect: false,
        });
    }
    return socket;
}

export function connectSocket() {
    const s = getSocket();
    if (!s.connected) s.connect();
    return s;
}

export function disconnectSocket() {
    socket?.disconnect();
}
