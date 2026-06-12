import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Link } from 'react-router';
import { Skeleton } from './ui/skeleton';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import { useConfig } from '@/hooks/api/useConfig';
import WatchedStateBadge from './WatchedStateBadge';
import { memo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import PosterPlayButton from './PosterPlayButton';
import WatchlistButton from './WatchlistButton';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';
import { getMatchScore, isNewRelease } from '@/utils/matchScore';
import { useTranslation } from 'react-i18next';

interface ScrollableSectionPosterProps {
    item?: BaseItemDto;
    posterUrl?: string;
    children?: React.ReactNode;
    itemName?: string;
    itemId?: string;
    className?: string;
    showPlayButton?: boolean;
    /** Show the Netflix-style hover overlay with quick actions and meta info */
    hoverPreview?: boolean;
}

const ScrollableSectionPoster = ({
    item,
    posterUrl,
    children,
    itemName,
    itemId,
    className,
    showPlayButton = false,
    hoverPreview = false,
}: ScrollableSectionPosterProps) => {
    const { t } = useTranslation('home');
    const { config } = useConfig();
    const { loadQueue } = useMusicPlayback();
    const [posterFailed, setPosterFailed] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    const isSquareType =
        item?.Type === 'Playlist' ||
        item?.Type === 'MusicAlbum' ||
        item?.Type === 'Audio' ||
        item?.Type === 'MusicArtist';
    const posterClasses = isSquareType
        ? 'w-36 h-36 lg:w-44 lg:h-44 2xl:w-52 2xl:h-52'
        : 'w-36 h-54 lg:w-44 lg:h-64 2xl:w-52 2xl:h-80';
    const minPosterClasses = isSquareType
        ? 'min-w-36 lg:min-w-44 2xl:min-w-52 min-h-36 lg:min-h-44 2xl:min-h-52'
        : 'min-w-36 lg:min-w-44 2xl:min-w-52 min-h-54 lg:min-h-64 2xl:min-h-80';
    const skeletonClasses = isSquareType ? 'h-36 lg:h-44 2xl:h-52' : 'h-54 lg:h-64 2xl:h-80';

    const primaryImageTag = item?.ImageTags?.Primary;
    const targetImageId =
        item?.Type === 'Audio' && item.AlbumId ? item.AlbumId : itemId || item?.Id || '';
    const targetImageTag = item?.Type === 'Audio' && item.AlbumId ? undefined : primaryImageTag;

    const handleClick = (e: React.MouseEvent) => {
        if (item?.Type === 'Audio') {
            e.preventDefault();
            loadQueue(
                [
                    {
                        id: itemId || item.Id || '',
                        title: itemName || item.Name || '',
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

    if (posterFailed) {
        return (
            <Link
                to={`/item/${itemId || item?.Id}`}
                key={itemId || item?.Id}
                className={cn('group block', className)}
                onClick={handleClick}
            >
                <div
                    className={`relative overflow-hidden rounded-md ${posterClasses} bg-muted flex items-center justify-center`}
                >
                    <ImageOff className="text-muted-foreground" size={32} />
                    <WatchedStateBadge
                        item={item}
                        show={config?.watchedStateBadgeHomeScreen || false}
                    />
                    <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                </div>
                <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all max-w-36 lg:max-w-44 2xl:max-w-52">
                    {itemName || item?.Name || ''}
                </p>
                {children}
            </Link>
        );
    }

    return (
        <Link
            to={`/item/${itemId || item?.Id}`}
            key={itemId || item?.Id}
            className={cn('group block', className)}
            onClick={handleClick}
            style={{ contain: 'layout style' }}
        >
            <div className={`relative overflow-hidden rounded-md ${posterClasses}`}>
                <img
                    key={itemId || item?.Id}
                    src={
                        posterUrl
                            ? posterUrl
                            : getPrimaryImageUrl(targetImageId, undefined, targetImageTag)
                    }
                    alt={itemName || item?.Name || ''}
                    className={cn(
                        minPosterClasses,
                        posterClasses,
                        'object-cover rounded-md transform-gpu will-change-transform z-10',
                        // Loading snap: no transition until image is ready, then hover effects are smooth
                        isImageLoaded
                            ? [
                                  'transition-[opacity,transform,scale] duration-[250ms] ease-out',
                                  'opacity-100 scale-100',
                                  'group-hover:opacity-90 group-hover:scale-105',
                              ].join(' ')
                            : // While loading: blurred/dim, NO transition (instant snap on load)
                              'opacity-40 scale-95 blur-sm'
                    )}
                    loading="lazy"
                    onLoad={() => setIsImageLoaded(true)}
                    onError={() => setPosterFailed(true)}
                />
                <Skeleton className={`absolute bottom-0 left-0 right-0 ${skeletonClasses} -z-1`} />
                <WatchedStateBadge
                    item={item}
                    show={config?.watchedStateBadgeHomeScreen || false}
                />

                <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />

                {/* "NEW" badge for recently added/released titles */}
                {hoverPreview && !isSquareType && isNewRelease(item) && (
                    <span className="absolute top-2 left-2 z-30 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md pointer-events-none">
                        {t('new_badge', { defaultValue: 'Neu' })}
                    </span>
                )}

                {/* Netflix-style hover preview overlay */}
                {hoverPreview && !isSquareType && item && (
                    <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col gap-2 p-2 pt-10 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto">
                        <div
                            className="flex items-center gap-2"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                        >
                            <PosterPlayButton item={item} itemId={itemId} inline />
                            <WatchlistButton item={item} size="icon" variant="outline" />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium">
                            {getMatchScore(item) != null && (
                                <span className="match-score">
                                    {getMatchScore(item)}% {t('match', { defaultValue: 'Match' })}
                                </span>
                            )}
                            {item.PremiereDate && (
                                <span className="text-white/80">
                                    {new Date(item.PremiereDate).getFullYear()}
                                </span>
                            )}
                            {item.OfficialRating && (
                                <span className="rounded border border-white/30 px-1 text-[10px] text-white/70">
                                    {item.OfficialRating}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Playback progress bar */}
                {item?.UserData?.PlaybackPositionTicks != null &&
                    item.UserData.PlaybackPositionTicks > 0 &&
                    item?.RunTimeTicks != null &&
                    item.RunTimeTicks > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-40 rounded-b-md overflow-hidden">
                            <div
                                className="h-full bg-brand rounded-b-md transition-all duration-300"
                                style={{
                                    width: `${Math.min(100, (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100)}%`,
                                }}
                            />
                        </div>
                    )}

                {showPlayButton && !(hoverPreview && !isSquareType && item) && (
                    <PosterPlayButton item={item} itemId={itemId} />
                )}
            </div>
            <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all max-w-36 lg:max-w-44 2xl:max-w-52">
                {itemName || item?.Name || ''}
            </p>
            {children}
        </Link>
    );
};
export default memo(ScrollableSectionPoster);
