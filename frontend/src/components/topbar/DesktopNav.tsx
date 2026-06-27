import { Link, useNavigate } from 'react-router';
import {
    Bookmark,
    ChartLine,
    Heart,
    House,
    Library,
    Search,
    Tv2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfig } from '@/hooks/api/useConfig';
import { DynamicIcon, type IconName } from 'lucide-react/dynamic';
import { useTranslation } from 'react-i18next';

const DesktopNav = () => {
    const { t } = useTranslation('sidebar');
    const navigate = useNavigate();
    const { config } = useConfig();

    const validLinks = config?.links?.filter((l) => l.url && l.text) ?? [];

    return (
        <nav className="hidden md:flex items-center gap-0.5">
            <Button asChild variant="ghost" size="sm">
                <Link to="/">
                    <House className="h-4 w-4" />
                    {t('home')}
                </Link>
            </Button>

            <Button asChild variant="ghost" size="sm">
                <Link to="/library">
                    <Library className="h-4 w-4" />
                    {t('library')}
                </Link>
            </Button>

            <Button asChild variant="ghost" size="sm">
                <Link to="/my-list">
                    <Bookmark className="h-4 w-4" />
                    Meine Liste
                </Link>
            </Button>

            <Button asChild variant="ghost" size="sm">
                <Link to="/likes">
                    <Heart className="h-4 w-4" />
                    Likes
                </Link>
            </Button>

            <Button asChild variant="ghost" size="sm">
                <Link to="/search">
                    <Search className="h-4 w-4" />
                    {t('search')}
                </Link>
            </Button>

            <Button asChild variant="ghost" size="sm">
                <Link to="/iptv">
                    <Tv2 className="h-4 w-4" />
                    IPTV
                </Link>
            </Button>

            {config?.streamystatsUrl && config?.showStreamystatsButton && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        window.open(config.streamystatsUrl, '_blank', 'noopener,noreferrer')
                    }
                >
                    <ChartLine className="h-4 w-4" />
                    Streamystats
                </Button>
            )}

            {validLinks.map((link, i) => (
                <Button
                    key={i}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        if (config?.seerrUrl && link.url === config.seerrUrl) {
                            navigate('/seerr');
                        } else {
                            window.open(link.url, '_blank', 'noopener,noreferrer');
                        }
                    }}
                >
                    <DynamicIcon
                        name={(link.icon || 'link-2') as IconName}
                        className="h-4 w-4"
                    />
                    {link.text}
                </Button>
            ))}
        </nav>
    );
};

export default DesktopNav;
