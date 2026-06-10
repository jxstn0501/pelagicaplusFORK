import { useQuery } from '@tanstack/react-query';
import type { BaseItemDto, BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';

interface MeiliSearchOptions {
    url: string;
    apiKey?: string;
    index?: string;
    itemTypes?: BaseItemKind[];
    limit?: number;
    enabled?: boolean;
}

// MeiliSearch hit as indexed by the jellyfin-meilisearch plugin
interface MeiliHit {
    Id?: string;
    Name?: string;
    Type?: string;
    Overview?: string;
    Genres?: string[];
    CommunityRating?: number;
    OfficialRating?: string;
    PremiereDate?: string;
    RunTimeTicks?: number;
    SeriesName?: string;
    ParentIndexNumber?: number;
    IndexNumber?: number;
    ImageTags?: Record<string, string>;
    [key: string]: unknown;
}

function hitToBaseItemDto(hit: MeiliHit): BaseItemDto {
    return {
        Id: hit.Id,
        Name: hit.Name,
        Type: hit.Type as BaseItemDto['Type'],
        Overview: hit.Overview,
        Genres: hit.Genres,
        CommunityRating: hit.CommunityRating,
        OfficialRating: hit.OfficialRating,
        PremiereDate: hit.PremiereDate,
        RunTimeTicks: hit.RunTimeTicks,
        SeriesName: hit.SeriesName,
        ParentIndexNumber: hit.ParentIndexNumber,
        IndexNumber: hit.IndexNumber,
        ImageTags: hit.ImageTags,
    };
}

export function useMeiliSearch(searchTerm: string, options: MeiliSearchOptions) {
    const { url, apiKey, index = 'jellyfin', itemTypes, limit = 50, enabled = true } = options;

    return useQuery<BaseItemDto[]>({
        queryKey: ['meiliSearch', searchTerm, index, itemTypes, limit],
        queryFn: async (): Promise<BaseItemDto[]> => {
            const body: Record<string, unknown> = {
                q: searchTerm.trim(),
                limit,
            };

            // Filter by item type if specified
            if (itemTypes && itemTypes.length > 0) {
                body.filter = itemTypes.map((t) => `Type = "${t}"`).join(' OR ');
            }

            const res = await fetch(`${url.replace(/\/$/, '')}/indexes/${index}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(`MeiliSearch error: ${res.status}`);

            const data = await res.json();
            return (data.hits as MeiliHit[]).map(hitToBaseItemDto);
        },
        enabled: enabled && searchTerm.trim().length > 0 && !!url,
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 5,
    });
}
