import { useMemo } from 'react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { useTranslation } from 'react-i18next';
import SectionScroller from '@/components/SectionScroller';
import ScrollableSectionPoster from '@/components/ScrollableSectionPoster';
import { Skeleton } from '@/components/ui/skeleton';
import LazyRow from '@/components/LazyRow';
import { useRecentlyPlayed } from '@/hooks/api/useRecentlyPlayed';
import { useSimilarItems } from '@/hooks/api/useSimilarItems';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';

interface BecauseYouWatchedRowsProps {
    /** How many "Because you watched X" rows to show */
    seedLimit?: number;
    /** Items per row */
    limit?: number;
}

const skeletonItems = Array.from({ length: 6 }, (_, index) => (
    <div key={index} className="w-36 lg:w-44 2xl:w-52">
        <Skeleton className="w-36 h-54 lg:w-44 lg:h-64 2xl:w-52 2xl:h-80 rounded-md mb-2" />
        <Skeleton className="w-32 lg:w-40 2xl:w-48 h-4" />
    </div>
));

const BecauseYouWatchedRow = ({ seed, limit }: { seed: BaseItemDto; limit: number }) => {
    const { t } = useTranslation('home');
    const { data: similar, isLoading } = useSimilarItems(seed.Id, limit);

    const items = useMemo(() => {
        if (!similar) return [];
        return similar.map((item) => (
            <ScrollableSectionPoster
                key={item.Id}
                item={item}
                posterUrl={`${getPrimaryImageUrl(item.Id!, undefined, item.ImageTags?.Primary)}&maxWidth=416&maxHeight=640&quality=85`}
                showPlayButton
                hoverPreview
            >
                {item.PremiereDate && (
                    <span className="text-xs text-muted-foreground mt-1">
                        {new Date(item.PremiereDate).getFullYear()}
                    </span>
                )}
            </ScrollableSectionPoster>
        ));
    }, [similar]);

    if (!isLoading && items.length === 0) return null;

    return (
        <SectionScroller
            className="max-w-full"
            contentInset
            title={
                <h2 className="text-2xl font-bold">
                    {t('because_you_watched_title', {
                        name: seed.Name,
                        defaultValue: `Because you watched ${seed.Name}`,
                    })}
                </h2>
            }
            items={isLoading ? skeletonItems : items}
        />
    );
};

const BecauseYouWatchedRows = ({ seedLimit = 3, limit = 12 }: BecauseYouWatchedRowsProps) => {
    const { data: recent } = useRecentlyPlayed(10);

    const seeds = useMemo(() => {
        if (!recent) return [];
        const seen = new Set<string>();
        const unique: BaseItemDto[] = [];
        for (const item of recent) {
            if (!item.Id || seen.has(item.Id)) continue;
            seen.add(item.Id);
            unique.push(item);
            if (unique.length >= seedLimit) break;
        }
        return unique;
    }, [recent, seedLimit]);

    if (seeds.length === 0) return null;

    return (
        <>
            {seeds.map((seed) => (
                <LazyRow key={seed.Id} placeholderHeight="320px">
                    <BecauseYouWatchedRow seed={seed} limit={limit} />
                </LazyRow>
            ))}
        </>
    );
};

export default BecauseYouWatchedRows;
