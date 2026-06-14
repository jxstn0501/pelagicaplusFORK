import { memo, useEffect, useMemo, useState, useTransition, type JSX } from 'react';
import { useSearchParams } from 'react-router';
import Page from '../Page';
import { useSearchItems } from '@/hooks/api/useSearchItems';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';
import {
    CircleQuestionMark,
    Clapperboard,
    LayoutGrid,
    Music,
    SearchIcon,
    TriangleAlert,
    XIcon,
} from 'lucide-react';
import { ButtonGroup } from '@/components/ui/button-group';
import UnifiedGrid from './UnifiedGrid';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { useTranslation } from 'react-i18next';
import GenresGrid from './GenresGrid';
import { getUserId, getPassword, setPassword } from '@/utils/localstorageCredentials';
import { useConfig } from '@/hooks/api/useConfig';
import { useSeerrSearch } from '@/hooks/api/useSeerrSearch';
import { useSearchByGenreOrTag } from '@/hooks/api/useSearchByGenreOrTag';
import { useCurrentUser } from '@/hooks/api/useCurrentUser';
import SeerrGrid from './SeerrGrid';
import { Earth, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const LoadingSkeleton = memo(() => (
    <div className="mt-4 w-full max-w-7xl">
        <div className="w-full gap-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
            {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            ))}
        </div>
    </div>
));

type SearchTypeFilter = 'all' | 'movies-tv' | 'music' | 'seerr';
const ALL_TYPE_FILTERS: SearchTypeFilter[] = ['all', 'movies-tv', 'music']; // Note: 'seerr' will be added conditionally
const ITEM_TYPE_FILTER_MAP: Record<SearchTypeFilter, BaseItemKind[] | undefined> = {
    all: ['MusicAlbum', 'Movie', 'Series', 'Episode', 'Person'],
    'movies-tv': ['Movie', 'Series'],
    music: ['MusicAlbum'],
    seerr: undefined,
};
const ITEM_TYPE_FILTER_ICONS: Record<SearchTypeFilter, JSX.Element> = {
    all: <LayoutGrid />,
    'movies-tv': <Clapperboard />,
    music: <Music />,
    seerr: <Earth />,
};

const SearchPage = () => {
    const { t } = useTranslation('search');
    const queryClient = useQueryClient();
    const { config } = useConfig();
    const isSeerrEnabled = !!config?.seerrUrl;
    const availableFilters = isSeerrEnabled
        ? [...ALL_TYPE_FILTERS, 'seerr' as SearchTypeFilter]
        : ALL_TYPE_FILTERS;

    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
    const [typeFilter, setTypeFilter] = useState<SearchTypeFilter>(
        (searchParams.get('type') as SearchTypeFilter) || 'all'
    );
    const [, startTransition] = useTransition();

    const [passwordInput, setPasswordInput] = useState('');
    const [isAuthorizing, setIsAuthorizing] = useState(false);

    // Fallback if seerr is disabled but it was in the URL
    useEffect(() => {
        if (!isSeerrEnabled && typeFilter === 'seerr') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTypeFilter('all');
        }
    }, [isSeerrEnabled, typeFilter]);

    const itemTypes: BaseItemKind[] | undefined = ITEM_TYPE_FILTER_MAP[typeFilter];

    const {
        data: titleResults,
        isLoading: isJellyfinLoading,
        error: jellyfinError,
    } = useSearchItems(debouncedQuery, {
        itemTypes,
        limit: 50,
        userId: getUserId() || undefined,
        enabled: typeFilter !== 'seerr',
    });

    const { data: genreTagResults } = useSearchByGenreOrTag(debouncedQuery, {
        itemTypes,
        limit: 50,
        userId: getUserId() || undefined,
        enabled: typeFilter !== 'seerr',
    });

    const results = (() => {
        if (!titleResults && !genreTagResults) return undefined;
        const combined = [...(titleResults ?? []), ...(genreTagResults ?? [])];
        const seen = new Set<string>();
        return combined.filter((item) => {
            if (!item.Id || seen.has(item.Id)) return false;
            seen.add(item.Id);
            return true;
        });
    })();

    const { data: currentUser } = useCurrentUser();
    const {
        data: seerrResponse,
        isLoading: isSeerrLoading,
        error: seerrError,
    } = useSeerrSearch(debouncedQuery, currentUser?.Name || undefined);

    const isUnauthorized =
        isSeerrEnabled &&
        (debouncedQuery || typeFilter === 'seerr') &&
        (!getPassword() ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (seerrError as any)?.status === 401 ||
            seerrError?.message?.includes('Unauthorized') ||
            seerrError?.message?.includes('401'));

    const isLoading =
        (typeFilter !== 'seerr' && isJellyfinLoading) ||
        ((typeFilter === 'all' || typeFilter === 'seerr') && isSeerrLoading && !isUnauthorized);

    const error = typeFilter !== 'seerr' ? jellyfinError : null;

    const handleAuthorize = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordInput) return;
        setIsAuthorizing(true);
        try {
            setPassword(passwordInput);
            if (currentUser?.Name) {
                localStorage.setItem('jf_username', currentUser.Name);
            }
            await queryClient.invalidateQueries({ queryKey: ['seerrSearch'] });
            toast.success('Successfully authorized Seerr!');
            setPasswordInput('');
        } catch {
            toast.error('Failed to authorize. Please check your password.');
        } finally {
            setIsAuthorizing(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            startTransition(() => {
                setDebouncedQuery(query);
                const params = new URLSearchParams();
                if (query) params.set('q', query);
                params.set('type', typeFilter);
                setSearchParams(params, { replace: true });
            });
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [query, typeFilter, setSearchParams]);

    const seerrResults = seerrResponse?.results || [];
    const hasAnyResults =
        (results && results.length > 0) || (seerrResults && seerrResults.length > 0);

    const scoreItem = (name: string | null | undefined, q: string) => {
        if (!name) return 0;
        const n = name.toLowerCase();
        if (n === q) return 4;
        if (n.startsWith(q)) return 3;
        if (n.includes(q)) return 2;
        if (q.split(' ').every((w) => n.includes(w))) return 1;
        return 0;
    };

    const SECTIONS = useMemo(
        () =>
            [
                {
                    key: 'moviesTv',
                    labelKey: 'group_moviesTv',
                    types: ['Movie', 'Series'] as BaseItemKind[],
                    showFor: ['all', 'movies-tv'] as SearchTypeFilter[],
                },
                {
                    key: 'episodes',
                    labelKey: 'group_episodes',
                    types: ['Episode'] as BaseItemKind[],
                    showFor: ['all'] as SearchTypeFilter[],
                },
                {
                    key: 'music',
                    labelKey: 'group_music',
                    types: ['MusicAlbum'] as BaseItemKind[],
                    showFor: ['all', 'music'] as SearchTypeFilter[],
                },
                {
                    key: 'people',
                    labelKey: 'group_people',
                    types: ['Person'] as BaseItemKind[],
                    showFor: ['all'] as SearchTypeFilter[],
                },
            ] as const,
        []
    );

    const sectionItems = useMemo(() => {
        if (!results) return {};
        const q = debouncedQuery.toLowerCase().trim();
        const out: Record<string, typeof results> = {};
        for (const section of SECTIONS) {
            const filtered = results.filter((item) =>
                section.types.includes(item.Type as BaseItemKind)
            );
            out[section.key] = q
                ? [...filtered].sort((a, b) => scoreItem(b.Name, q) - scoreItem(a.Name, q))
                : filtered;
        }
        return out;
    }, [results, debouncedQuery, SECTIONS]);

    return (
        <Page title="Search" className="flex-1 flex flex-col items-center">
            <ButtonGroup className="w-full mt-0.5 max-w-2xl mb-1">
                <InputGroup className="grow">
                    <InputGroupAddon>
                        <SearchIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                        placeholder={t('input_placeholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    <InputGroupAddon hidden={!query} align={'inline-end'}>
                        <Button variant={'ghost'} size={'icon-sm'} onClick={() => setQuery('')}>
                            <XIcon />
                        </Button>
                    </InputGroupAddon>
                </InputGroup>
                <Select
                    value={typeFilter}
                    onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
                >
                    <SelectTrigger className="min-w-30 sm:min-w-40">
                        <SelectValue placeholder="Types" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableFilters.map((filter) => (
                            <SelectItem key={filter} value={filter}>
                                {ITEM_TYPE_FILTER_ICONS[filter]}
                                {filter === 'seerr' ? 'Seerr' : t('typefilter_' + filter)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </ButtonGroup>
            {isLoading && <LoadingSkeleton />}
            {error && (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <TriangleAlert />
                        </EmptyMedia>
                        <EmptyTitle>{t('unexpected_error')}</EmptyTitle>
                        <EmptyDescription>{t('error_occurred_while_searching')}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
            {!isLoading && !error && !hasAnyResults && debouncedQuery && !isUnauthorized && (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <CircleQuestionMark />
                        </EmptyMedia>
                        <EmptyTitle>{t('no_results')}</EmptyTitle>
                        <EmptyDescription>{t('no_results_description')}</EmptyDescription>
                        <EmptyContent>
                            <Button variant={'link'} onClick={() => setQuery('')}>
                                {t('clear_search')}
                            </Button>
                        </EmptyContent>
                    </EmptyHeader>
                </Empty>
            )}
            {typeFilter !== 'seerr' &&
                SECTIONS.filter((s) => s.showFor.includes(typeFilter)).map((section) => {
                    const items = sectionItems[section.key];
                    if (!items || items.length === 0) return null;
                    return (
                        <div key={section.key} className="mt-4 w-full max-w-7xl text-left">
                            <h2 className="text-xl font-semibold mb-2">{t(section.labelKey)}</h2>
                            <UnifiedGrid items={items} />
                        </div>
                    );
                })}
            {seerrResults.length > 0 && (typeFilter === 'all' || typeFilter === 'seerr') && (
                <div className="mt-4 w-full max-w-7xl text-left">
                    <h2 className="text-xl font-semibold mb-2">Seerr</h2>
                    <SeerrGrid items={seerrResults} />
                </div>
            )}
            {isUnauthorized && (typeFilter === 'all' || typeFilter === 'seerr') && (
                <div className="mt-6 w-full max-w-2xl p-6 rounded-xl border border-border bg-card/65 backdrop-blur-md shadow-lg flex flex-col gap-4">
                    <div className="flex items-start gap-4 text-left">
                        <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
                            <Earth className="h-6 w-6" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <h3 className="text-lg font-semibold text-foreground">
                                Authorize Seerr Integration
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                                Enter your Jellyfin password to enable searching and requesting
                                media directly from Seerr.
                            </p>
                        </div>
                    </div>
                    <form
                        onSubmit={handleAuthorize}
                        className="flex flex-col sm:flex-row gap-3 mt-1"
                    >
                        <Input
                            type="password"
                            placeholder="Jellyfin Password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="flex-1"
                            required
                        />
                        <Button type="submit" disabled={isAuthorizing} className="px-6 shrink-0">
                            {isAuthorizing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Authorizing...
                                </>
                            ) : (
                                'Authorize'
                            )}
                        </Button>
                    </form>
                </div>
            )}
            {!debouncedQuery && !isLoading && <GenresGrid />}
        </Page>
    );
};

export default SearchPage;
