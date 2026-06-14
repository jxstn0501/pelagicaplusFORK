import ScrollableSectionPoster from '@/components/ScrollableSectionPoster';
import SectionScroller from '@/components/SectionScroller';
import { useHighlyRatedItems } from '@/hooks/api/useHighlyRatedItems';
import { useSimilarItems } from '@/hooks/api/useSimilarItems';
import { Heart } from 'lucide-react';
import { useMemo } from 'react';

interface RatingBasedRowProps {
    /** Exclude this item ID from results (the currently viewed item). */
    excludeItemId?: string;
}

/**
 * Shows items similar to a random favorited title.
 * "Weil dir [Title] gefallen hat"
 */
const RatingBasedRow = ({ excludeItemId }: RatingBasedRowProps) => {
    const { data: favorites, isLoading } = useHighlyRatedItems(20);

    // Pick a random favorite as the seed (stable across re-renders within session)
    const seed = useMemo(() => {
        if (!favorites || favorites.length === 0) return null;
        const eligible = favorites.filter((f) => f.Id !== excludeItemId);
        if (eligible.length === 0) return null;
        return eligible[Math.floor(Math.random() * eligible.length)];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [favorites?.length, excludeItemId]);

    const { data: similarItems, isLoading: isLoadingSimilar } = useSimilarItems(seed?.Id, 12);

    const displayItems = useMemo(() => {
        if (!similarItems) return [];
        return similarItems.filter((item) => item.Id !== excludeItemId);
    }, [similarItems, excludeItemId]);

    if (isLoading || isLoadingSimilar || !seed || displayItems.length === 0) return null;

    return (
        <SectionScroller
            title={
                <h3 className="text-3xl font-bold flex items-center gap-2">
                    <Heart className="w-6 h-6 text-red-400 fill-red-400" />
                    Weil dir <span className="text-muted-foreground italic">{seed.Name}</span>{' '}
                    gefallen hat
                </h3>
            }
            items={displayItems.map((item) => (
                <ScrollableSectionPoster key={item.Id} item={item}>
                    {item.PremiereDate && (
                        <span className="text-xs text-muted-foreground mt-1">
                            {new Date(item.PremiereDate).getFullYear()}
                        </span>
                    )}
                </ScrollableSectionPoster>
            ))}
        />
    );
};

export default RatingBasedRow;
