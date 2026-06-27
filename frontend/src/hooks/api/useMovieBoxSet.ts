import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getUserId } from '@/utils/localstorageCredentials';

export function useMovieBoxSet(movieId: string | null | undefined) {
    return useQuery<BaseItemDto | null>({
        queryKey: ['movieBoxSet', movieId],
        queryFn: async (): Promise<BaseItemDto | null> => {
            const api = getApi();
            const itemsApi = getItemsApi(api);
            const userId = getUserId() || undefined;

            // 1. Get all BoxSets
            const boxSetsResponse = await itemsApi.getItems({
                userId,
                includeItemTypes: ['BoxSet'],
                recursive: true,
                limit: 100,
            });

            const boxSets = boxSetsResponse.data.Items || [];
            if (!boxSets.length) return null;

            // 2. For each BoxSet, fetch its item IDs and check membership client-side
            //    (combining parentId + ids in Jellyfin ignores the parentId filter)
            const checks = await Promise.all(
                boxSets.map(async (boxSet) => {
                    try {
                        const res = await itemsApi.getItems({
                            parentId: boxSet.Id,
                            userId,
                            fields: [],
                            limit: 500,
                        });
                        const inBoxSet = res.data.Items?.some((i) => i.Id === movieId);
                        return inBoxSet ? boxSet : null;
                    } catch {
                        return null;
                    }
                })
            );

            return checks.find(Boolean) ?? null;
        },
        enabled: !!movieId,
        staleTime: 1000 * 60 * 15,
        retry: false,
    });
}
