import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getRetryConfig } from '@/utils/authErrorHandler';
import { getUserId } from '@/utils/localstorageCredentials';

export function useItemBoxSet(collectionName: string | null | undefined) {
    return useQuery<BaseItemDto | null>({
        queryKey: ['itemBoxSet', collectionName],
        queryFn: async (): Promise<BaseItemDto | null> => {
            if (!collectionName) return null;
            const api = getApi();
            const itemsApi = getItemsApi(api);
            const response = await itemsApi.getItems({
                userId: getUserId() || undefined,
                searchTerm: collectionName,
                includeItemTypes: ['BoxSet'],
                recursive: true,
                limit: 5,
            });
            return response.data.Items?.[0] || null;
        },
        enabled: !!collectionName,
        staleTime: 1000 * 60 * 10,
        ...getRetryConfig(),
    });
}
