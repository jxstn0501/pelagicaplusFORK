import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Square,
    Volume2,
    VolumeX,
    Volume1,
    MonitorPlay,
    RefreshCw,
    Wifi,
    WifiOff,
    ChevronDown,
    Home,
    Search,
    Gamepad2,
    X,
    Tv2,
    ChevronRight,
} from 'lucide-react';
import { useActiveSessions } from '@/hooks/api/useActiveSessions';
import {
    useRemotePlaystate,
    useRemoteGeneralCommand,
    PlaystateCommand,
} from '@/hooks/api/useRemotePlaystate';
import { useRemotePlay } from '@/hooks/api/useRemotePlay';
import { useResumeItems } from '@/hooks/api/continue/useResumeItems';
import { useNextUp } from '@/hooks/api/continue/useNextUp';
import { useSearchItems } from '@/hooks/api/useSearchItems';
import { useMediaBarItems } from '@/hooks/api/useMediaBarItems';
import { getPrimaryImageUrl, getBackdropUrl } from '@/utils/jellyfinUrls';
import { formatPlayTime, ticksToSeconds } from '@/utils/timeConversion';
import { getUserId } from '@/utils/localstorageCredentials';
import type { BaseItemDto, SessionInfoDto } from '@jellyfin/sdk/lib/generated-client/models';

const TICKS_PER_SECOND = 10_000_000;
const SKIP_SECONDS = 10;

type Tab = 'home' | 'search' | 'controls';

function formatTicks(ticks: number | null | undefined): string {
    if (!ticks) return '0:00';
    return formatPlayTime(ticksToSeconds(ticks));
}

// ─── Session picker ──────────────────────────────────────────────────────────

function SessionPicker({
    sessions,
    selectedId,
    onSelect,
}: {
    sessions: SessionInfoDto[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = sessions.find((s) => s.Id === selectedId);

    useEffect(() => {
        function close(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    if (sessions.length === 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white/50 text-sm">
                <WifiOff size={14} />
                Kein Gerät spielt gerade
            </div>
        );
    }

    return (
        <div ref={ref} className="relative flex-1">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 text-white text-sm transition-colors"
            >
                <MonitorPlay size={14} className="shrink-0 text-white/60" />
                <span className="flex-1 text-left truncate">
                    {selected
                        ? `${selected.DeviceName ?? 'Gerät'} — ${selected.UserName ?? ''}`
                        : 'Gerät wählen …'}
                </span>
                <ChevronDown
                    size={14}
                    className={`shrink-0 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && (
                <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl bg-zinc-800 border border-white/10 shadow-2xl overflow-hidden">
                    {sessions.map((s) => (
                        <button
                            key={s.Id}
                            onClick={() => {
                                onSelect(s.Id!);
                                setOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/10 transition-colors ${
                                s.Id === selectedId ? 'bg-white/5 text-white' : 'text-white/80'
                            }`}
                        >
                            <MonitorPlay size={15} className="shrink-0 text-white/40" />
                            <div className="flex-1 min-w-0">
                                <div className="truncate font-medium">{s.DeviceName ?? 'Gerät'}</div>
                                <div className="truncate text-xs text-white/40">
                                    {s.ClientName} · {s.UserName}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Item card ───────────────────────────────────────────────────────────────

function ItemCard({
    item,
    onTap,
}: {
    item: BaseItemDto;
    onTap: (item: BaseItemDto) => void;
}) {
    const imgId = item.SeriesId ?? item.Id;
    const src = imgId ? getPrimaryImageUrl(imgId, { width: 160 }) : undefined;
    const pct =
        item.UserData?.PlaybackPositionTicks && item.RunTimeTicks
            ? (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100
            : 0;

    return (
        <button
            onClick={() => onTap(item)}
            className="shrink-0 flex flex-col gap-1.5 w-24 text-left active:scale-95 transition-transform"
        >
            <div className="w-24 h-36 rounded-lg overflow-hidden bg-white/10 relative">
                {src && (
                    <img src={src} alt={item.Name ?? ''} className="w-full h-full object-cover" />
                )}
                {pct > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                        <div className="h-full bg-red-500" style={{ width: `${pct}%` }} />
                    </div>
                )}
            </div>
            <span className="text-xs text-white/80 leading-tight line-clamp-2">
                {item.SeriesName ?? item.Name}
                {item.SeriesName && (
                    <span className="text-white/40 block">
                        {item.SeasonName} · {item.Name}
                    </span>
                )}
            </span>
        </button>
    );
}

// ─── Horizontal content row ──────────────────────────────────────────────────

function ContentRow({
    title,
    items,
    onItemTap,
}: {
    title: string;
    items: BaseItemDto[];
    onItemTap: (item: BaseItemDto) => void;
}) {
    if (!items.length) return null;
    return (
        <section>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 px-4">
                {title}
            </h2>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden">
                {items.map((item) => (
                    <ItemCard key={item.Id} item={item} onTap={onItemTap} />
                ))}
            </div>
        </section>
    );
}

// ─── Item action sheet ───────────────────────────────────────────────────────

function ItemSheet({
    item,
    sessionName,
    hasSession,
    onPlay,
    onClose,
}: {
    item: BaseItemDto;
    sessionName: string | null;
    hasSession: boolean;
    onPlay: (item: BaseItemDto) => void;
    onClose: () => void;
}) {
    const backdropId = item.BackdropImageTags?.length ? item.Id : (item.ParentId ?? item.Id);
    const backdrop = backdropId ? getBackdropUrl(backdropId, { width: 600 }) : undefined;

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-zinc-900 rounded-t-3xl overflow-hidden max-h-[80vh] flex flex-col">
                {/* Backdrop strip */}
                {backdrop && (
                    <div className="relative h-36 shrink-0">
                        <img
                            src={backdrop}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />
                    </div>
                )}

                <div className="px-5 pb-8 flex flex-col gap-4 overflow-y-auto">
                    <div className="flex items-start justify-between gap-3 pt-1">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-xl leading-tight">
                                {item.SeriesName ?? item.Name}
                            </h3>
                            {item.SeriesName && (
                                <p className="text-sm text-white/60 mt-0.5">
                                    {item.SeasonName} · {item.Name}
                                </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-xs text-white/40">
                                {item.ProductionYear && <span>{item.ProductionYear}</span>}
                                {item.RunTimeTicks && (
                                    <span>{formatTicks(item.RunTimeTicks)}</span>
                                )}
                                {item.OfficialRating && (
                                    <span className="border border-white/30 px-1 rounded">
                                        {item.OfficialRating}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {item.Overview && (
                        <p className="text-sm text-white/60 leading-relaxed line-clamp-3">
                            {item.Overview}
                        </p>
                    )}

                    <button
                        onClick={() => onPlay(item)}
                        disabled={!hasSession}
                        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-white text-black"
                    >
                        <Play size={20} fill="black" />
                        {hasSession
                            ? `Abspielen auf ${sessionName ?? 'Gerät'}`
                            : 'Kein Gerät ausgewählt'}
                    </button>

                    {!hasSession && (
                        <p className="text-center text-xs text-white/40">
                            Wähle oben ein Gerät aus, um Inhalte zu steuern.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Home tab ────────────────────────────────────────────────────────────────

function HomeTab({ onItemTap }: { onItemTap: (item: BaseItemDto) => void }) {
    const userId = getUserId();
    const { data: resumeItems = [] } = useResumeItems(userId, 20);
    const { data: nextUp = [] } = useNextUp(userId, 20);
    const { data: recommended = [] } = useMediaBarItems();

    return (
        <div className="flex flex-col gap-6 py-4">
            {resumeItems.length === 0 && nextUp.length === 0 && recommended?.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-white/30">
                    <Tv2 size={48} strokeWidth={1} />
                    <p className="text-sm">Noch nichts geschaut</p>
                </div>
            )}
            <ContentRow title="Weiterschauen" items={resumeItems} onItemTap={onItemTap} />
            <ContentRow title="Nächste Episode" items={nextUp} onItemTap={onItemTap} />
            <ContentRow title="Empfohlen" items={recommended ?? []} onItemTap={onItemTap} />
        </div>
    );
}

// ─── Search tab ──────────────────────────────────────────────────────────────

function SearchTab({ onItemTap }: { onItemTap: (item: BaseItemDto) => void }) {
    const [query, setQuery] = useState('');
    const userId = getUserId() ?? undefined;
    const { data: results = [], isFetching } = useSearchItems(query, {
        userId,
        limit: 40,
        enabled: query.trim().length > 0,
    });

    return (
        <div className="flex flex-col gap-4 py-4">
            <div className="px-4">
                <div className="relative">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <input
                        type="search"
                        placeholder="Filme, Serien, Episoden …"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/15 transition-colors"
                        autoComplete="off"
                        autoCorrect="off"
                    />
                    {isFetching && (
                        <RefreshCw
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 animate-spin"
                        />
                    )}
                </div>
            </div>

            {query.trim().length > 0 && results.length === 0 && !isFetching && (
                <div className="text-center text-white/30 text-sm py-12">
                    Keine Ergebnisse für „{query}"
                </div>
            )}

            {results.length > 0 && (
                <div className="flex flex-col divide-y divide-white/5">
                    {results.map((item) => {
                        const imgId = item.SeriesId ?? item.Id;
                        const src = imgId ? getPrimaryImageUrl(imgId, { width: 80 }) : undefined;
                        return (
                            <button
                                key={item.Id}
                                onClick={() => onItemTap(item)}
                                className="flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors text-left"
                            >
                                <div className="w-10 h-14 rounded-md overflow-hidden bg-white/10 shrink-0">
                                    {src && (
                                        <img
                                            src={src}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                        {item.SeriesName ?? item.Name}
                                    </div>
                                    {item.SeriesName && (
                                        <div className="text-xs text-white/50 truncate mt-0.5">
                                            {item.SeasonName} · {item.Name}
                                        </div>
                                    )}
                                    <div className="text-xs text-white/30 mt-0.5">
                                        {item.Type === 'Movie' ? 'Film' : item.Type === 'Series' ? 'Serie' : item.Type} · {item.ProductionYear}
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-white/20 shrink-0" />
                            </button>
                        );
                    })}
                </div>
            )}

            {query.trim().length === 0 && (
                <div className="text-center text-white/20 text-sm py-12">
                    Suchbegriff eingeben
                </div>
            )}
        </div>
    );
}

// ─── Progress bar (Controls tab) ─────────────────────────────────────────────

function ProgressBar({
    positionTicks,
    totalTicks,
    onSeek,
}: {
    positionTicks: number;
    totalTicks: number;
    onSeek: (ticks: number) => void;
}) {
    const [dragging, setDragging] = useState(false);
    const [dragPct, setDragPct] = useState(0);
    const barRef = useRef<HTMLDivElement>(null);

    const pct = totalTicks > 0 ? (positionTicks / totalTicks) * 100 : 0;
    const displayPct = dragging ? dragPct : pct;

    function clientX(e: React.TouchEvent | React.MouseEvent) {
        return 'touches' in e ? e.touches[0].clientX : e.clientX;
    }

    function calcPct(cx: number) {
        if (!barRef.current) return 0;
        const r = barRef.current.getBoundingClientRect();
        return Math.max(0, Math.min(100, ((cx - r.left) / r.width) * 100));
    }

    const onDown = (e: React.TouchEvent | React.MouseEvent) => {
        setDragging(true);
        setDragPct(calcPct(clientX(e)));
    };
    const onMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (dragging) setDragPct(calcPct(clientX(e)));
    };
    const onUp = (e: React.TouchEvent | React.MouseEvent) => {
        if (!dragging) return;
        const p = calcPct(clientX(e));
        setDragging(false);
        onSeek(Math.round((p / 100) * totalTicks));
    };

    return (
        <div className="w-full">
            <div
                ref={barRef}
                className="relative h-2 rounded-full bg-white/20 cursor-pointer"
                onMouseDown={onDown}
                onMouseMove={onMove}
                onMouseUp={onUp}
                onMouseLeave={(e) => { if (dragging) onUp(e); }}
                onTouchStart={onDown}
                onTouchMove={onMove}
                onTouchEnd={onUp}
            >
                <div
                    className="absolute left-0 top-0 h-full rounded-full bg-white"
                    style={{ width: `${displayPct}%` }}
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow"
                    style={{ left: `calc(${displayPct}% - 8px)` }}
                />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-white/40">
                <span>{formatTicks(positionTicks)}</span>
                <span>{formatTicks(totalTicks)}</span>
            </div>
        </div>
    );
}

// ─── Controls tab ────────────────────────────────────────────────────────────

function ControlButton({
    onClick,
    children,
    label,
    large,
    variant = 'default',
    disabled,
}: {
    onClick: () => void;
    children: React.ReactNode;
    label: string;
    large?: boolean;
    variant?: 'default' | 'primary' | 'danger';
    disabled?: boolean;
}) {
    const size = large ? 'w-18 h-18 min-w-[72px] min-h-[72px]' : 'w-14 h-14 min-w-[56px] min-h-[56px]';
    const color =
        variant === 'primary'
            ? 'bg-white text-black'
            : variant === 'danger'
              ? 'bg-red-600/80 text-white hover:bg-red-600'
              : 'bg-white/10 text-white hover:bg-white/20';
    return (
        <button
            onClick={onClick}
            aria-label={label}
            disabled={disabled}
            className={`flex items-center justify-center rounded-full transition-all active:scale-90 select-none touch-manipulation disabled:opacity-30 ${size} ${color}`}
        >
            {children}
        </button>
    );
}

function ControlsTab({
    session,
    selectedSessionId,
    onSendCmd,
    onSendGen,
    onSkip,
    onSeek,
}: {
    session: SessionInfoDto | null;
    selectedSessionId: string | null;
    onSendCmd: (cmd: PlaystateCommand, ticks?: number) => void;
    onSendGen: (name: string) => void;
    onSkip: (seconds: number) => void;
    onSeek: (ticks: number) => void;
}) {
    const item = session?.NowPlayingItem ?? null;
    const playState = session?.PlayState ?? null;
    const isPaused = playState?.IsPaused ?? true;
    const isMuted = playState?.IsMuted ?? false;
    const positionTicks = playState?.PositionTicks ?? 0;
    const totalTicks = item?.RunTimeTicks ?? 0;
    const disabled = !selectedSessionId;

    if (!session || !item) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-white/30">
                <Gamepad2 size={52} strokeWidth={1} />
                <div className="text-center">
                    <p className="font-medium text-white/50">Keine Wiedergabe</p>
                    <p className="text-sm mt-1">
                        {!selectedSessionId
                            ? 'Gerät oben auswählen'
                            : 'Starte einen Film oder eine Serie'}
                    </p>
                </div>
            </div>
        );
    }

    const posterUrl = (item.SeriesId ?? item.Id)
        ? getPrimaryImageUrl((item.SeriesId ?? item.Id)!, { width: 120 })
        : null;

    return (
        <div className="flex flex-col gap-6 py-4 px-4">
            {/* Now playing card */}
            <div className="flex items-start gap-4 bg-white/5 rounded-2xl p-4">
                {posterUrl && (
                    <img
                        src={posterUrl}
                        alt={item.Name ?? ''}
                        className="w-14 h-20 rounded-lg object-cover shrink-0 shadow"
                    />
                )}
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
                        {isPaused ? 'Pausiert' : 'Läuft'}
                    </div>
                    <div className="font-semibold text-base leading-tight truncate">
                        {item.SeriesName ?? item.Name}
                    </div>
                    {item.SeriesName && (
                        <div className="text-sm text-white/50 mt-0.5 truncate">
                            {item.SeasonName && `${item.SeasonName} · `}{item.Name}
                        </div>
                    )}
                    <div className="text-xs text-white/30 mt-2 flex items-center gap-1">
                        <MonitorPlay size={10} />
                        {session.DeviceName}
                    </div>
                </div>
            </div>

            {/* Progress */}
            {totalTicks > 0 && (
                <ProgressBar
                    positionTicks={positionTicks}
                    totalTicks={totalTicks}
                    onSeek={onSeek}
                />
            )}

            {/* Transport */}
            <div className="flex items-center justify-center gap-4">
                <ControlButton
                    onClick={() => onSendCmd(PlaystateCommand.PreviousTrack)}
                    label="Vorheriger Titel"
                    disabled={disabled}
                >
                    <SkipBack size={22} />
                </ControlButton>
                <ControlButton
                    onClick={() => onSkip(-SKIP_SECONDS)}
                    label="10s zurück"
                    disabled={disabled}
                >
                    <span className="text-xs font-bold leading-none">-10s</span>
                </ControlButton>
                <ControlButton
                    onClick={() => onSendCmd(PlaystateCommand.PlayPause)}
                    label={isPaused ? 'Abspielen' : 'Pause'}
                    large
                    variant="primary"
                    disabled={disabled}
                >
                    {isPaused ? <Play size={30} fill="black" /> : <Pause size={30} fill="black" />}
                </ControlButton>
                <ControlButton
                    onClick={() => onSkip(SKIP_SECONDS)}
                    label="10s vor"
                    disabled={disabled}
                >
                    <span className="text-xs font-bold leading-none">+10s</span>
                </ControlButton>
                <ControlButton
                    onClick={() => onSendCmd(PlaystateCommand.NextTrack)}
                    label="Nächster Titel"
                    disabled={disabled}
                >
                    <SkipForward size={22} />
                </ControlButton>
            </div>

            {/* Volume + Stop */}
            <div className="flex items-center justify-center gap-3">
                <ControlButton
                    onClick={() => onSendGen('ToggleMute')}
                    label={isMuted ? 'Ton an' : 'Ton aus'}
                    disabled={disabled}
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </ControlButton>
                <ControlButton onClick={() => onSendGen('VolumeDown')} label="Leiser" disabled={disabled}>
                    <Volume1 size={20} />
                </ControlButton>
                <ControlButton onClick={() => onSendGen('VolumeUp')} label="Lauter" disabled={disabled}>
                    <Volume2 size={20} />
                </ControlButton>
                <ControlButton
                    onClick={() => onSendCmd(PlaystateCommand.Stop)}
                    label="Stop"
                    variant="danger"
                    disabled={disabled}
                >
                    <Square size={20} fill="white" />
                </ControlButton>
            </div>
        </div>
    );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'home', label: 'Start', icon: <Home size={20} /> },
        { id: 'search', label: 'Suche', icon: <Search size={20} /> },
        { id: 'controls', label: 'Steuerung', icon: <Gamepad2 size={20} /> },
    ];

    return (
        <nav className="shrink-0 flex border-t border-white/10 bg-zinc-950 pb-safe-bottom">
            {tabs.map(({ id, label, icon }) => (
                <button
                    key={id}
                    onClick={() => onChange(id)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[11px] transition-colors ${
                        active === id ? 'text-white' : 'text-white/30'
                    }`}
                >
                    {icon}
                    {label}
                </button>
            ))}
        </nav>
    );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const RemotePage = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('home');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [sheetItem, setSheetItem] = useState<BaseItemDto | null>(null);

    const { data: sessions = [], isLoading, isError } = useActiveSessions();
    const { mutate: sendCmd } = useRemotePlaystate();
    const { mutate: sendGen } = useRemoteGeneralCommand();
    const { mutate: playOnDevice } = useRemotePlay();

    const isLoggedIn = Boolean(localStorage.getItem('jf_token'));

    useEffect(() => {
        if (!isLoggedIn) navigate('/login', { replace: true });
    }, [isLoggedIn, navigate]);

    // Only sessions with active playback appear in session picker
    const playingSessions = sessions.filter((s) => s.NowPlayingItem);
    // All sessions are selectable as target (even idle ones can receive play commands)
    const allSessions = sessions;

    // Auto-select the only active session
    useEffect(() => {
        if (allSessions.length === 1 && !selectedSessionId) {
            setSelectedSessionId(allSessions[0].Id!);
        }
    }, [allSessions, selectedSessionId]);

    const selectedSession = sessions.find((s) => s.Id === selectedSessionId) ?? null;
    // For controls tab, show the selected session only if it's currently playing
    const playingSession = selectedSession?.NowPlayingItem ? selectedSession : null;

    function cmd(command: PlaystateCommand, seekPositionTicks?: number) {
        if (!selectedSessionId) return;
        sendCmd({ sessionId: selectedSessionId, command, seekPositionTicks });
    }

    function gen(commandName: string) {
        if (!selectedSessionId) return;
        sendGen({ sessionId: selectedSessionId, commandName });
    }

    function skip(seconds: number) {
        const positionTicks = selectedSession?.PlayState?.PositionTicks ?? 0;
        const totalTicks = selectedSession?.NowPlayingItem?.RunTimeTicks ?? 0;
        const newPos = Math.max(0, Math.min(totalTicks, positionTicks + seconds * TICKS_PER_SECOND));
        cmd(PlaystateCommand.Seek, newPos);
    }

    function handlePlayItem(item: BaseItemDto) {
        if (!selectedSessionId || !item.Id) return;
        const startTicks = item.UserData?.PlaybackPositionTicks ?? 0;
        playOnDevice({ sessionId: selectedSessionId, itemId: item.Id, startPositionTicks: startTicks });
        setSheetItem(null);
        setTab('controls');
    }

    if (!isLoggedIn) return null;

    const selectedSessionName = selectedSession?.DeviceName ?? null;

    return (
        <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-4 pt-safe-top pt-3 pb-3 flex items-center gap-3 border-b border-white/10">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <MonitorPlay size={18} />
                </div>
                <SessionPicker
                    sessions={allSessions}
                    selectedId={selectedSessionId}
                    onSelect={setSelectedSessionId}
                />
                <div className="shrink-0">
                    {isLoading ? (
                        <RefreshCw size={14} className="text-white/30 animate-spin" />
                    ) : isError ? (
                        <WifiOff size={14} className="text-red-400" />
                    ) : (
                        <Wifi size={14} className="text-green-400/60" />
                    )}
                </div>
            </div>

            {/* Now-playing mini bar (always visible when something plays, outside controls tab) */}
            {playingSession && tab !== 'controls' && (
                <button
                    onClick={() => setTab('controls')}
                    className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white/5 border-b border-white/10 active:bg-white/10 transition-colors"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm text-white/70 flex-1 text-left truncate">
                        {playingSession.NowPlayingItem?.SeriesName ?? playingSession.NowPlayingItem?.Name}
                    </span>
                    <div className="flex items-center gap-1.5 text-white/40 text-xs shrink-0">
                        <Gamepad2 size={13} />
                        Steuerung
                    </div>
                </button>
            )}

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                {tab === 'home' && <HomeTab onItemTap={setSheetItem} />}
                {tab === 'search' && <SearchTab onItemTap={setSheetItem} />}
                {tab === 'controls' && (
                    <ControlsTab
                        session={playingSession}
                        selectedSessionId={selectedSessionId}
                        onSendCmd={cmd}
                        onSendGen={gen}
                        onSkip={skip}
                        onSeek={(t) => cmd(PlaystateCommand.Seek, t)}
                    />
                )}
            </div>

            {/* Tab bar */}
            <TabBar active={tab} onChange={setTab} />

            {/* Item action sheet */}
            {sheetItem && (
                <ItemSheet
                    item={sheetItem}
                    sessionName={selectedSessionName}
                    hasSession={!!selectedSessionId}
                    onPlay={handlePlayItem}
                    onClose={() => setSheetItem(null)}
                />
            )}
        </div>
    );
};

export default RemotePage;
