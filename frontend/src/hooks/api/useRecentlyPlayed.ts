import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { ItemFilter, type BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getUserId } from '@/utils/localstorageCredentials';
import { getRetryConfig } from '@/utils/authErrorHandler';

/**
 * Recently played Movies & Series for the current user — used as seeds for
 * "Because you watched …" rows. Powered entirely by Jellyfin (no external
 * service / API key).
 */
export function useRecentlyPlayed(limit = 8) {
    return useQuery<BaseItemDto[]>({
        queryKey: ['recentlyPlayed', limit],
        queryFn: async () => {
            const api = getApi();
            const itemsApi = getItemsApi(api);
            const response = await itemsApi.getItems({
                userId: getUserId() || undefined,
                sortBy: ['DatePlayed'],
                sortOrder: ['Descending'],
                filters: [ItemFilter.IsPlayed],
                includeItemTypes: ['Movie', 'Series'],
                recursive: true,
                limit,
                enableUserData: true,
                fields: ['Genres'],
            });
            return response.data.Items || [];
        },
        ...getRetryConfig(),
    });
}
