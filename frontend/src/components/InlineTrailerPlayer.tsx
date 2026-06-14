import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Button } from './ui/button';
import { Film, X } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

function extractYouTubeId(url: string): string | null {
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
        if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
    } catch {
        // not a valid URL
    }
    return null;
}

export const InlineTrailerPlayer = ({ item }: { item: BaseItemDto }) => {
    const [open, setOpen] = useState(false);

    if (!item.RemoteTrailers || item.RemoteTrailers.length === 0) return null;
    const firstTrailer = item.RemoteTrailers[0];
    if (!firstTrailer.Url) return null;

    const videoId = extractYouTubeId(firstTrailer.Url);

    return (
        <>
            <Button variant="outline" onClick={() => setOpen(true)}>
                <Film />
                Trailer
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden border border-white/10 bg-black gap-0">
                    <DialogTitle className="sr-only">{item.Name} – Trailer</DialogTitle>
                    <div className="flex items-center justify-between px-4 py-3 bg-black/80">
                        <span className="text-white text-sm font-medium truncate">
                            {item.Name} – Trailer
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/10 shrink-0"
                            onClick={() => setOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="aspect-video w-full bg-black">
                        {open && videoId ? (
                            <iframe
                                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                                className="w-full h-full"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                title={`${item.Name} Trailer`}
                            />
                        ) : open && !videoId ? (
                            <a
                                href={firstTrailer.Url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-full h-full text-white/60 text-sm gap-2 hover:text-white"
                            >
                                <Film className="w-5 h-5" />
                                Trailer auf YouTube öffnen
                            </a>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
