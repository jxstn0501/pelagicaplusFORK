import { useState } from 'react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { useMovieBoxSet } from '@/hooks/api/useMovieBoxSet';
import { useBoxSetItems } from '@/hooks/api/useBoxSetItems';
import { useMovieSeerrDetails } from '@/hooks/api/useMovieSeerrDetails';
import { useConfig } from '@/hooks/api/useConfig';
import SeerrCollectionDialog from '@/components/SeerrCollectionDialog';
import { Button } from '@/components/ui/button';
import { Layers } from 'lucide-react';
import { Link } from 'react-router';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import ScrollableSectionPoster from '@/components/ScrollableSectionPoster';
import SectionScroller from '@/components/SectionScroller';

const BoxSetSection = ({
    boxSet,
    seerrCollectionId,
    hasSeerr,
}: {
    boxSet: BaseItemDto;
    seerrCollectionId?: number;
    hasSeerr: boolean;
}) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { data: items, isLoading } = useBoxSetItems(boxSet.Id || null);

    if (isLoading) return null;
    if (!items || items.length === 0) return null;

    return (
        <div className="flex flex-col gap-4">
            <SectionScroller
                className="max-w-full"
                contentInset
                title={
                    <div className="flex items-center gap-3">
                        <h3 className="text-3xl font-bold">{boxSet.Name}</h3>
                        <Link
                            to={`/item/${boxSet.Id}`}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Alle anzeigen →
                        </Link>
                    </div>
                }
                items={items.map((boxItem) => (
                    <ScrollableSectionPoster
                        key={boxItem.Id}
                        item={boxItem}
                        posterUrl={getPrimaryImageUrl(
                            boxItem.Id!,
                            undefined,
                            boxItem.ImageTags?.Primary
                        )}
                        showPlayButton
                    >
                        {boxItem.PremiereDate && (
                            <span className="text-xs text-muted-foreground mt-1">
                                {new Date(boxItem.PremiereDate).getFullYear()}
                            </span>
                        )}
                    </ScrollableSectionPoster>
                ))}
            />
            {hasSeerr && seerrCollectionId && (
                <div className="px-4 sm:px-12">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setDialogOpen(true)}
                    >
                        <Layers className="h-4 w-4" />
                        Fehlende Filme über Jellyseerr anfragen
                    </Button>
                    <SeerrCollectionDialog
                        collectionId={seerrCollectionId}
                        open={dialogOpen}
                        onOpenChange={setDialogOpen}
                    />
                </div>
            )}
        </div>
    );
};

const SeerrOnlySection = ({
    collection,
}: {
    collection: { id: number; name: string };
}) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    return (
        <div className="px-4 sm:px-12 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Layers className="h-5 w-5" />
                <span className="text-sm">Teil einer Sammlung:</span>
                <span className="font-semibold text-foreground">{collection.name}</span>
            </div>
            <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setDialogOpen(true)}
            >
                <Layers className="h-4 w-4" />
                Sammlung anzeigen &amp; anfragen
            </Button>
            <SeerrCollectionDialog
                collectionId={collection.id}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </div>
    );
};

interface MovieCollectionSectionProps {
    item: BaseItemDto;
}

const MovieCollectionSection = ({ item }: MovieCollectionSectionProps) => {
    const { config } = useConfig();
    const hasSeerr = !!config?.seerrUrl;
    const tmdbId = item.ProviderIds?.Tmdb;

    const { data: boxSet, isLoading: boxSetLoading } = useMovieBoxSet(item.Id);

    const { data: seerrDetails } = useMovieSeerrDetails(
        hasSeerr && tmdbId ? tmdbId : null
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seerrCollection: { id: number; name: string } | null =
        seerrDetails?.belongsToCollection ||
        seerrDetails?.collection ||
        (seerrDetails as any)?.belongs_to_collection ||
        null;

    // Still searching for BoxSet – render nothing yet
    if (boxSetLoading) return null;

    // Jellyfin BoxSet found
    if (boxSet) {
        return (
            <BoxSetSection
                boxSet={boxSet}
                seerrCollectionId={seerrCollection?.id}
                hasSeerr={hasSeerr}
            />
        );
    }

    // No local BoxSet, but Seerr knows a collection
    if (hasSeerr && seerrCollection) {
        return <SeerrOnlySection collection={seerrCollection} />;
    }

    return null;
};

export default MovieCollectionSection;
