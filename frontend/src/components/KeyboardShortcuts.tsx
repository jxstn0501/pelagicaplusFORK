import { useEffect, useState } from 'react';
import { useSearch } from '@/context/SearchContext';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';

export const KeyboardShortcuts = () => {
    const { openSearch } = useSearch();
    const [showOverlay, setShowOverlay] = useState(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            const isEditable =
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                (e.target as HTMLElement)?.isContentEditable;

            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                openSearch();
                return;
            }

            if (!isEditable && e.key === '?') {
                e.preventDefault();
                setShowOverlay((prev) => !prev);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [openSearch]);

    return <KeyboardShortcutsOverlay open={showOverlay} onClose={() => setShowOverlay(false)} />;
};
