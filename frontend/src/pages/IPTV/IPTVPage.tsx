import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { parseM3U, groupChannels, type M3UChannel } from '@/utils/m3uParser';
import { parseXMLTV, getCurrentProgram, getProgramsForChannel, type EPGData, type EPGProgram } from '@/utils/xmltvParser';
import { useConfig } from '@/hooks/api/useConfig';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Tv2, ChevronRight, ChevronDown, Calendar, X, Loader2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import Page from '../Page';

// ─── EPG Grid ────────────────────────────────────────────────────────────────

const HOUR_WIDTH_PX = 180;
const CHANNEL_LABEL_W = 160;
const ROW_HEIGHT = 56;

function formatTime(d: Date) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function EPGProgramBlock({
    prog,
    slotStart,
    isActive,
    onClick,
}: {
    prog: EPGProgram;
    slotStart: Date;
    isActive: boolean;
    onClick: () => void;
}) {
    const now = new Date();
    const msPerPx = (60 * 60 * 1000) / HOUR_WIDTH_PX;
    const left = Math.max(0, (prog.start.getTime() - slotStart.getTime()) / msPerPx);
    const width = Math.max(4, (prog.stop.getTime() - prog.start.getTime()) / msPerPx);
    const isNow = prog.start <= now && prog.stop > now;

    return (
        <button
            onClick={onClick}
            title={prog.title}
            style={{ left, width: width - 2, height: ROW_HEIGHT - 8 }}
            className={cn(
                'absolute top-1 rounded text-left px-2 overflow-hidden transition-all border text-xs',
                isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : isNow
                      ? 'bg-accent border-accent-foreground/30 text-accent-foreground'
                      : 'bg-muted/60 border-border text-foreground hover:bg-muted'
            )}
        >
            <span className="font-semibold block truncate">{prog.title}</span>
            <span className="text-[10px] opacity-70">
                {formatTime(prog.start)} – {formatTime(prog.stop)}
            </span>
        </button>
    );
}

function EPGGuide({
    channels,
    epgData,
    activeChannelId,
    onSelectChannel,
}: {
    channels: M3UChannel[];
    epgData: EPGData | null;
    activeChannelId: string;
    onSelectChannel: (ch: M3UChannel) => void;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeProgram, setActiveProgram] = useState<EPGProgram | null>(null);

    const slotStart = useMemo(() => {
        const d = new Date();
        d.setMinutes(0, 0, 0);
        d.setHours(d.getHours() - 1);
        return d;
    }, []);

    const totalHours = 6;
    const totalWidth = HOUR_WIDTH_PX * totalHours;

    const timeLabels = useMemo(() => {
        return Array.from({ length: totalHours + 1 }, (_, i) => {
            const d = new Date(slotStart);
            d.setHours(d.getHours() + i);
            return d;
        });
    }, [slotStart]);

    // Scroll to "now" on mount
    useEffect(() => {
        if (scrollRef.current) {
            const msPerPx = (60 * 60 * 1000) / HOUR_WIDTH_PX;
            const nowOffset = (new Date().getTime() - slotStart.getTime()) / msPerPx;
            scrollRef.current.scrollLeft = Math.max(0, nowOffset - 40);
        }
    }, [slotStart]);

    const epgChannelMap = useMemo(() => {
        if (!epgData) return new Map<string, string>();
        const map = new Map<string, string>();
        for (const ec of epgData.channels) {
            map.set(ec.id.toLowerCase(), ec.id);
            map.set(ec.name.toLowerCase(), ec.id);
        }
        return map;
    }, [epgData]);

    const resolveEpgId = useCallback(
        (ch: M3UChannel): string | null => {
            if (!epgData) return null;
            if (epgChannelMap.has(ch.id.toLowerCase())) return epgChannelMap.get(ch.id.toLowerCase())!;
            if (epgChannelMap.has(ch.name.toLowerCase())) return epgChannelMap.get(ch.name.toLowerCase())!;
            return null;
        },
        [epgData, epgChannelMap]
    );

    return (
        <div className="flex flex-col overflow-hidden h-full">
            {activeProgram && (
                <div className="px-3 py-2 bg-accent/30 border-b text-sm flex items-start justify-between gap-2">
                    <div>
                        <span className="font-semibold">{activeProgram.title}</span>
                        <span className="ml-2 text-muted-foreground text-xs">
                            {formatTime(activeProgram.start)} – {formatTime(activeProgram.stop)}
                        </span>
                        {activeProgram.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {activeProgram.description}
                            </p>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setActiveProgram(null)}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}
            <div className="flex overflow-hidden flex-1">
                {/* Channel labels */}
                <div className="shrink-0 border-r" style={{ width: CHANNEL_LABEL_W }}>
                    <div style={{ height: 32 }} className="border-b" />
                    {channels.map((ch) => (
                        <div
                            key={ch.url}
                            style={{ height: ROW_HEIGHT }}
                            className={cn(
                                'flex items-center px-2 gap-2 border-b cursor-pointer hover:bg-muted/50 transition-colors text-xs truncate',
                                ch.id === activeChannelId && 'bg-primary/10'
                            )}
                            onClick={() => onSelectChannel(ch)}
                        >
                            {ch.logo ? (
                                <img
                                    src={ch.logo}
                                    alt=""
                                    className="h-6 w-8 object-contain rounded shrink-0"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <Tv2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                            )}
                            <span className="truncate font-medium">{ch.name}</span>
                        </div>
                    ))}
                </div>
                {/* Scrollable time grid */}
                <div ref={scrollRef} className="overflow-x-auto flex-1 overflow-y-hidden">
                    <div style={{ width: totalWidth, minWidth: totalWidth }}>
                        {/* Time header */}
                        <div className="flex border-b sticky top-0 bg-background z-10" style={{ height: 32 }}>
                            {timeLabels.map((t, i) => (
                                <div
                                    key={i}
                                    style={{ width: HOUR_WIDTH_PX }}
                                    className="shrink-0 text-xs text-muted-foreground px-2 flex items-center border-r"
                                >
                                    {i < totalHours && formatTime(t)}
                                </div>
                            ))}
                        </div>
                        {/* Now line */}
                        <div
                            className="absolute top-8 bottom-0 w-0.5 bg-primary/70 pointer-events-none z-20"
                            style={{
                                left:
                                    CHANNEL_LABEL_W +
                                    Math.max(
                                        0,
                                        (new Date().getTime() - slotStart.getTime()) /
                                            ((60 * 60 * 1000) / HOUR_WIDTH_PX)
                                    ),
                            }}
                        />
                        {/* Rows */}
                        {channels.map((ch) => {
                            const epgId = resolveEpgId(ch);
                            const progs = epgId && epgData
                                ? getProgramsForChannel(epgData, epgId)
                                : [];

                            return (
                                <div
                                    key={ch.url}
                                    style={{ height: ROW_HEIGHT }}
                                    className="relative border-b"
                                >
                                    {progs.map((p, i) => (
                                        <EPGProgramBlock
                                            key={i}
                                            prog={p}
                                            slotStart={slotStart}
                                            isActive={ch.id === activeChannelId}
                                            onClick={() => setActiveProgram(p)}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Video Player ─────────────────────────────────────────────────────────────

function IPTVPlayer({ channel, epgData }: { channel: M3UChannel | null; epgData: EPGData | null }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const currentProg = useMemo(() => {
        if (!channel || !epgData) return null;
        // Try by tvg-id first, then by name
        const byId = getCurrentProgram(epgData, channel.id);
        if (byId) return byId;
        const epgCh = epgData.channels.find(
            (c) => c.name.toLowerCase() === channel.name.toLowerCase()
        );
        return epgCh ? getCurrentProgram(epgData, epgCh.id) : null;
    }, [channel, epgData]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !channel) return;

        setError(null);
        setLoading(true);

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const isHLS =
            channel.url.includes('.m3u8') ||
            channel.url.includes('hls') ||
            !channel.url.match(/\.(mp4|mkv|avi|webm|ts)(\?|$)/i);

        if (isHLS && Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
            });
            hlsRef.current = hls;
            hls.loadSource(channel.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setLoading(false);
                video.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, (_e, data) => {
                if (data.fatal) {
                    setError(`Stream error: ${data.type}`);
                    setLoading(false);
                }
            });
        } else {
            video.src = channel.url;
            video.oncanplay = () => {
                setLoading(false);
                video.play().catch(() => {});
            };
            video.onerror = () => {
                setError('Failed to load stream');
                setLoading(false);
            };
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            video.src = '';
        };
    }, [channel]);

    if (!channel) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-black/90 gap-4">
                <Tv2 className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">Sender auswählen</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-black relative min-h-0">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/80 gap-3">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setError(null);
                            setLoading(true);
                            const v = videoRef.current;
                            if (v) {
                                v.load();
                                v.play().catch(() => {});
                            }
                        }}
                    >
                        Erneut versuchen
                    </Button>
                </div>
            )}
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                controls
                playsInline
            />
            {/* Now playing overlay */}
            <div className="absolute bottom-16 left-4 right-4 pointer-events-none">
                <div className="inline-flex flex-col gap-0.5 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 max-w-sm">
                    <div className="flex items-center gap-2">
                        {channel.logo ? (
                            <img
                                src={channel.logo}
                                alt=""
                                className="h-5 w-8 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <Tv2 className="h-4 w-4 text-white/70" />
                        )}
                        <span className="text-white font-semibold text-sm">{channel.name}</span>
                    </div>
                    {currentProg && (
                        <div className="text-white/80 text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                                {currentProg.title} • {formatTime(currentProg.start)} – {formatTime(currentProg.stop)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Channel List ─────────────────────────────────────────────────────────────

function ChannelList({
    channels,
    activeChannel,
    epgData,
    onSelect,
}: {
    channels: M3UChannel[];
    activeChannel: M3UChannel | null;
    epgData: EPGData | null;
    onSelect: (ch: M3UChannel) => void;
}) {
    const [search, setSearch] = useState('');
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

    const filtered = useMemo(() => {
        if (!search) return channels;
        const q = search.toLowerCase();
        return channels.filter(
            (ch) => ch.name.toLowerCase().includes(q) || ch.group.toLowerCase().includes(q)
        );
    }, [channels, search]);

    const grouped = useMemo(() => groupChannels(filtered), [filtered]);
    const groupNames = Object.keys(grouped).sort();

    const toggleGroup = (g: string) => {
        setOpenGroups((prev) => {
            const next = new Set(prev);
            if (next.has(g)) next.delete(g);
            else next.add(g);
            return next;
        });
    };

    // Auto-open first group on load
    useEffect(() => {
        if (groupNames.length > 0 && openGroups.size === 0) {
            setOpenGroups(new Set([groupNames[0]]));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupNames.length]);

    const getCurrentProg = useCallback(
        (ch: M3UChannel): string | null => {
            if (!epgData) return null;
            const prog =
                getCurrentProgram(epgData, ch.id) ||
                (() => {
                    const ec = epgData.channels.find(
                        (c) => c.name.toLowerCase() === ch.name.toLowerCase()
                    );
                    return ec ? getCurrentProgram(epgData, ec.id) : null;
                })();
            return prog?.title ?? null;
        },
        [epgData]
    );

    return (
        <div className="flex flex-col h-full border-r bg-background overflow-hidden" style={{ width: 260 }}>
            <div className="p-3 border-b shrink-0">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Sender suchen…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-9"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full">
                {groupNames.map((group) => (
                    <div key={group}>
                        <button
                            onClick={() => toggleGroup(group)}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/50 transition-colors"
                        >
                            <span className="truncate">{group}</span>
                            <span className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                    {grouped[group].length}
                                </Badge>
                                {openGroups.has(group) ? (
                                    <ChevronDown className="h-3 w-3 shrink-0" />
                                ) : (
                                    <ChevronRight className="h-3 w-3 shrink-0" />
                                )}
                            </span>
                        </button>
                        {openGroups.has(group) &&
                            grouped[group].map((ch) => {
                                const isActive = activeChannel?.url === ch.url;
                                const prog = getCurrentProg(ch);
                                return (
                                    <button
                                        key={ch.url}
                                        onClick={() => onSelect(ch)}
                                        className={cn(
                                            'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors',
                                            isActive && 'bg-primary/10 border-l-2 border-primary'
                                        )}
                                    >
                                        {ch.logo ? (
                                            <img
                                                src={ch.logo}
                                                alt=""
                                                className="h-7 w-10 object-contain rounded shrink-0 bg-muted/30"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="h-7 w-10 shrink-0 flex items-center justify-center rounded bg-muted/30">
                                                <Tv2 className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className={cn('text-sm truncate', isActive && 'font-semibold text-primary')}>
                                                {ch.name}
                                            </p>
                                            {prog && (
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                    {prog}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                ))}
                {channels.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
                        <Tv2 className="h-8 w-8" />
                        <span>Keine Sender geladen</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main IPTV Page ───────────────────────────────────────────────────────────

const STORAGE_KEY_M3U = 'iptv_m3u_content';

export default function IPTVPage() {
    const { config } = useConfig();
    const [channels, setChannels] = useState<M3UChannel[]>([]);
    const [epgData, setEpgData] = useState<EPGData | null>(null);
    const [activeChannel, setActiveChannel] = useState<M3UChannel | null>(null);
    const [showEPG, setShowEPG] = useState(false);
    const [loadingM3U, setLoadingM3U] = useState(false);
    const [loadingEPG, setLoadingEPG] = useState(false);
    const [m3uError, setM3UError] = useState<string | null>(null);

    // Load M3U
    const loadM3U = useCallback(async (source: string | 'config') => {
        setLoadingM3U(true);
        setM3UError(null);
        try {
            let content: string;
            if (source === 'config') {
                const url = config?.iptvM3uUrl;
                if (!url) throw new Error('Keine M3U-URL konfiguriert');
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                content = await res.text();
            } else {
                content = source;
            }
            sessionStorage.setItem(STORAGE_KEY_M3U, content);
            const parsed = parseM3U(content);
            setChannels(parsed);
        } catch (e) {
            setM3UError(e instanceof Error ? e.message : 'Fehler beim Laden der Playlist');
        } finally {
            setLoadingM3U(false);
        }
    }, [config?.iptvM3uUrl]);

    // Load EPG
    const loadEPG = useCallback(async () => {
        const url = config?.iptvEpgUrl;
        if (!url) return;
        setLoadingEPG(true);
        try {
            const res = await fetch(url);
            if (!res.ok) return;
            const xml = await res.text();
            setEpgData(parseXMLTV(xml));
        } catch {
            // EPG failures are non-fatal
        } finally {
            setLoadingEPG(false);
        }
    }, [config?.iptvEpgUrl]);

    // Auto-load from config on mount
    useEffect(() => {
        const cached = sessionStorage.getItem(STORAGE_KEY_M3U);
        if (cached) {
            setChannels(parseM3U(cached));
        } else if (config?.iptvM3uUrl) {
            void loadM3U('config');
        }
        if (config?.iptvEpgUrl) {
            void loadEPG();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            void loadM3U(content);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const noConfig = !config?.iptvM3uUrl;
    const noChannels = channels.length === 0;

    return (
        <Page
            title="IPTV"
            requiresAuth
            pagePadding={false}
            showPlayerBar={false}
            className="flex flex-col"
        >
            <div className="flex flex-col h-full overflow-hidden" style={{ height: 'calc(100dvh - 3.5rem)' }}>
                {/* Header bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b shrink-0 gap-3 bg-background">
                    <div className="flex items-center gap-2">
                        <Tv2 className="h-5 w-5 text-primary" />
                        <span className="font-semibold">IPTV</span>
                        {channels.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {channels.length} Sender
                            </Badge>
                        )}
                        {loadingEPG && (
                            <Badge variant="outline" className="text-xs gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" /> EPG
                            </Badge>
                        )}
                        {epgData && !loadingEPG && (
                            <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-600/30">
                                <Calendar className="h-3 w-3" /> EPG geladen
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {noConfig && (
                            <label className="cursor-pointer">
                                <input type="file" accept=".m3u,.m3u8" className="hidden" onChange={handleFileUpload} />
                                <Button size="sm" variant="outline" asChild>
                                    <span>M3U-Datei öffnen</span>
                                </Button>
                            </label>
                        )}
                        {config?.iptvM3uUrl && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => loadM3U('config')}
                                disabled={loadingM3U}
                            >
                                {loadingM3U ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Neu laden'
                                )}
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant={showEPG ? 'default' : 'outline'}
                            onClick={() => setShowEPG((v) => !v)}
                            disabled={channels.length === 0}
                        >
                            <Calendar className="h-4 w-4 mr-1" />
                            TV-Guide
                        </Button>
                    </div>
                </div>

                {/* Error banner */}
                {m3uError && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b text-destructive text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {m3uError}
                        <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto h-6 text-xs"
                            onClick={() => setM3UError(null)}
                        >
                            Schließen
                        </Button>
                    </div>
                )}

                {/* Empty state */}
                {noChannels && !loadingM3U && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
                        <Tv2 className="h-16 w-16 text-muted-foreground" />
                        <div>
                            <h2 className="text-xl font-semibold mb-1">IPTV einrichten</h2>
                            <p className="text-muted-foreground text-sm max-w-sm">
                                {noConfig
                                    ? 'Lade eine M3U-Datei hoch oder hinterlege eine M3U-URL in den Einstellungen unter dem Tab "IPTV".'
                                    : 'Die M3U-Playlist wird geladen…'}
                            </p>
                        </div>
                        <div className="flex gap-3 flex-wrap justify-center">
                            <label className="cursor-pointer">
                                <input type="file" accept=".m3u,.m3u8" className="hidden" onChange={handleFileUpload} />
                                <Button variant="outline" asChild>
                                    <span>M3U-Datei öffnen</span>
                                </Button>
                            </label>
                            {config?.iptvM3uUrl && (
                                <Button onClick={() => loadM3U('config')} disabled={loadingM3U}>
                                    {loadingM3U && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Aus URL laden
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {loadingM3U && (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )}

                {/* Main content */}
                {channels.length > 0 && !loadingM3U && (
                    <div className="flex-1 flex overflow-hidden min-h-0">
                        {/* Left: Channel list */}
                        <ChannelList
                            channels={channels}
                            activeChannel={activeChannel}
                            epgData={epgData}
                            onSelect={setActiveChannel}
                        />
                        {/* Right: Player + optional EPG */}
                        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                            <IPTVPlayer channel={activeChannel} epgData={epgData} />
                            {showEPG && (
                                <div className="border-t shrink-0" style={{ height: 280 }}>
                                    <EPGGuide
                                        channels={channels.slice(0, 50)}
                                        epgData={epgData}
                                        activeChannelId={activeChannel?.id ?? ''}
                                        onSelectChannel={setActiveChannel}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Page>
    );
}
