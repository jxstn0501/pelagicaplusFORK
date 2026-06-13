export interface M3UChannel {
    id: string;
    name: string;
    logo: string;
    group: string;
    url: string;
    language?: string;
    country?: string;
    epgUrl?: string;
}

function parseAttribute(line: string, attr: string): string {
    const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
    const match = regex.exec(line);
    return match ? match[1] : '';
}

export function parseM3U(content: string): M3UChannel[] {
    const lines = content.split(/\r?\n/);
    const channels: M3UChannel[] = [];

    let currentInfo: Partial<M3UChannel> | null = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('#EXTINF:')) {
            const commaIdx = trimmed.indexOf(',');
            const metaPart = commaIdx > 0 ? trimmed.slice(0, commaIdx) : trimmed;
            const displayName = commaIdx > 0 ? trimmed.slice(commaIdx + 1).trim() : '';

            currentInfo = {
                id: parseAttribute(metaPart, 'tvg-id') || displayName,
                name: parseAttribute(metaPart, 'tvg-name') || displayName,
                logo: parseAttribute(metaPart, 'tvg-logo'),
                group: parseAttribute(metaPart, 'group-title'),
                language: parseAttribute(metaPart, 'tvg-language') || undefined,
                country: parseAttribute(metaPart, 'tvg-country') || undefined,
                epgUrl: parseAttribute(metaPart, 'url-tvg') || undefined,
            };
            if (!currentInfo.name) currentInfo.name = displayName;
        } else if (!trimmed.startsWith('#') && currentInfo) {
            channels.push({
                id: currentInfo.id || trimmed,
                name: currentInfo.name || trimmed,
                logo: currentInfo.logo || '',
                group: currentInfo.group || 'Ungrouped',
                url: trimmed,
                language: currentInfo.language,
                country: currentInfo.country,
                epgUrl: currentInfo.epgUrl,
            });
            currentInfo = null;
        }
    }

    return channels;
}

export function groupChannels(channels: M3UChannel[]): Record<string, M3UChannel[]> {
    return channels.reduce(
        (acc, ch) => {
            const group = ch.group || 'Ungrouped';
            if (!acc[group]) acc[group] = [];
            acc[group].push(ch);
            return acc;
        },
        {} as Record<string, M3UChannel[]>
    );
}
