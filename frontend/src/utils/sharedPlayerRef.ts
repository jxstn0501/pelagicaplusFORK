import type { VideoJsPlayer } from '@/pages/Player/PlayerPage';

export const sharedPlayerRef: { current: VideoJsPlayer | null } = { current: null };
