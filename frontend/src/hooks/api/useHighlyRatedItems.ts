import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { ItemFilter, type BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getUserId } from '@/utils/localstorageCredentials';
import { getRetryConfig } from '@/utils/authErrorHandler';

/**
 * Items the user has explicitly liked (ThumbsUp) or marked as favorite.
 * Used to power "Weil dir X gefallen hat" recommendation rows.
 */
export function useHighlyRatedItems(limit = 10) {
    return useQuery<BaseItemDto[]>({
        queryKey: ['highlyRatedItems', limit],
        queryFn: async () => {
            const api = getApi();
            const itemsApi = getItemsApi(api);
            const response = await itemsApi.getItems({
                userId: getUserId() || undefined,
                sortBy: ['DatePlayed'],
                sortOrder: ['Descending'],
                filters: [ItemFilter.IsFavorite],
                includeItemTypes: ['Movie', 'Series'],
                recursive: true,
                limit,
                enableUserData: true,
                fields: ['Genres', 'Overview', 'PrimaryImageAspectRatio'],
            });
            return response.data.Items || [];
        },
        ...getRetryConfig(),
    });
}
