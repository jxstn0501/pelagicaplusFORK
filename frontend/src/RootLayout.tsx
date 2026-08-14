import { Outlet } from 'react-router';
import { AppJellyfinSocket } from './components/AppJellyfinSocket';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { SearchCommand } from './components/SearchCommand';
import PelagicaThemeLoader from './components/PelagicaThemeProvider';
import { Toaster } from './components/ui/sonner';
import StatsConsentModal from './components/StatsConsentModal';
import { AppPreloader } from './components/AppPreloader';

// AppJellyfinSocket and SearchCommand call useNavigate(), so this global
// chrome must live inside the router (as the root layout route) rather than
// as siblings of <BrowserRouter> like before — required for the data router
// mode that react-router's viewTransition option needs.
export function RootLayout() {
    return (
        <>
            <AppJellyfinSocket />
            <KeyboardShortcuts />
            <SearchCommand />
            <PelagicaThemeLoader />
            <Toaster />
            <StatsConsentModal />
            <AppPreloader>
                <Outlet />
            </AppPreloader>
        </>
    );
}
