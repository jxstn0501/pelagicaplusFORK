import { getApi } from '@/api/getApi';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api/session-api';
import { useMutation } from '@tanstack/react-query';
import { PlayCommand } from '@jellyfin/sdk/lib/generated-client/models';

export function useRemotePlay() {
    return useMutation({
        mutationFn: async ({
            sessionId,
            itemId,
            startPositionTicks = 0,
        }: {
            sessionId: string;
            itemId: string;
            startPositionTicks?: number;
        }) => {
            const api = getApi();
            const sessionApi = getSessionApi(api);
            await sessionApi.play({
                sessionId,
                playCommand: PlayCommand.PlayNow,
                itemIds: [itemId],
                startPositionTicks,
            });
        },
    });
}
