const STORAGE_KEY = 'playerVideoQuality';

export interface VideoQualityOption {
    id: string;
    /** Display label, e.g. "1080p - 10 Mbps". The "auto" option is translated in the UI instead. */
    label: string;
    maxWidth: number;
    maxHeight: number;
    videoBitrate: number;
}

export const AUTO_QUALITY_ID = 'auto';

export const VIDEO_QUALITY_OPTIONS: VideoQualityOption[] = [
    {
        id: AUTO_QUALITY_ID,
        label: 'Auto',
        maxWidth: 3840,
        maxHeight: 2160,
        videoBitrate: 80_000_000,
    },
    {
        id: '4k-40',
        label: '4K - 40 Mbps',
        maxWidth: 3840,
        maxHeight: 2160,
        videoBitrate: 40_000_000,
    },
    {
        id: '1080p-20',
        label: '1080p - 20 Mbps',
        maxWidth: 1920,
        maxHeight: 1080,
        videoBitrate: 20_000_000,
    },
    {
        id: '1080p-10',
        label: '1080p - 10 Mbps',
        maxWidth: 1920,
        maxHeight: 1080,
        videoBitrate: 10_000_000,
    },
    {
        id: '720p-8',
        label: '720p - 8 Mbps',
        maxWidth: 1280,
        maxHeight: 720,
        videoBitrate: 8_000_000,
    },
    {
        id: '720p-4',
        label: '720p - 4 Mbps',
        maxWidth: 1280,
        maxHeight: 720,
        videoBitrate: 4_000_000,
    },
    {
        id: '480p-3',
        label: '480p - 3 Mbps',
        maxWidth: 854,
        maxHeight: 480,
        videoBitrate: 3_000_000,
    },
    {
        id: '480p-1.5',
        label: '480p - 1.5 Mbps',
        maxWidth: 854,
        maxHeight: 480,
        videoBitrate: 1_500_000,
    },
    {
        id: '360p-0.7',
        label: '360p - 720 kbps',
        maxWidth: 640,
        maxHeight: 360,
        videoBitrate: 720_000,
    },
];

export function getVideoQualityOption(id: string | null): VideoQualityOption {
    return VIDEO_QUALITY_OPTIONS.find((option) => option.id === id) ?? VIDEO_QUALITY_OPTIONS[0];
}

export function getStoredVideoQualityId(): string {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        // Fall back to auto if the stored id no longer matches a known option
        return getVideoQualityOption(stored).id;
    } catch {
        return AUTO_QUALITY_ID;
    }
}

export function setStoredVideoQualityId(id: string): void {
    try {
        localStorage.setItem(STORAGE_KEY, id);
    } catch {
        // Persisting the preference is best-effort; playback still works without it
    }
}
