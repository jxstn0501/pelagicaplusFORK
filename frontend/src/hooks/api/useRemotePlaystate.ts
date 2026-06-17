import { getApi } from '@/api/getApi';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api/session-api';
import { useMutation } from '@tanstack/react-query';
import { PlaystateCommand } from '@jellyfin/sdk/lib/generated-client/models';

export { PlaystateCommand };

export function useRemotePlaystate() {
    return useMutation({
        mutationFn: async ({
            sessionId,
            command,
            seekPositionTicks,
        }: {
            sessionId: string;
            command: PlaystateCommand;
            seekPositionTicks?: number;
        }) => {
            const api = getApi();
            const sessionApi = getSessionApi(api);
            await sessionApi.sendPlaystateCommand({
                sessionId,
                command,
                seekPositionTicks,
            });
        },
    });
}

export function useRemoteGeneralCommand() {
    return useMutation({
        mutationFn: async ({
            sessionId,
            commandName,
        }: {
            sessionId: string;
            commandName: string;
        }) => {
            const api = getApi();
            const sessionApi = getSessionApi(api);
            await sessionApi.sendGeneralCommand({
                sessionId,
                generalCommand: { Name: commandName as never },
            });
        },
    });
}
