import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Menu, Shuffle, X } from 'lucide-react';
import { useRandomItem } from '@/hooks/api/useRandomItem';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useConfig } from '@/hooks/api/useConfig';
import { useTheme } from '@/components/theme-provider';
import { getEffectiveTheme } from '@/utils/effectiveTheme';
import UserMenu from './topbar/UserMenu';
import DesktopNav from './topbar/DesktopNav';
import MobileNav from './topbar/MobileNav';
import NavSearchBar from './topbar/NavSearchBar';

const TopBar = (_props: { overlay?: boolean }) => {
    void _props;
    const { config } = useConfig();
    const { theme } = useTheme();
    const effectiveTheme = getEffectiveTheme(theme);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [randomEnabled, setRandomEnabled] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: randomItem, isFetching: isRandomFetching } = useRandomItem(
        ['Movie', 'Series'],
        randomEnabled
    );

    useEffect(() => {
        if (randomEnabled && !isRandomFetching && randomItem) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRandomEnabled(false);
            navigate(`/item/${randomItem.Id}`);
        }
    }, [randomEnabled, isRandomFetching, randomItem, navigate]);

    const handleRandomClick = async () => {
        await queryClient.invalidateQueries({ queryKey: ['random-item', ['Movie', 'Series']] });
        setRandomEnabled(true);
    };

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const defaultLogo = effectiveTheme === 'dark' ? '/logo.svg' : '/logo-dark.svg';
    const configuredLogo =
        effectiveTheme === 'dark' ? config?.logoDarkUrl || '' : config?.logoLightUrl || '';
    const logoSrc = configuredLogo || defaultLogo;

    return (
        <header
            className="fixed top-0 z-50 w-full"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div
                className={`relative flex h-14 items-center gap-2 px-4 sm:px-12 transition-all duration-500 border-b ${
                    scrolled
                        ? 'border-border bg-background/80 backdrop-blur shadow-md'
                        : 'border-transparent bg-transparent backdrop-blur-none'
                }`}
            >
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 shrink-0 mr-2">
                    <Avatar className="h-7 w-7 p-0.5 rounded-md">
                        <AvatarImage src={logoSrc} alt="logo" />
                        <AvatarFallback className="rounded-md text-xs">PE</AvatarFallback>
                    </Avatar>
                </Link>

                <DesktopNav />

                <div className="flex-1" />

                <NavSearchBar />

                {/* Random item button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRandomClick}
                    disabled={isRandomFetching}
                    title="Zufälliger Inhalt"
                    className="hidden md:flex"
                >
                    <Shuffle className={`h-4 w-4 ${isRandomFetching ? 'animate-spin' : ''}`} />
                </Button>

                <UserMenu />

                {/* Mobile hamburger */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setMobileOpen((v) => !v)}
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {mobileOpen && <MobileNav onClose={() => setMobileOpen(false)} />}
        </header>
    );
};

export default TopBar;
