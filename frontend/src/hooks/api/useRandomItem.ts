import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import type { BaseItemDto, BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';
import { getUserId } from '@/utils/localstorageCredentials';
import { getRetryConfig } from '@/utils/authErrorHandler';

export function useRandomItem(types: BaseItemKind[], enabled = false) {
    return useQuery<BaseItemDto | null>({
        queryKey: ['random-item', types],
        queryFn: async (): Promise<BaseItemDto | null> => {
            const api = getApi();
            const itemsApi = getItemsApi(api);
            const response = await itemsApi.getItems({
                userId: getUserId() || undefined,
                includeItemTypes: types,
                recursive: true,
                sortBy: ['Random'],
                sortOrder: ['Ascending'],
                limit: 1,
                isPlayed: false,
                locationTypes: ['FileSystem'],
            });
            return response.data.Items?.[0] ?? null;
        },
        enabled,
        gcTime: 0,
        staleTime: 0,
        ...getRetryConfig(),
    });
}
