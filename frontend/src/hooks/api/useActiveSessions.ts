import { getApi } from '@/api/getApi';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api/session-api';
import { useQuery } from '@tanstack/react-query';
import type { SessionInfoDto } from '@jellyfin/sdk/lib/generated-client/models';

export function useActiveSessions() {
    return useQuery<SessionInfoDto[]>({
        queryKey: ['activeSessions'],
        queryFn: async () => {
            const api = getApi();
            const sessionApi = getSessionApi(api);
            const response = await sessionApi.getSessions();
            return response.data ?? [];
        },
        refetchInterval: 2000,
        staleTime: 0,
    });
}
