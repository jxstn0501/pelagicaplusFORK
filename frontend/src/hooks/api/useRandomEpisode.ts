import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getUserId } from '@/utils/localstorageCredentials';
import { getRetryConfig } from '@/utils/authErrorHandler';

export function useRandomEpisode(seriesId: string | undefined, unseenOnly = false) {
    return useQuery<BaseItemDto | null>({
        queryKey: ['random-episode', seriesId, unseenOnly],
        queryFn: async (): Promise<BaseItemDto | null> => {
            const api = getApi();
            const itemsApi = getItemsApi(api);
            const response = await itemsApi.getItems({
                userId: getUserId() || undefined,
                parentId: seriesId!,
                includeItemTypes: ['Episode'],
                recursive: true,
                sortBy: ['Random'],
                sortOrder: ['Ascending'],
                limit: 1,
                enableUserData: true,
                isPlayed: unseenOnly ? false : undefined,
                locationTypes: ['FileSystem'],
            });
            return response.data.Items?.[0] ?? null;
        },
        enabled: !!seriesId,
        // Don't cache — we want a new random episode each time
        gcTime: 0,
        staleTime: 0,
        ...getRetryConfig(),
    });
}
