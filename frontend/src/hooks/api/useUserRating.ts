import { getApi } from '@/api/getApi';
import { getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api/user-library-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useUserRating(itemId: string | null | undefined) {
    const queryClient = useQueryClient();

    const { data: likes, isLoading } = useQuery({
        queryKey: ['userRating', itemId],
        queryFn: async (): Promise<boolean | null> => {
            if (!itemId) return null;
            const api = getApi();
            const userLibraryApi = getUserLibraryApi(api);
            const response = await userLibraryApi.getItem({ itemId });
            const val = response.data.UserData?.Likes;
            return val ?? null;
        },
        enabled: !!itemId,
    });

    const { mutate: setRating, isPending } = useMutation({
        mutationFn: async (liked: boolean | null) => {
            if (!itemId) throw new Error('Item ID required');
            const api = getApi();
            const userLibraryApi = getUserLibraryApi(api);
            if (liked === null) {
                await userLibraryApi.deleteUserItemRating({ itemId });
            } else {
                await userLibraryApi.updateUserItemRating({ itemId, likes: liked });
            }
            return liked;
        },
        onSuccess: (newLikes) => {
            queryClient.setQueryData(['userRating', itemId], newLikes);
            queryClient.invalidateQueries({ queryKey: ['item', itemId] });
        },
    });

    return { likes, setRating, isLoading: isLoading || isPending };
}
