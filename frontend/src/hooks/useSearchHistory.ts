import { useState, useCallback } from 'react';

const STORAGE_KEY = 'searchHistory';
const MAX_ENTRIES = 8;

function load(): string[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

export function useSearchHistory() {
    const [history, setHistory] = useState<string[]>(load);

    const addEntry = useCallback((query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        setHistory((prev) => {
            const deduped = [trimmed, ...prev.filter((e) => e !== trimmed)].slice(0, MAX_ENTRIES);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
            return deduped;
        });
    }, []);

    const removeEntry = useCallback((query: string) => {
        setHistory((prev) => {
            const updated = prev.filter((e) => e !== query);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const clearHistory = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setHistory([]);
    }, []);

    return { history, addEntry, removeEntry, clearHistory };
}
