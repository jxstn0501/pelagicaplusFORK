import { useState, useEffect, useTransition } from 'react';
import Page from '../Page';
import { useConfig } from '@/hooks/api/useConfig';
import { useSeerrSearch } from '@/hooks/api/useSeerrSearch';
import { useCurrentUser } from '@/hooks/api/useCurrentUser';
import { getPassword, setPassword } from '@/utils/localstorageCredentials';
import SeerrGrid from '../Search/SeerrGrid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SearchIcon, XIcon, Earth, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router';

const LoadingSkeleton = () => (
    <div className="space-y-8 mt-4 w-full max-w-7xl">
        <div className="w-full gap-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((item) => (
                <div key={item} className="space-y-2">
                    <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            ))}
        </div>
    </div>
);

const SeerrPage = () => {
    const queryClient = useQueryClient();
    const { config } = useConfig();
    const { data: currentUser } = useCurrentUser();
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
    const [, startTransition] = useTransition();
    const [passwordInput, setPasswordInput] = useState('');
    const [isAuthorizing, setIsAuthorizing] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            startTransition(() => {
                setDebouncedQuery(query);
                const params = new URLSearchParams();
                if (query) params.set('q', query);
                setSearchParams(params, { replace: true });
            });
        }, 300);
        return () => clearTimeout(handler);
    }, [query, setSearchParams]);

    const {
        data: seerrResponse,
        isLoading,
        error: seerrError,
    } = useSeerrSearch(debouncedQuery, currentUser?.Name || undefined);

    const isUnauthorized =
        !!config?.seerrUrl &&
        (!getPassword() ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (seerrError as any)?.status === 401 ||
            seerrError?.message?.includes('Unauthorized') ||
            seerrError?.message?.includes('401'));

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
            toast.success('Seerr erfolgreich autorisiert!');
            setPasswordInput('');
        } catch {
            toast.error('Autorisierung fehlgeschlagen. Bitte Passwort prüfen.');
        } finally {
            setIsAuthorizing(false);
        }
    };

    if (!config?.seerrUrl) {
        return (
            <Page title="Seerr" className="flex-1 flex flex-col items-center">
                <div className="mt-16 flex flex-col items-center gap-4 text-muted-foreground">
                    <Earth className="h-12 w-12" />
                    <p className="text-lg font-medium">Seerr nicht konfiguriert</p>
                    <p className="text-sm text-center max-w-sm">
                        Bitte konfiguriere die Seerr-URL in den Einstellungen, um diese Funktion zu nutzen.
                    </p>
                </div>
            </Page>
        );
    }

    const seerrResults = seerrResponse?.results || [];

    return (
        <Page title="Seerr" className="flex-1 flex flex-col items-center">
            <InputGroup className="w-full mt-0.5 max-w-2xl mb-4">
                <InputGroupAddon>
                    <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                    placeholder="Filme und Serien suchen..."
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

            {isLoading && debouncedQuery && <LoadingSkeleton />}

            {isUnauthorized && (
                <div className="mt-6 w-full max-w-2xl p-6 rounded-xl border border-border bg-card/65 backdrop-blur-md shadow-lg flex flex-col gap-4">
                    <div className="flex items-start gap-4 text-left">
                        <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
                            <Earth className="h-6 w-6" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <h3 className="text-lg font-semibold text-foreground">
                                Seerr autorisieren
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                                Gib dein Jellyfin-Passwort ein, um Seerr zu aktivieren.
                            </p>
                        </div>
                    </div>
                    <form
                        onSubmit={handleAuthorize}
                        className="flex flex-col sm:flex-row gap-3 mt-1"
                    >
                        <Input
                            type="password"
                            placeholder="Jellyfin Passwort"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="flex-1"
                            required
                        />
                        <Button type="submit" disabled={isAuthorizing} className="px-6 shrink-0">
                            {isAuthorizing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Autorisiere...
                                </>
                            ) : (
                                'Autorisieren'
                            )}
                        </Button>
                    </form>
                </div>
            )}

            {!isLoading && seerrResults.length > 0 && (
                <div className="mt-2 w-full max-w-7xl text-left">
                    <SeerrGrid items={seerrResults} />
                </div>
            )}

            {!debouncedQuery && !isUnauthorized && (
                <div className="mt-16 flex flex-col items-center gap-4 text-muted-foreground">
                    <Earth className="h-12 w-12" />
                    <p className="text-lg font-medium">Medien über Seerr suchen</p>
                    <p className="text-sm text-center max-w-sm">
                        Suche nach Filmen und Serien, um sie direkt über Seerr anzufordern.
                    </p>
                </div>
            )}

            {!isLoading && debouncedQuery && seerrResults.length === 0 && !isUnauthorized && (
                <div className="mt-16 flex flex-col items-center gap-4 text-muted-foreground">
                    <p className="text-lg font-medium">Keine Ergebnisse gefunden</p>
                </div>
            )}
        </Page>
    );
};

export default SeerrPage;
