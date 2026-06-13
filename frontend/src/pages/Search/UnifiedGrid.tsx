import { Skeleton } from '@/components/ui/skeleton';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { ImageOff, Film, Tv, Music, User, Star } from 'lucide-react';
import { useState, useRef } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import WatchedStateBadge from '@/components/WatchedStateBadge';
import { useConfig } from '@/hooks/api/useConfig';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';

interface UnifiedGridProps {
    items: BaseItemDto[];
}

const TYPE_INFO: Partial<Record<string, { icon: typeof Film; label: string }>> = {
    Movie: { icon: Film, label: 'Film' },
    Series: { icon: Tv, label: 'Serie' },
    Episode: { icon: Tv, label: 'Episode' },
    MusicAlbum: { icon: Music, label: 'Musik' },
    Person: { icon: User, label: 'Person' },
};

const UnifiedItem = ({ item }: { item: BaseItemDto }) => {
    const { config } = useConfig();
    const { loadQueue } = useMusicPlayback();
    const [posterError, setPosterError] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const imageId = item.Type === 'Audio' && item.AlbumId ? item.AlbumId : item.Id || '';
    const imageTag = item.Type === 'Audio' && item.AlbumId ? undefined : item.ImageTags?.Primary;
    const posterUrl = getPrimaryImageUrl(imageId, undefined, imageTag);

    const typeInfo = TYPE_INFO[item.Type || ''];
    const TypeIcon = typeInfo?.icon;
    const isPerson = item.Type === 'Person';
    const href = isPerson ? `/person/${item.Id}` : `/item/${item.Id}`;

    const handleMouseEnter = () => {
        hoverTimer.current = setTimeout(() => setShowOverlay(true), 400);
    };
    const handleMouseLeave = () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setShowOverlay(false);
    };

    const handleClick = (e: React.MouseEvent) => {
        if (item.Type === 'Audio') {
            e.preventDefault();
            loadQueue(
                [
                    {
                        id: item.Id || '',
                        title: item.Name || '',
                        artist: item.AlbumArtist || (item.Artists && item.Artists[0]) || 'Unknown',
                        albumId: item.AlbumId || '',
                        albumName: item.Album || '',
                    },
                ],
                0,
                true
            );
        }
    };

    return (
        <Link
            to={href}
            className="relative group block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            <div
                className={cn(
                    'relative w-full overflow-hidden',
                    isPerson ? 'aspect-square rounded-full' : 'aspect-[2/3] rounded-lg'
                )}
            >
                {!posterError ? (
                    <>
                        <img
                            src={`${posterUrl}&maxWidth=400&maxHeight=600&quality=85`}
                            alt={item.Name || ''}
                            className={cn(
                                'w-full h-full object-cover transition-all duration-300 z-10 poster-image',
                                isImageLoaded
                                    ? 'opacity-100 scale-100 blur-0'
                                    : 'opacity-40 scale-95 blur-md',
                                'group-hover:scale-105'
                            )}
                            loading="lazy"
                            onLoad={() => setIsImageLoaded(true)}
                            onError={() => setPosterError(true)}
                        />
                        <Skeleton className="absolute inset-0 -z-10" />
                        <div
                            className={cn(
                                'absolute inset-0 pointer-events-none poster-card-outline z-20',
                                isPerson ? 'rounded-full' : 'rounded-lg'
                            )}
                        />
                    </>
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ImageOff className="w-8 h-8 text-muted-foreground" />
                    </div>
                )}

                {/* Netflix-style hover overlay */}
                {showOverlay && !isPerson && (
                    <div className="absolute inset-0 z-30 bg-gradient-to-t from-black/95 via-black/50 to-transparent rounded-lg flex flex-col justify-end p-3 gap-1">
                        {item.CommunityRating != null && (
                            <div className="flex items-center gap-1 text-yellow-400 text-xs font-semibold">
                                <Star className="w-3 h-3 fill-yellow-400" />
                                {item.CommunityRating.toFixed(1)}
                            </div>
                        )}
                        {item.OfficialRating && (
                            <span className="text-[10px] border border-white/30 px-1 rounded w-fit text-white/60">
                                {item.OfficialRating}
                            </span>
                        )}
                        {item.Overview && (
                            <p className="text-white/80 text-xs line-clamp-3 leading-relaxed">
                                {item.Overview}
                            </p>
                        )}
                        {item.Genres && item.Genres.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {item.Genres.slice(0, 2).map((g) => (
                                    <span
                                        key={g}
                                        className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded-full text-white/70"
                                    >
                                        {g}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Type badge */}
                {TypeIcon && typeInfo && (
                    <div className="absolute top-2 left-2 z-40 flex items-center gap-1 bg-black/65 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white/85 font-medium">
                        <TypeIcon className="w-3 h-3" />
                        {typeInfo.label}
                    </div>
                )}

                <WatchedStateBadge item={item} show={config?.watchedStateBadgeSearch || false} />
            </div>

            <p className={cn('mt-2 text-sm font-medium line-clamp-1', isPerson && 'text-center')}>
                {item.Name || 'No Title'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {item.PremiereDate ? new Date(item.PremiereDate).getFullYear() : ''}
                {item.Type === 'Episode' && item.SeriesName ? ` · ${item.SeriesName}` : ''}
            </p>
        </Link>
    );
};

const UnifiedGrid = ({ items }: UnifiedGridProps) => (
    <div className="w-full gap-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
        {items.map((item) => (
            <UnifiedItem key={item.Id} item={item} />
        ))}
    </div>
);

export default UnifiedGrid;
