import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface SeerrIframeDialogProps {
    url: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SeerrIframeDialog({ url, open, onOpenChange }: SeerrIframeDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-6xl h-[calc(100vh-4rem)] max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
                <DialogTitle className="sr-only">Seerr</DialogTitle>
                <div className="flex items-center justify-between px-3 py-2 border-b bg-background shrink-0 gap-2">
                    <span className="text-sm font-medium text-muted-foreground truncate">
                        {url}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon-sm" variant="ghost" asChild title="In neuem Tab öffnen">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </Button>
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            title="Schließen"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <iframe
                    src={url}
                    className="flex-1 w-full border-0"
                    title="Seerr"
                    allow="fullscreen"
                />
            </DialogContent>
        </Dialog>
    );
}
