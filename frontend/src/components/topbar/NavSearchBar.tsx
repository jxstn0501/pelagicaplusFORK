import { useState, useRef, useEffect, useTransition } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { useSearchItems } from '@/hooks/api/useSearchItems';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import { getUserId } from '@/utils/localstorageCredentials';
import { useTranslation } from 'react-i18next';

const NavSearchBar = () => {
    const { t } = useTranslation('sidebar');
    const navigate = useNavigate();
    const [navQuery, setNavQuery] = useState('');
    const [debouncedNavQuery, setDebouncedNavQuery] = useState('');
    const [navOpen, setNavOpen] = useState(false);
    const [, startNavTransition] = useTransition();
    const navRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            startNavTransition(() => setDebouncedNavQuery(navQuery));
        }, 250);
        return () => clearTimeout(timer);
    }, [navQuery]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) {
                setNavOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const { data: navResults, isLoading: navLoading } = useSearchItems(debouncedNavQuery, {
        itemTypes: ['Movie', 'Series'],
        limit: 6,
        userId: getUserId() || undefined,
        enabled: debouncedNavQuery.length > 1,
    });

    return (
        <div ref={navRef} className="relative hidden md:block">
            <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    value={navQuery}
                    onChange={(e) => {
                        setNavQuery(e.target.value);
                        setNavOpen(true);
                    }}
                    onFocus={() => setNavOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            setNavOpen(false);
                            navigate(
                                navQuery.trim()
                                    ? `/search?q=${encodeURIComponent(navQuery.trim())}`
                                    : '/search'
                            );
                        } else if (e.key === 'Escape') {
                            setNavOpen(false);
                        }
                    }}
                    placeholder={t('search')}
                    className="h-8 w-44 pl-8 pr-3 rounded-md border border-muted bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-56 transition-all duration-200"
                />
            </div>
            {navOpen && navQuery.length > 1 && (
                <div className="absolute top-full mt-1 right-0 w-72 rounded-md border border-border bg-popover shadow-lg z-50 overflow-hidden">
                    {navLoading ? (
                        <div className="flex flex-col gap-2 p-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-2 p-1">
                                    <div className="w-8 h-12 rounded bg-muted animate-pulse shrink-0" />
                                    <div className="flex flex-col gap-1 flex-1">
                                        <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                                        <div className="h-2 w-1/2 rounded bg-muted animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : navResults && navResults.length > 0 ? (
                        <>
                            <div className="flex flex-col">
                                {navResults.map((item) => {
                                    const imageUrl = getPrimaryImageUrl(item.Id!, {
                                        width: 64,
                                        height: 96,
                                    });
                                    return (
                                        <button
                                            key={item.Id}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-accent text-left transition-colors"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setNavOpen(false);
                                                setNavQuery('');
                                                navigate(`/item/${item.Id}`);
                                            }}
                                        >
                                            <div className="w-8 h-12 rounded overflow-hidden shrink-0 bg-muted">
                                                <img
                                                    src={imageUrl}
                                                    alt={item.Name || ''}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (
                                                            e.target as HTMLImageElement
                                                        ).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium truncate">
                                                    {item.Name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {item.ProductionYear} ·{' '}
                                                    {item.Type === 'Movie' ? 'Film' : 'Serie'}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                className="w-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent border-t border-border text-center transition-colors"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setNavOpen(false);
                                    navigate(`/search?q=${encodeURIComponent(navQuery.trim())}`);
                                }}
                            >
                                Alle Ergebnisse für „{navQuery}" anzeigen →
                            </button>
                        </>
                    ) : (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                            Keine Ergebnisse
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NavSearchBar;
