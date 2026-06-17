import { useEffect, useRef } from 'react';
import { getServerUrl, getAccessToken } from '@/utils/localstorageCredentials';
import { getDeviceId } from '@/utils/deviceId';

interface PlaystateData {
    Command: string;
    SeekPositionTicks?: number;
}

interface PlayData {
    ItemIds: string[];
    StartPositionTicks?: number;
    PlayCommand?: string;
}

interface JellyfinMessage {
    MessageType: string;
    Data?: PlaystateData | PlayData | unknown;
}

interface UseJellyfinWebSocketOptions {
    onPlaystateCommand?: (command: string, seekPositionTicks?: number) => void;
    onPlayCommand?: (itemIds: string[], startPositionTicks?: number) => void;
}

export function useJellyfinWebSocket({
    onPlaystateCommand,
    onPlayCommand,
}: UseJellyfinWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let destroyed = false;

        function connect() {
            const serverUrl = getServerUrl();
            const token = getAccessToken();
            const deviceId = getDeviceId();

            if (!serverUrl || !token) return;

            const wsUrl = serverUrl
                .replace(/^https/, 'wss')
                .replace(/^http/, 'ws');

            const url = `${wsUrl}/socket?api_key=${token}&deviceId=${deviceId}`;

            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                if (keepAliveRef.current) clearInterval(keepAliveRef.current);
                keepAliveRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ MessageType: 'KeepAlive' }));
                    }
                }, 30000);
            };

            ws.onmessage = (event: MessageEvent) => {
                try {
                    const msg: JellyfinMessage = JSON.parse(event.data as string);

                    if (msg.MessageType === 'Playstate') {
                        const data = msg.Data as PlaystateData;
                        onPlaystateCommand?.(data.Command, data.SeekPositionTicks);
                    } else if (msg.MessageType === 'Play') {
                        const data = msg.Data as PlayData;
                        if (data.ItemIds?.length > 0) {
                            onPlayCommand?.(data.ItemIds, data.StartPositionTicks);
                        }
                    }
                } catch {
                    // ignore malformed messages
                }
            };

            ws.onclose = () => {
                if (keepAliveRef.current) clearInterval(keepAliveRef.current);
                if (!destroyed) {
                    reconnectTimeoutRef.current = setTimeout(connect, 5000);
                }
            };

            ws.onerror = () => {
                ws.close();
            };
        }

        connect();

        return () => {
            destroyed = true;
            if (keepAliveRef.current) clearInterval(keepAliveRef.current);
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            wsRef.current?.close();
        };
    }, [onPlaystateCommand, onPlayCommand]);
}
