import { useQuery } from '@tanstack/react-query';
import { useConfig } from './useConfig';
import { getUsername, getPassword } from '@/utils/localstorageCredentials';

export interface SeerrMovieDetails {
    id: number;
    title: string;
    overview?: string;
    releaseDate?: string;
    belongsToCollection?: {
        id: number;
        name: string;
        posterPath?: string;
        backdropPath?: string;
    } | null;
    collection?: {
        id: number;
        name: string;
    } | null;
    mediaInfo?: {
        id: number;
        status: number;
    };
}

export function useMovieSeerrDetails(tmdbId: string | null | undefined) {
    const { config } = useConfig();
    const { seerrUrl } = config || {};

    return useQuery<SeerrMovieDetails | null>({
        queryKey: ['seerrMovieDetails', tmdbId, seerrUrl],
        queryFn: async () => {
            if (!seerrUrl || !tmdbId) return null;
            const username = getUsername() || '';
            const password = getPassword() || '';
            const res = await fetch(`/api/seerr/movie/${tmdbId}`, {
                headers: {
                    'X-Seerr-Username': username,
                    'X-Seerr-Password': password,
                },
            });
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!tmdbId && !!seerrUrl,
        staleTime: 1000 * 60 * 10,
        retry: false,
    });
}
