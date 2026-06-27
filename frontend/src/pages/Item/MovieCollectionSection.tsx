import { useState } from 'react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { useMovieSeerrDetails } from '@/hooks/api/useMovieSeerrDetails';
import { useItemBoxSet } from '@/hooks/api/useItemBoxSet';
import { useConfig } from '@/hooks/api/useConfig';
import SeerrCollectionDialog from '@/components/SeerrCollectionDialog';
import { Button } from '@/components/ui/button';
import { Layers } from 'lucide-react';
import { Link } from 'react-router';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import ScrollableSectionPoster from '@/components/ScrollableSectionPoster';
import SectionScroller from '@/components/SectionScroller';
import { useBoxSetItems } from '@/hooks/api/useBoxSetItems';

const JellyfinCollectionSection = ({
    boxSet,
}: {
    boxSet: BaseItemDto;
}) => {
    const { data: items } = useBoxSetItems(boxSet.Id || null);
    if (!items || items.length === 0) return null;

    return (
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
    );
};

interface MovieCollectionSectionProps {
    item: BaseItemDto;
}

const MovieCollectionSection = ({ item }: MovieCollectionSectionProps) => {
    const { config } = useConfig();
    const tmdbId = item.ProviderIds?.Tmdb;
    const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);

    const { data: seerrDetails } = useMovieSeerrDetails(
        config?.seerrUrl ? tmdbId : null
    );

    const seerrCollection =
        seerrDetails?.belongsToCollection || seerrDetails?.collection;

    const { data: jellyfinBoxSet } = useItemBoxSet(seerrCollection?.name ?? null);

    if (!seerrCollection && !jellyfinBoxSet) return null;

    return (
        <div className="flex flex-col gap-6">
            {jellyfinBoxSet && (
                <JellyfinCollectionSection boxSet={jellyfinBoxSet} />
            )}

            {!jellyfinBoxSet && seerrCollection && config?.seerrUrl && (
                <div className="px-4 sm:px-12 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Layers className="h-5 w-5" />
                        <span className="text-sm font-medium">Teil einer Sammlung:</span>
                        <span className="font-semibold text-foreground">
                            {seerrCollection.name}
                        </span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setCollectionDialogOpen(true)}
                    >
                        <Layers className="h-4 w-4" />
                        Sammlung anzeigen
                    </Button>
                </div>
            )}

            {jellyfinBoxSet && seerrCollection && config?.seerrUrl && (
                <div className="px-4 sm:px-12">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setCollectionDialogOpen(true)}
                    >
                        <Layers className="h-4 w-4" />
                        Fehlende Filme über Jellyseerr anfragen
                    </Button>
                </div>
            )}

            {seerrCollection && config?.seerrUrl && (
                <SeerrCollectionDialog
                    collectionId={seerrCollection.id}
                    open={collectionDialogOpen}
                    onOpenChange={setCollectionDialogOpen}
                />
            )}
        </div>
    );
};

export default MovieCollectionSection;
