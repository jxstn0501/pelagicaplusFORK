import { useEffect, useRef } from 'react';

type WakeLockSentinelLike = {
    released: boolean;
    release: () => Promise<void>;
    addEventListener: (type: 'release', listener: () => void) => void;
};

/**
 * Keeps the screen awake while `active` is true using the Screen Wake Lock API.
 * Automatically re-acquires the lock when the tab becomes visible again (the OS
 * releases it on tab switch / lock). No-ops on platforms without support.
 */
export function useWakeLock(active: boolean) {
    const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

    useEffect(() => {
        const wakeLock = (
            navigator as Navigator & {
                wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
            }
        ).wakeLock;
        if (!wakeLock) return;

        let cancelled = false;

        const acquire = async () => {
            if (!active || document.visibilityState !== 'visible') return;
            if (sentinelRef.current && !sentinelRef.current.released) return;
            try {
                const sentinel = await wakeLock.request('screen');
                if (cancelled) {
                    void sentinel.release();
                    return;
                }
                sentinelRef.current = sentinel;
                sentinel.addEventListener('release', () => {
                    if (sentinelRef.current === sentinel) sentinelRef.current = null;
                });
            } catch {
                // Request can reject (e.g. low battery) — safe to ignore
            }
        };

        const release = () => {
            const sentinel = sentinelRef.current;
            sentinelRef.current = null;
            if (sentinel && !sentinel.released) void sentinel.release();
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && active) void acquire();
        };

        if (active) void acquire();
        else release();

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', handleVisibility);
            release();
        };
    }, [active]);
}
