import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ShortcutRow {
    keys: string[];
    description: string;
}

const GLOBAL_SHORTCUTS: ShortcutRow[] = [
    { keys: ['Ctrl', 'K'], description: 'Suche öffnen' },
    { keys: ['S'], description: 'Zur Suchseite navigieren' },
    { keys: ['R'], description: 'Zufälliges Element öffnen' },
    { keys: ['?'], description: 'Shortcuts anzeigen' },
];

const PLAYER_SHORTCUTS: ShortcutRow[] = [
    { keys: ['Space', 'K'], description: 'Play / Pause' },
    { keys: ['←'], description: '10 Sekunden zurück' },
    { keys: ['→'], description: '10 Sekunden vor' },
    { keys: ['M'], description: 'Ton an/aus' },
    { keys: ['F'], description: 'Vollbild' },
    { keys: ['P'], description: 'Bild-im-Bild' },
];

interface Props {
    open: boolean;
    onClose: () => void;
}

const Key = ({ label }: { label: string }) => (
    <kbd className="inline-flex items-center justify-center px-2 py-0.5 rounded border border-white/20 bg-white/10 text-xs font-mono text-white/90 min-w-[28px]">
        {label}
    </kbd>
);

const ShortcutList = ({ rows }: { rows: ShortcutRow[] }) => (
    <div className="flex flex-col gap-2">
        {rows.map((row) => (
            <div key={row.description} className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">{row.description}</span>
                <div className="flex items-center gap-1 shrink-0">
                    {row.keys.map((k, i) => (
                        <span key={k} className="flex items-center gap-1">
                            {i > 0 && <span className="text-xs text-muted-foreground">/</span>}
                            <Key label={k} />
                        </span>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

export const KeyboardShortcutsOverlay = ({ open, onClose }: Props) => {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Tastenkürzel</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6 mt-2">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            Global
                        </p>
                        <ShortcutList rows={GLOBAL_SHORTCUTS} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            Player
                        </p>
                        <ShortcutList rows={PLAYER_SHORTCUTS} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
