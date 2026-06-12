import { getUnauthenticatedApi } from '@/api/getApi';
import { getUserApi } from '@jellyfin/sdk/lib/utils/api/user-api';
import { useQuery } from '@tanstack/react-query';
import { getServerUrl } from '@/utils/localstorageCredentials';

/**
 * Public users of the server — the accounts shown on Jellyfin's own login
 * screen. Used for the "Who's watching?" profile picker. No token required.
 */
export function usePublicUsers(enabled = true) {
    const server = getServerUrl();

    return useQuery({
        queryKey: ['publicUsers', server],
        enabled: enabled && !!server,
        staleTime: 30000,
        queryFn: async () => {
            const api = getUnauthenticatedApi();
            const res = await getUserApi(api).getPublicUsers();
            return res.data;
        },
    });
}

/**
 * Builds the avatar URL for a public user (no auth token needed). Returns an
 * empty string when the user has no profile image.
 */
export function getPublicUserImageUrl(userId?: string | null, tag?: string | null): string {
    const server = getServerUrl();
    if (!server || !userId || !tag) return '';
    try {
        const url = new URL(server);
        url.pathname = `/Users/${userId}/Images/Primary`;
        url.searchParams.set('tag', tag);
        url.searchParams.set('quality', '90');
        return url.toString();
    } catch {
        return '';
    }
}
