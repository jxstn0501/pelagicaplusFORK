import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api/user-library-api';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getRetryConfig } from '@/utils/authErrorHandler';
import { getUserId } from '@/utils/localstorageCredentials';

export function useMovieBoxSet(itemId: string | null | undefined) {
    return useQuery<BaseItemDto | null>({
        queryKey: ['movieBoxSet', itemId],
        queryFn: async (): Promise<BaseItemDto | null> => {
            const api = getApi();
            const userLibraryApi = getUserLibraryApi(api);
            const userId = getUserId();
            if (!userId || !itemId) return null;

            const response = await userLibraryApi.getAncestors({ itemId, userId });
            const ancestors = response.data || [];
            return ancestors.find((a) => a.Type === 'BoxSet') || null;
        },
        enabled: !!itemId,
        staleTime: 1000 * 60 * 10,
        ...getRetryConfig(),
    });
}
