import type { BaseItemKind, ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RecommendationTypeFilter } from './useRecommendedItems';
import { getAccessToken, getServerUrl } from '@/utils/localstorageCredentials';

interface BaseHomeScreenSection {
    /** Whether the section is enabled. Mostly intended for testing purposes */
    enabled?: boolean;
    /** The title of the section */
    title?: string;
}

/** Configuration for filtering and sorting items in a section */
export interface SectionItemsConfig {
    /** How to sort the items (e.g. "DateCreated", "Random", "CommunityRating") */
    sortBy?: ItemSortBy[];
    /** Filter items from a specific library by its ID */
    libraryId?: string;
    /** Filter by media types */
    types?: ('Movie' | 'Series' | 'BoxSet' | 'MusicAlbum' | 'Playlist')[];
    /** Filter by genre names */
    genres?: string[];
    /** Filter by tag names */
    tags?: string[];
    /** Sort order direction */
    sortOrder?: 'Ascending' | 'Descending';
    /** Maximum number of items to display */
    limit?: number;
    /** Whether to only include favorite items */
    isFavorite?: boolean;
    /** Whether to only include items in the Kefintweaks watchlist */
    isInKefinTweaksWatchlist?: boolean;
    /** Whether to only include unplayed items */
    isUnplayed?: boolean;
}

/** A large carousel banner showcasing featured media with backdrop images */
export interface MediaBarSection extends BaseHomeScreenSection {
    type: 'mediaBar';
    /** Size of the media bar carousel */
    size?: 'small' | 'medium' | 'large' | 'xlarge';
    /** Configuration for which items to display in the carousel */
    items?: SectionItemsConfig;
    /** Whether to show the favorite button on the media bar items */
    showFavoriteButton?: boolean;
    /** Whether to show the watchlist button on the media bar items */
    showWatchlistButton?: boolean;
}

/** A section showing recently added items */
export interface RecentlyAddedSection extends BaseHomeScreenSection {
    type: 'recentlyAdded';
    /** Maximum number of items to display */
    limit?: number;
    /** Filter by media types */
    types?: ('Movie' | 'Series' | 'BoxSet' | 'MusicAlbum' | 'Playlist')[];
}

export const DETAIL_FIELDS = [
    'ReleaseYear',
    'ReleaseYearAndMonth',
    'ReleaseDate',
    'CommunityRating',
    'PlayDuration',
    'PlayEnd',
    'SeasonCount',
    'EpisodeCount',
    'AgeRating',
    'Artist',
    'TrackCount',
] as const;
export type DetailField = (typeof DETAIL_FIELDS)[number];

/** A generic section displaying a grid of items */
export interface ItemsSection extends BaseHomeScreenSection {
    type: 'items';
    /** Link to show all items in this category */
    allLink?: string;
    /** Configuration for which items to display */
    items?: SectionItemsConfig;
    /** Additional detail fields to include for each item */
    detailFields?: DetailField[];
}

export const CONTINUE_WATCHING_TITLE_LINES = [
    'ItemTitle',
    'ParentTitle',
    'ItemTitleWithEpisodeInfo',
] as const;
export type ContinueWatchingTitleLine = (typeof CONTINUE_WATCHING_TITLE_LINES)[number];

export const CONTINUE_WATCHING_DETAIL_LINES = [
    'ProgressPercentage',
    'TimeRemaining',
    'EpisodeInfo',
    'EndsAt',
    'ParentTitle',
    'None',
] as const;
export type ContinueWatchingDetailLine = (typeof CONTINUE_WATCHING_DETAIL_LINES)[number];

export interface ContinueWatchingSection extends BaseHomeScreenSection {
    type: 'continueWatching';
    titleLine?: ContinueWatchingTitleLine;
    detailLine?: ContinueWatchingDetailLine[];
    limit?: number;
    /** Whether to use more accurate sorting that may involve additional API calls */
    accurateSorting?: boolean;
}

export interface RecommendedItemsSection extends BaseHomeScreenSection {
    type: 'streamystatsRecommended';
    /** Type of recommendations to show */
    recommendationType?: RecommendationTypeFilter;
    /** Maximum number of items to display */
    limit?: number;
    /** Whether to show similarity scores */
    showSimilarity?: boolean;
    /** Whether to show what items the recommendation is based on */
    showBasedOn?: boolean;
}

export interface NextUpSection extends BaseHomeScreenSection {
    type: 'nextUp';
    titleLine?: ContinueWatchingTitleLine;
    detailLine?: ContinueWatchingDetailLine[];
    limit?: number;
}

export interface ResumeSection extends BaseHomeScreenSection {
    type: 'resume';
    titleLine?: ContinueWatchingTitleLine;
    detailLine?: ContinueWatchingDetailLine[];
    limit?: number;
}

export interface GenresSection extends BaseHomeScreenSection {
    type: 'genres';
    /** Maximum number of genres to display */
    limit?: number;
}

export interface LibrariesSection extends BaseHomeScreenSection {
    type: 'libraries';
}

export interface StudiosSection extends BaseHomeScreenSection {
    type: 'studios';
    /** Maximum number of studios to display */
    limit?: number;
}

export interface TrailersSection extends BaseHomeScreenSection {
    type: 'trailers';
    /** Maximum number of trailers to display */
    limit?: number;
    /** Filter by media type */
    types?: ('Movie' | 'Series')[];
}

export interface GenreRecommendedSection extends BaseHomeScreenSection {
    type: 'genreRecommended';
    /** How many genres to show as rows */
    genreLimit?: number;
    /** Items per genre row */
    limit?: number;
    /** Filter by media type */
    mediaType?: 'Movie' | 'Series' | 'all';
    /** Sort field for items within each genre */
    sortBy?: ItemSortBy[];
}

export interface MoodBarSection extends BaseHomeScreenSection {
    type: 'moodBar';
    /** Maximum number of items to display per mood */
    limit?: number;
}

export interface Top10Section extends BaseHomeScreenSection {
    type: 'top10';
    /** Configuration for which items to rank */
    items?: SectionItemsConfig;
}

export interface BecauseYouWatchedSection extends BaseHomeScreenSection {
    type: 'becauseYouWatched';
    /** How many "Because you watched X" rows to show */
    seedLimit?: number;
    /** Items per row */
    limit?: number;
}

export interface RecentPersonsSection extends BaseHomeScreenSection {
    type: 'recentPersons';
    title?: string;
}

export type HomeScreenSection =
    | MediaBarSection
    | RecentlyAddedSection
    | ItemsSection
    | ContinueWatchingSection
    | RecommendedItemsSection
    | NextUpSection
    | ResumeSection
    | GenresSection
    | LibrariesSection
    | StudiosSection
    | GenreRecommendedSection
    | TrailersSection
    | MoodBarSection
    | Top10Section
    | BecauseYouWatchedSection
    | RecentPersonsSection;

export const EPISODE_DISPLAYS = ['grid', 'row'] as const;
export type EpisodeDisplay = (typeof EPISODE_DISPLAYS)[number];

export const DETAIL_BADGES = [
    'ReleaseYear',
    'ReleaseYearAndMonth',
    'ReleaseDate',
    'CommunityRating',
    'PlayDuration',
    'PlayEnd',
    'SeasonCount',
    'EpisodeCount',
    'AgeRating',
    'EpisodeNumber',
    'Duration',
    'VideoQuality',
] as const;
export type DetailBadge = (typeof DETAIL_BADGES)[number];

export interface ItemPageSettings {
    /** How to display episodes on series pages */
    episodeDisplay?: EpisodeDisplay;
    /** Which badges to show on item detail pages */
    detailBadges?: DetailBadge[];
    /** The item types to show the favorite button for. Empty array means no favorite button */
    favoriteButton?: BaseItemKind[];
    /** Whether to show the download button on item pages */
    showDownloadButton?: boolean;
    /** Whether to show the watchlist button to add items to the kefintweaks watchlist */
    showWatchlistButton?: boolean;
}

export interface ConfigLink {
    /** The URL the link points to */
    url: string;
    /** The text to display for the link */
    text: string;
    /** The icon to display for the link */
    icon: string;
}

export interface AppConfig {
    /** Optional server address to automatically choose */
    serverAddress?: string;
    /** Optional URL for Streamystats integration */
    streamystatsUrl?: string;
    /** Optional URL for Seerr integration */
    seerrUrl?: string;
    /** Whether to show the Streamystats button in the user menu */
    showStreamystatsButton?: boolean;
    /** Whether to show the watched state badge for items on the home screen */
    watchedStateBadgeHomeScreen?: boolean;
    /** Whether to show the watched state badge for items in the library */
    watchedStateBadgeLibrary?: boolean;
    /** Whether to show the watched state badge for items on genre pages */
    watchedStateBadgeGenre?: boolean;
    /** Whether to show the watched state badge for items on search pages */
    watchedStateBadgeSearch?: boolean;
    /** Whether to show the 10-second Netflix-style content advisory on playback */
    showContentAdvisory?: boolean;
    /** Whether to show the immersive pause overlay screensaver after 15 seconds */
    showPauseOverlay?: boolean;
    /** Whether detail pages auto-play the title's trailer over the backdrop (default true) */
    autoplayTrailers?: boolean;
    /** Whether to enable backdrop blur effects (can make the app feel heavy if disabled) */
    enableBlur?: boolean;
    /** Whether to show poster tags like HD/4K/CC on the home screen library items */
    showPosterTags?: boolean;
    /** Whether to show genre tags on posters */
    showGenreTags?: boolean;
    /** Behavior of the top bar (sticky, hidden, transparent, etc) */
    topBarBehavior?: 'sticky' | 'fixed' | 'hidden';
    /** Settings for item detail pages */
    itemPage?: ItemPageSettings;
    /** Sections to display on the home screen, in order */
    homeScreenSections?: HomeScreenSection[];
    /** Id of the theme that is applied for all users by default */
    serverThemeId?: string;
    /** Custom name for the server to display in the UI */
    serverName?: string;
    /** URL for the light mode logo */
    logoLightUrl?: string;
    /** URL for the dark mode logo */
    logoDarkUrl?: string;
    /** Links to display in the UI */
    links?: ConfigLink[];
    /** IPTV M3U playlist URL */
    iptvM3uUrl?: string;
    /** IPTV EPG (XMLTV) URL */
    iptvEpgUrl?: string;
}

const DEFAULT_ITEM_PAGE_SETTINGS: ItemPageSettings = {
    episodeDisplay: 'row',
    detailBadges: ['ReleaseYear', 'CommunityRating', 'AgeRating', 'EpisodeNumber'],
    favoriteButton: ['Movie', 'Series'],
    showWatchlistButton: true,
    showDownloadButton: true,
};

const DEFAULT_CONFIG: AppConfig = {
    showStreamystatsButton: false,
    watchedStateBadgeHomeScreen: false,
    watchedStateBadgeLibrary: false,
    watchedStateBadgeGenre: false,
    watchedStateBadgeSearch: false,
    showContentAdvisory: true,
    showPauseOverlay: true,
    enableBlur: true,
    showPosterTags: true,
    showGenreTags: true,
    topBarBehavior: 'sticky',
    links: [],
    serverName: 'Palcia',
    logoLightUrl: '',
    logoDarkUrl: '',
    homeScreenSections: [
        // 1. HERO — visuelle Aufmerksamkeit, sofortiger Sog
        {
            type: 'mediaBar',
            size: 'large',
            items: {
                sortBy: ['Random'],
                types: ['Movie', 'Series'],
            },
            showFavoriteButton: true,
            showWatchlistButton: true,
        },
        // 2. ZEIGARNIK — angefangene Inhalte zuerst, erzeugt Drang zur Vollendung
        {
            type: 'continueWatching',
            titleLine: 'ItemTitleWithEpisodeInfo',
            detailLine: ['TimeRemaining'],
            accurateSorting: true,
            limit: 20,
        },
        // 3. SOCIAL PROOF / RANKING — die Top 10, erzeugt sofortige Orientierung
        {
            type: 'top10',
            title: 'Top 10 heute',
            items: {
                sortBy: ['PlayCount'],
                sortOrder: 'Descending',
                types: ['Movie', 'Series'],
                limit: 10,
            },
        },
        // 4+5. PERSONALISIERUNG — "Wir kennen dich", fühlt sich persönlich an
        {
            type: 'streamystatsRecommended',
            title: 'Nur für dich — Filme',
            recommendationType: 'Movie',
            limit: 20,
            showSimilarity: false,
            showBasedOn: false,
        },
        {
            type: 'streamystatsRecommended',
            title: 'Nur für dich — Serien',
            recommendationType: 'Series',
            limit: 20,
            showSimilarity: false,
            showBasedOn: false,
        },
        // 5b. ERINNERUNG — "weil du X geschaut hast", knüpft an die History an
        {
            type: 'becauseYouWatched',
            seedLimit: 3,
            limit: 12,
        },
        // 6. FOMO — frisch hinzugefügt, verpasst du das gerade?
        {
            type: 'recentlyAdded',
        },
        // 7+8. SOCIAL PROOF — "alle schauen das gerade", reduziert Entscheidungslähmung
        {
            type: 'items',
            title: 'Trending Filme',
            items: {
                sortBy: ['PlayCount'],
                sortOrder: 'Descending',
                limit: 20,
                types: ['Movie'],
            },
            detailFields: ['ReleaseYear'],
        },
        {
            type: 'items',
            title: 'Trending Serien',
            items: {
                sortBy: ['PlayCount'],
                sortOrder: 'Descending',
                limit: 20,
                types: ['Series'],
            },
            detailFields: ['ReleaseYear'],
        },
        // 9. MOOD-FILTER — Entdeckungszone für "ich weiß nicht was ich will"
        {
            type: 'moodBar',
            title: 'Wie ist deine Stimmung?',
            limit: 20,
        },
        // 10+11. QUALITÄTS-ANKER — "sichere" Auswahl, reduziert Risiko
        {
            type: 'items',
            title: 'Top bewertet — Filme',
            items: {
                sortBy: ['CommunityRating'],
                sortOrder: 'Descending',
                limit: 20,
                types: ['Movie'],
            },
            detailFields: ['CommunityRating'],
        },
        {
            type: 'items',
            title: 'Top bewertet — Serien',
            items: {
                sortBy: ['CommunityRating'],
                sortOrder: 'Descending',
                limit: 20,
                types: ['Series'],
            },
            detailFields: ['CommunityRating'],
        },
        // 12+13. NEUHEIT — kürzlich erschienen, für Aktualitäts-Affinität
        {
            type: 'items',
            title: 'Neu erschienen — Filme',
            items: {
                sortBy: ['PremiereDate'],
                sortOrder: 'Descending',
                limit: 20,
                types: ['Movie'],
            },
            detailFields: ['ReleaseYearAndMonth'],
        },
        {
            type: 'items',
            title: 'Neu erschienen — Serien',
            items: {
                sortBy: ['PremiereDate'],
                sortOrder: 'Descending',
                limit: 20,
                types: ['Series'],
            },
            detailFields: ['ReleaseYearAndMonth'],
        },
        // 14. GENRE-RABBIT-HOLE — deep browse für explorative User
        {
            type: 'genreRecommended',
            genreLimit: 5,
            limit: 10,
            mediaType: 'all',
            sortBy: ['CommunityRating'],
        },
        // 15+16. COMMITMENT-REMINDER — bereits getroffene Entscheidungen reaktivieren
        {
            type: 'items',
            title: 'Deine Watchlist',
            items: {
                isInKefinTweaksWatchlist: true,
                limit: 20,
            },
        },
        {
            type: 'items',
            title: 'Deine Favoriten',
            items: {
                isFavorite: true,
                limit: 20,
            },
        },
        // 17. POWER-USER — Studios für Entdecker ganz unten
        {
            type: 'studios',
            title: 'Studios',
            limit: 20,
        },
    ],
};

const CONFIG_QUERY_KEY = ['config'] as const;

const fetchConfig = async (): Promise<AppConfig> => {
    const response = await fetch('/api/config');
    if (!response.ok) {
        console.warn('Config file not found, using default configuration');
        return DEFAULT_CONFIG;
    }
    const data: AppConfig = await response.json();
    // Merge with defaults to ensure all required fields exist
    return {
        ...DEFAULT_CONFIG,
        ...data,
        itemPage: {
            ...DEFAULT_ITEM_PAGE_SETTINGS,
            ...data.itemPage,
        },
    };
};

export const useConfig = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: CONFIG_QUERY_KEY,
        queryFn: fetchConfig,
    });

    return {
        config: data ?? DEFAULT_CONFIG,
        loading: isLoading,
        error: error instanceof Error ? error.message : error ? String(error) : null,
    };
};

export const useUpdateConfig = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (newConfig: AppConfig): Promise<void> => {
            const response = await fetch(
                '/api/config?jellyfin_url=' + encodeURIComponent(getServerUrl() || ''),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: getAccessToken() || '',
                    },
                    body: JSON.stringify(newConfig),
                }
            );
            if (!response.ok) {
                throw new Error(`Failed to update config: ${response.statusText}`);
            }
        },
        onSuccess: (_data, newConfig) => {
            queryClient.setQueryData(CONFIG_QUERY_KEY, {
                ...DEFAULT_CONFIG,
                ...newConfig,
                itemPage: {
                    ...DEFAULT_ITEM_PAGE_SETTINGS,
                    ...newConfig.itemPage,
                },
            });
        },
    });

    return {
        updateConfig: mutation.mutateAsync,
        loading: mutation.isPending,
        error: mutation.error instanceof Error ? mutation.error.message : null,
    };
};
