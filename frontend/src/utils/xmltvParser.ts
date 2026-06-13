export interface EPGProgram {
    channelId: string;
    start: Date;
    stop: Date;
    title: string;
    description?: string;
    category?: string;
    icon?: string;
}

export interface EPGChannel {
    id: string;
    name: string;
    icon?: string;
}

export interface EPGData {
    channels: EPGChannel[];
    programs: EPGProgram[];
}

function parseXMLTVDate(dateStr: string): Date {
    // Format: YYYYMMDDHHmmss +ZZZZ or YYYYMMDDHHmmss
    const clean = dateStr.trim();
    const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/.exec(clean);
    if (!match) return new Date(clean);

    const [, year, month, day, hour, min, sec, tz] = match;
    const isoStr = `${year}-${month}-${day}T${hour}:${min}:${sec}${tz || '+0000'}`;
    return new Date(isoStr.replace(/([+-])(\d{2})(\d{2})$/, '$1$2:$3'));
}

function getTextContent(el: Element, tag: string): string {
    const child = el.querySelector(tag);
    return child?.textContent?.trim() ?? '';
}

function getAttr(el: Element, attr: string): string {
    return el.getAttribute(attr) ?? '';
}

export function parseXMLTV(xmlContent: string): EPGData {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    const channels: EPGChannel[] = [];
    const programs: EPGProgram[] = [];

    doc.querySelectorAll('channel').forEach((ch) => {
        const id = getAttr(ch, 'id');
        const name = getTextContent(ch, 'display-name');
        const iconEl = ch.querySelector('icon');
        channels.push({
            id,
            name,
            icon: iconEl ? getAttr(iconEl, 'src') : undefined,
        });
    });

    doc.querySelectorAll('programme').forEach((prog) => {
        const channelId = getAttr(prog, 'channel');
        const startStr = getAttr(prog, 'start');
        const stopStr = getAttr(prog, 'stop');

        const iconEl = prog.querySelector('icon');
        const categoryEl = prog.querySelector('category');

        programs.push({
            channelId,
            start: parseXMLTVDate(startStr),
            stop: parseXMLTVDate(stopStr),
            title: getTextContent(prog, 'title'),
            description: getTextContent(prog, 'desc') || undefined,
            category: categoryEl?.textContent?.trim() || undefined,
            icon: iconEl ? getAttr(iconEl, 'src') : undefined,
        });
    });

    return { channels, programs };
}

export function getProgramsForChannel(
    epgData: EPGData,
    channelId: string,
    date: Date = new Date()
): EPGProgram[] {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return epgData.programs.filter(
        (p) => p.channelId === channelId && p.stop > dayStart && p.start < dayEnd
    );
}

export function getCurrentProgram(epgData: EPGData, channelId: string): EPGProgram | null {
    const now = new Date();
    return (
        epgData.programs.find((p) => p.channelId === channelId && p.start <= now && p.stop > now) ??
        null
    );
}
