import { useEffect } from 'react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';

interface UseVideoMediaSessionOptions {
    item: BaseItemDto;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    onPlay: () => void;
    onPause: () => void;
    onSeekBackward: () => void;
    onSeekForward: () => void;
    onSeekTo?: (time: number) => void;
    onNextTrack?: () => void;
    onPreviousTrack?: () => void;
}

/**
 * Wires the video player into the OS-level Media Session so the lock screen,
 * Control Center / notification shade and media keys show artwork + transport
 * controls (play/pause, ±10s, next/previous) and a live scrubber.
 */
export function useVideoMediaSession({
    item,
    isPlaying,
    currentTime,
    duration,
    onPlay,
    onPause,
    onSeekBackward,
    onSeekForward,
    onSeekTo,
    onNextTrack,
    onPreviousTrack,
}: UseVideoMediaSessionOptions) {
    const itemId = item.Id;
    const artworkSource = item.Type === 'Episode' && item.SeriesId ? item.SeriesId : itemId || '';

    // Metadata — refreshes whenever the playing item changes
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        const title =
            item.Type === 'Episode'
                ? `${item.IndexNumber ? `${item.IndexNumber}. ` : ''}${item.Name ?? ''}`
                : item.Name || 'Palcia';
        const artist =
            item.Type === 'Episode'
                ? item.SeriesName ||
                  `S${item.ParentIndexNumber ?? '?'} · E${item.IndexNumber ?? '?'}`
                : 'Palcia';
        const album = item.Type === 'Episode' ? item.SeriesName || '' : '';

        const artwork = artworkSource
            ? [256, 384, 512].map((size) => ({
                  src: getPrimaryImageUrl(artworkSource, { width: size, height: size }),
                  sizes: `${size}x${size}`,
                  type: 'image/jpeg',
              }))
            : [];

        try {
            navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album, artwork });
        } catch {
            // MediaMetadata not constructable on this platform — ignore
        }

        return () => {
            if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
        };
    }, [itemId, artworkSource, item]);

    // Action handlers
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        const ms = navigator.mediaSession;

        const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
            try {
                ms.setActionHandler(action, handler);
            } catch {
                // Unsupported action on this platform — ignore
            }
        };

        set('play', onPlay);
        set('pause', onPause);
        set('seekbackward', onSeekBackward);
        set('seekforward', onSeekForward);
        set(
            'seekto',
            onSeekTo
                ? (details) => {
                      if (details.seekTime != null) onSeekTo(details.seekTime);
                  }
                : null
        );
        set('previoustrack', onPreviousTrack ?? null);
        set('nexttrack', onNextTrack ?? null);

        return () => {
            (
                [
                    'play',
                    'pause',
                    'seekbackward',
                    'seekforward',
                    'seekto',
                    'previoustrack',
                    'nexttrack',
                ] as MediaSessionAction[]
            ).forEach((a) => set(a, null));
        };
    }, [onPlay, onPause, onSeekBackward, onSeekForward, onSeekTo, onNextTrack, onPreviousTrack]);

    // Playback state
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }, [isPlaying]);

    // Position state (scrubber)
    useEffect(() => {
        if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) {
            return;
        }
        if (!duration || !Number.isFinite(duration) || duration <= 0) return;
        try {
            navigator.mediaSession.setPositionState({
                duration,
                position: Math.min(Math.max(0, currentTime), duration),
                playbackRate: 1,
            });
        } catch {
            // Invalid values mid-seek — ignore
        }
    }, [currentTime, duration]);
}
