import SectionScroller from '@/components/SectionScroller';
import { Skeleton } from '@/components/ui/skeleton';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import { useRecentlyPlayed } from '@/hooks/api/useRecentlyPlayed';
import type { BaseItemPerson } from '@jellyfin/sdk/lib/generated-client/models';
import { ImageOff } from 'lucide-react';
import { useMemo, useState, useCallback, memo } from 'react';
import { Link } from 'react-router';

const RecentPersonsRow = memo(({ title }: { title?: React.ReactNode }) => {
    const { data: recentItems, isLoading } = useRecentlyPlayed(20);
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

    const onImgError = useCallback((id: string) => {
        setImgErrors((prev) => ({ ...prev, [id]: true }));
    }, []);

    const persons = useMemo<BaseItemPerson[]>(() => {
        if (!recentItems) return [];
        const seen = new Set<string>();
        const result: BaseItemPerson[] = [];
        for (const item of recentItems) {
            for (const person of item.People || []) {
                if (!person.Id || seen.has(person.Id)) continue;
                if (person.Type !== 'Actor' && person.Type !== 'Director') continue;
                seen.add(person.Id);
                result.push(person);
                if (result.length >= 20) break;
            }
            if (result.length >= 20) break;
        }
        return result;
    }, [recentItems]);

    if (isLoading) {
        return (
            <SectionScroller
                title={title}
                items={Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="min-w-28 w-28">
                        <Skeleton className="aspect-square w-full rounded-full" />
                        <Skeleton className="mt-2 h-4 w-3/4 rounded mx-auto" />
                    </div>
                ))}
            />
        );
    }

    if (persons.length === 0) return null;

    return (
        <SectionScroller
            title={title}
            items={persons.map((person) => (
                <Link
                    to={`/person/${person.Id}`}
                    key={person.Id}
                    className="group min-w-28 w-28 flex flex-col items-center"
                >
                    <div className="aspect-square w-full rounded-full overflow-hidden bg-muted">
                        {imgErrors[person.Id!] ? (
                            <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground">
                                {person.Name ? (
                                    person.Name.split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()
                                ) : (
                                    <ImageOff className="w-8 h-8" />
                                )}
                            </div>
                        ) : (
                            <img
                                src={getPrimaryImageUrl(
                                    person.Id!,
                                    { width: 120 },
                                    person.PrimaryImageTag || undefined
                                )}
                                alt={person.Name || ''}
                                className="h-full w-full object-cover group-hover:opacity-75 group-hover:scale-105 transition-all duration-300 ease-out will-change-transform"
                                onError={() => onImgError(person.Id!)}
                            />
                        )}
                    </div>
                    <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all text-center">
                        {person.Name}
                    </p>
                    {person.Type === 'Director' && (
                        <p className="text-xs text-muted-foreground text-center">Regie</p>
                    )}
                </Link>
            ))}
        />
    );
});

RecentPersonsRow.displayName = 'RecentPersonsRow';

export default RecentPersonsRow;
