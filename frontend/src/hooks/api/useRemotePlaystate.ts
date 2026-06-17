import { getApi } from '@/api/getApi';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api/session-api';
import { useMutation } from '@tanstack/react-query';
import {
    GeneralCommandType,
    PlaystateCommand,
} from '@jellyfin/sdk/lib/generated-client/models';
import { getUserId } from '@/utils/localstorageCredentials';

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
                controllingUserId: getUserId() ?? undefined,
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
            commandName: GeneralCommandType;
        }) => {
            const api = getApi();
            const sessionApi = getSessionApi(api);
            await sessionApi.sendGeneralCommand({
                sessionId,
                command: commandName,
            });
        },
    });
}
