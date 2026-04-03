import { io, Socket } from 'socket.io-client';
import Env from 'env';
import { getToken } from '@/lib/auth/utils';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        const apiUrl = Env.EXPO_PUBLIC_API_URL
            || 'https://avy-erp-api.avyrentechnologies.com/api/v1';
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
    // Attach auth token before connecting
    const tokenData = getToken();
    if (tokenData?.access) {
        s.auth = { token: tokenData.access };
    }
    if (!s.connected) s.connect();
    return s;
}

export function disconnectSocket() {
    socket?.disconnect();
}
