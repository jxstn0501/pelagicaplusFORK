import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useJellyfinWebSocket } from '@/hooks/useJellyfinWebSocket';
import { sharedPlayerRef } from '@/utils/sharedPlayerRef';
import { getApi } from '@/api/getApi';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api/session-api';
import { getAccessToken } from '@/utils/localstorageCredentials';
import { GeneralCommandType, MediaType } from '@jellyfin/sdk/lib/generated-client/models';

const ALL_COMMANDS = Object.values(GeneralCommandType);

function reportCapabilities() {
    const token = getAccessToken();
    if (!token) return;
    try {
        const api = getApi();
        const sessionApi = getSessionApi(api);
        sessionApi.postFullCapabilities({
            clientCapabilitiesDto: {
                PlayableMediaTypes: [MediaType.Video, MediaType.Audio],
                SupportedCommands: ALL_COMMANDS,
                SupportsMediaControl: true,
                SupportsPersistentIdentifier: true,
            },
        }).catch(() => {});
    } catch {
        // not authenticated yet
    }
}

export function AppJellyfinSocket() {
    const navigate = useNavigate();

    // Report capabilities so Jellyfin knows this session accepts remote control.
    // Retry every 3 s until authenticated (covers late logins).
    useEffect(() => {
        let cancelled = false;

        function tryReport() {
            if (cancelled) return;
            if (getAccessToken()) {
                reportCapabilities();
                return;
            }
            setTimeout(tryReport, 3000);
        }

        tryReport();
        return () => { cancelled = true; };
    }, []);

    const handlePlaystateCommand = useCallback((command: string, seekPositionTicks?: number) => {
        const p = sharedPlayerRef.current;
        if (!p || p.isDisposed?.()) return;
        switch (command) {
            case 'PlayPause':
                if (p.paused()) { void p.play(); } else { p.pause(); }
                break;
            case 'Unpause':
                void p.play();
                break;
            case 'Pause':
                p.pause();
                break;
            case 'Stop':
                p.pause();
                navigate(-1);
                break;
            case 'Seek':
                if (seekPositionTicks !== undefined) {
                    p.currentTime(seekPositionTicks / 10000000);
                }
                break;
        }
    }, [navigate]);

    const handlePlayCommand = useCallback((itemIds: string[]) => {
        if (itemIds.length === 0) return;
        navigate(`/play/${itemIds[0]}`);
    }, [navigate]);

    useJellyfinWebSocket({
        onPlaystateCommand: handlePlaystateCommand,
        onPlayCommand: handlePlayCommand,
        onConnected: reportCapabilities,
    });

    return null;
}
