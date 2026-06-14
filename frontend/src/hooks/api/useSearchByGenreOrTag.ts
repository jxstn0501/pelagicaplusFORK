import { useQuery } from '@tanstack/react-query';
import { getApi } from '@/api/getApi';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import type { BaseItemDto, BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';
import { getRetryConfig } from '@/utils/authErrorHandler';

interface UseSearchByGenreOrTagOptions {
    itemTypes?: BaseItemKind[];
    limit?: number;
    userId?: string;
    enabled?: boolean;
}

export function useSearchByGenreOrTag(searchTerm: string, options?: UseSearchByGenreOrTagOptions) {
    const normalizedItemTypes =
        options?.itemTypes && options.itemTypes.length ? [...options.itemTypes] : undefined;
    const itemTypesKey = normalizedItemTypes ? [...normalizedItemTypes].sort() : 'all';
    const limit = options?.limit ?? 50;
    const term = searchTerm.trim();

    return useQuery<BaseItemDto[]>({
        queryKey: ['searchByGenreOrTag', term, itemTypesKey, limit, options?.userId],
        queryFn: async (): Promise<BaseItemDto[]> => {
            try {
                const api = getApi();
                const itemsApi = getItemsApi(api);

                const [genreResponse, tagResponse] = await Promise.all([
                    itemsApi.getItems({
                        userId: options?.userId,
                        enableUserData: true,
                        genres: [term],
                        includeItemTypes: normalizedItemTypes,
                        limit,
                        recursive: true,
                        fields: ['Overview', 'ParentId', 'Genres', 'Tags'],
                        locationTypes: ['FileSystem'],
                    }),
                    itemsApi.getItems({
                        userId: options?.userId,
                        enableUserData: true,
                        tags: [term],
                        includeItemTypes: normalizedItemTypes,
                        limit,
                        recursive: true,
                        fields: ['Overview', 'ParentId', 'Genres', 'Tags'],
                        locationTypes: ['FileSystem'],
                    }),
                ]);

                const genreItems = genreResponse.data.Items ?? [];
                const tagItems = tagResponse.data.Items ?? [];

                // Merge and deduplicate by Id
                const seen = new Set<string>();
                const merged: BaseItemDto[] = [];
                for (const item of [...genreItems, ...tagItems]) {
                    if (item.Id && !seen.has(item.Id)) {
                        seen.add(item.Id);
                        merged.push(item);
                    }
                }
                return merged;
            } catch (err) {
                console.error('Genre/tag search error:', err);
                throw err;
            }
        },
        enabled: options?.enabled !== false && term.length > 0,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        ...getRetryConfig(),
    });
}
