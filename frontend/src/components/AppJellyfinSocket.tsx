import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useJellyfinWebSocket } from '@/hooks/useJellyfinWebSocket';
import { sharedPlayerRef } from '@/utils/sharedPlayerRef';

export function AppJellyfinSocket() {
    const navigate = useNavigate();

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
    });

    return null;
}
