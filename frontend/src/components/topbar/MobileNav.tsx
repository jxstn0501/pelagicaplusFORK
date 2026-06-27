import { Link, useNavigate } from 'react-router';
import {
    Bookmark,
    ChartLine,
    Heart,
    Home,
    Library,
    Search,
    Tv2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfig } from '@/hooks/api/useConfig';
import { useUserViews } from '@/hooks/api/useUserViews';
import { SUPPORTED_LIBRARY_COLLECTION_TYPES } from '@/utils/supportedLibraryCollectionTypes';
import JellyfinLibraryIcon from '@/components/JellyfinLibraryIcon';
import { DynamicIcon, type IconName } from 'lucide-react/dynamic';
import { useTranslation } from 'react-i18next';

const MobileNav = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation('sidebar');
    const navigate = useNavigate();
    const { config } = useConfig();
    const { data: views } = useUserViews();

    const libraries =
        views?.Items?.filter((lib) =>
            SUPPORTED_LIBRARY_COLLECTION_TYPES.includes(lib.CollectionType!)
        ) ?? [];

    const validLinks = config?.links?.filter((l) => l.url && l.text) ?? [];

    return (
        <div className="md:hidden border-t px-3 py-3 flex flex-col gap-1 bg-background shadow-lg">
            <Button asChild variant="ghost" className="justify-start" onClick={onClose}>
                <Link to="/">
                    <Home className="h-4 w-4" />
                    {t('home')}
                </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start" onClick={onClose}>
                <Link to="/library">
                    <Library className="h-4 w-4" />
                    {t('library')}
                </Link>
            </Button>
            {libraries.map((lib) => (
                <Button
                    key={lib.Id}
                    asChild
                    variant="ghost"
                    className="justify-start pl-8"
                    onClick={onClose}
                >
                    <Link to={`/library?library=${lib.Id}`}>
                        <JellyfinLibraryIcon libraryType={lib.CollectionType} />
                        {lib.Name}
                    </Link>
                </Button>
            ))}
            <Button asChild variant="ghost" className="justify-start" onClick={onClose}>
                <Link to="/my-list">
                    <Bookmark className="h-4 w-4" />
                    Meine Liste
                </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start" onClick={onClose}>
                <Link to="/likes">
                    <Heart className="h-4 w-4" />
                    Likes
                </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start" onClick={onClose}>
                <Link to="/search">
                    <Search className="h-4 w-4" />
                    {t('search')}
                </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start" onClick={onClose}>
                <Link to="/iptv">
                    <Tv2 className="h-4 w-4" />
                    IPTV
                </Link>
            </Button>
            {config?.streamystatsUrl && config?.showStreamystatsButton && (
                <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                        window.open(config.streamystatsUrl, '_blank', 'noopener,noreferrer');
                        onClose();
                    }}
                >
                    <ChartLine className="h-4 w-4" />
                    Streamystats
                </Button>
            )}
            {validLinks.map((link, i) => (
                <Button
                    key={i}
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                        if (config?.seerrUrl && link.url === config.seerrUrl) {
                            navigate('/seerr');
                        } else {
                            window.open(link.url, '_blank', 'noopener,noreferrer');
                        }
                        onClose();
                    }}
                >
                    <DynamicIcon
                        name={(link.icon || 'link-2') as IconName}
                        className="h-4 w-4"
                    />
                    {link.text}
                </Button>
            ))}
        </div>
    );
};

export default MobileNav;
