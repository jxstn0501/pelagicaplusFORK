import { useEffect, useState } from 'react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';

interface BackdropTrailerProps {
    item: BaseItemDto;
    /** Delay before the trailer fades in, ms */
    delay?: number;
}

/**
 * Extracts a YouTube video id from a RemoteTrailer URL. Returns null for
 * non-YouTube URLs so we can fall back to the static backdrop.
 */
function extractYouTubeId(url?: string | null): string | null {
    if (!url) return null;
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '');
        if (host === 'youtu.be') return u.pathname.slice(1) || null;
        if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
            if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
            return u.searchParams.get('v');
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Netflix-style auto-playing trailer preview over the detail-page backdrop.
 * Uses a muted YouTube embed (no API key required) and gracefully renders
 * nothing when the title has no embeddable trailer. Layered behind the page
 * content; only its mute / close controls are interactive.
 */
const BackdropTrailer = ({ item, delay = 6000 }: BackdropTrailerProps) => {
    const videoId = (() => {
        for (const trailer of item.RemoteTrailers ?? []) {
            const id = extractYouTubeId(trailer.Url);
            if (id) return id;
        }
        return null;
    })();

    const [started, setStarted] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Arm the fade-in timer. The parent remounts this component per item (via
    // `key`), so state starts fresh and the effect only schedules the timer.
    useEffect(() => {
        if (!videoId) return;
        const timer = setTimeout(() => setStarted(true), delay);
        return () => clearTimeout(timer);
    }, [videoId, delay]);

    if (!videoId) return null;

    const src =
        `https://www.youtube-nocookie.com/embed/${videoId}` +
        `?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}` +
        `&playsinline=1&modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3`;

    return (
        <>
            {/* The video itself — non-interactive, cropped to fill like a backdrop */}
            <div
                className={`absolute inset-0 overflow-hidden transition-opacity duration-1000 ${
                    started && loaded ? 'opacity-100' : 'opacity-0'
                }`}
            >
                <iframe
                    key={src}
                    title="Trailer"
                    src={src}
                    onLoad={() => setLoaded(true)}
                    allow="autoplay; encrypted-media"
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{
                        width: '177.78vh' /* 16:9 relative to height to avoid pillarboxing */,
                        minWidth: '100%',
                        height: '56.25vw',
                        minHeight: '100%',
                        border: 0,
                    }}
                />
            </div>
        </>
    );
};

export default BackdropTrailer;
