import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider.tsx';
import { createBrowserRouter, RouterProvider } from 'react-router';
import HomePage from './pages/Home/HomePage.tsx';
import LoginPage from './pages/Login/LoginPage.tsx';

import './index.css';
import './theme.css';
import './i18n.ts';
import LibraryPage from './pages/Library/LibraryPage.tsx';
import { SearchProvider } from './context/SearchProvider.tsx';
import ItemPage from './pages/Item/ItemPage.tsx';
import StudioPage from './pages/Item/StudioPage.tsx';
import NotFoundPage from './pages/NotFound/NotFoundPage.tsx';
import PlayerPage from './pages/Player/PlayerPage.tsx';
import PersonPage from './pages/Person/PersonPage.tsx';
import { MusicPlaybackProvider } from './context/MusicPlaybackProvider.tsx';
import SettingsPage from './pages/Settings/SettingsPage.tsx';
import SearchPage from './pages/Search/SearchPage.tsx';
import ThemeBrowserPage from './pages/ThemeBroser/ThemeBrowserPage.tsx';
import AllStudiosPage from './pages/Studios/AllStudiosPage.tsx';
import AllItemsPage from './pages/Items/AllItemsPage.tsx';
import MyListPage from './pages/MyList/MyListPage.tsx';
import LikesPage from './pages/Likes/LikesPage.tsx';
import SeerrPage from './pages/Seerr/SeerrPage.tsx';
import IPTVPage from './pages/IPTV/IPTVPage.tsx';
import RemotePage from './pages/Remote/RemotePage.tsx';
import { RootLayout } from './RootLayout.tsx';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes cache validity
            refetchOnWindowFocus: false, // disable refetch on window focus
        },
    },
});

const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            { path: '/', element: <HomePage /> },
            { path: '/library', element: <LibraryPage /> },
            { path: '/my-list', element: <MyListPage /> },
            { path: '/likes', element: <LikesPage /> },
            { path: '/item/:itemId', element: <ItemPage /> },
            { path: '/items', element: <AllItemsPage /> },
            { path: '/studios', element: <AllStudiosPage /> },
            { path: '/studio/:studioId', element: <StudioPage /> },
            { path: '/person/:itemId', element: <PersonPage /> },
            { path: '/login', element: <LoginPage /> },
            { path: '/play/:itemId', element: <PlayerPage /> },
            { path: '/settings', element: <SettingsPage /> },
            { path: '/browse-themes', element: <ThemeBrowserPage /> },
            { path: '/search', element: <SearchPage /> },
            { path: '/seerr', element: <SeerrPage /> },
            { path: '/iptv', element: <IPTVPage /> },
            { path: '/remote', element: <RemotePage /> },
            { path: '*', element: <NotFoundPage /> },
        ],
    },
]);

createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
        <ThemeProvider>
            <MusicPlaybackProvider>
                <SearchProvider>
                    <RouterProvider router={router} />
                </SearchProvider>
            </MusicPlaybackProvider>
        </ThemeProvider>
    </QueryClientProvider>
);
