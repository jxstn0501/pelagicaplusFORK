import { Skeleton } from '@/components/ui/skeleton';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { ImageOff, Film, Tv, Star } from 'lucide-react';
import { useState, useRef } from 'react';
import { Link } from 'react-router';
import WatchedStateBadge from '@/components/WatchedStateBadge';
import { useConfig } from '@/hooks/api/useConfig';
import { cn } from '@/lib/utils';

interface MovieTvGridProps {
    items: BaseItemDto[];
}

const SearchPreview = ({ item }: { item: BaseItemDto }) => (
    <div className="absolute left-full top-0 ml-3 z-50 w-64 bg-background/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-2 pointer-events-none">
        <p className="font-semibold text-sm leading-tight">{item.Name}</p>
        <div className="flex items-center gap-2 text-xs text-white/50 flex-wrap">
            {item.PremiereDate && (
                <span>{new Date(item.PremiereDate).getFullYear()}</span>
            )}
            {item.OfficialRating && (
                <span className="border border-white/20 px-1 rounded">{item.OfficialRating}</span>
            )}
            {item.CommunityRating != null && (
                <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {item.CommunityRating.toFixed(1)}
                </span>
            )}
            {item.Type === 'Series' && item.ProductionYear && (
                <span className="flex items-center gap-1">
                    <Tv className="w-3 h-3" />
                    Serie
                </span>
            )}
        </div>
        {item.Genres && item.Genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
                {item.Genres.slice(0, 3).map((g) => (
                    <span key={g} className="text-[10px] bg-white/8 px-1.5 py-0.5 rounded-full text-white/70">
                        {g}
                    </span>
                ))}
            </div>
        )}
        {item.Overview && (
            <p className="text-xs text-white/60 line-clamp-3 leading-relaxed">
                {item.Overview}
            </p>
        )}
    </div>
);

const MovieTvItem = ({ item }: { item: BaseItemDto }) => {
    const { config } = useConfig();
    const [posterError, setPosterError] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const posterUrl = getPrimaryImageUrl(item.Id || '', undefined, item.ImageTags?.Primary);

    const handleMouseEnter = () => {
        hoverTimer.current = setTimeout(() => setShowPreview(true), 600);
    };
    const handleMouseLeave = () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setShowPreview(false);
    };

    return (
        <Link
            to={`/item/${item.Id}`}
            key={item.Id}
            className="p-0 m-0 relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="relative w-full aspect-[2/3] overflow-hidden rounded-md group">
                {!posterError ? (
                    <>
                        <img
                            key={item.Id}
                            src={`${posterUrl}&maxWidth=416&maxHeight=640&quality=85`}
                            alt={item.Name || 'No Title'}
                            className={cn(
                                'w-full h-full object-cover rounded-md transform-gpu will-change-transform z-10 poster-image',
                                isImageLoaded
                                    ? 'blur-0 opacity-100 scale-100'
                                    : 'blur-md opacity-40 scale-95',
                                isImageLoaded && 'group-hover:opacity-90 group-hover:scale-105'
                            )}
                            loading="lazy"
                            onLoad={() => setIsImageLoaded(true)}
                            onError={() => setPosterError(true)}
                        />
                        <Skeleton className="absolute bottom-0 left-0 right-0 top-0 -z-1" />
                        <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                    </>
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
                        <ImageOff className="text-4xl text-muted-foreground" />
                        <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                    </div>
                )}
                <WatchedStateBadge item={item} show={config?.watchedStateBadgeSearch || false} />
            </div>
            <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all">
                {item.Name || 'No Title'}
            </p>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                {item.Type === 'Movie' && <Film className="w-3.5 h-3.5 shrink-0" />}
                {item.Type === 'Series' && <Tv className="w-3.5 h-3.5 shrink-0" />}
                <span>{item.PremiereDate ? new Date(item.PremiereDate).getFullYear() : ''}</span>
            </div>

            {showPreview && (
                <SearchPreview item={item} />
            )}
        </Link>
    );
};

const MovieTvGrid = ({ items }: MovieTvGridProps) => (
    <div className="w-full gap-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9">
        {items.map((item) => (
            <MovieTvItem key={item.Id} item={item} />
        ))}
    </div>
);

export default MovieTvGrid;
