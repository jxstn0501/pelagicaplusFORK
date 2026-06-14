import Page from '../Page';
import { useConfig } from '@/hooks/api/useConfig';
import { Earth } from 'lucide-react';

const SeerrPage = () => {
    const { config } = useConfig();

    if (!config?.seerrUrl) {
        return (
            <Page title="Seerr" className="flex-1 flex flex-col items-center">
                <div className="mt-16 flex flex-col items-center gap-4 text-muted-foreground">
                    <Earth className="h-12 w-12" />
                    <p className="text-lg font-medium">Seerr nicht konfiguriert</p>
                    <p className="text-sm text-center max-w-sm">
                        Bitte konfiguriere die Seerr-URL in den Einstellungen, um diese Funktion zu
                        nutzen.
                    </p>
                </div>
            </Page>
        );
    }

    return (
        <Page title="Seerr" pagePadding={false} className="flex-1 flex flex-col overflow-hidden">
            <iframe
                src={config.seerrUrl}
                title="Seerr"
                className="flex-1 w-full border-0 min-h-0"
                allow="fullscreen"
            />
        </Page>
    );
};

export default SeerrPage;
