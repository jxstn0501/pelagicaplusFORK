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
} from 'lucide-react';
import { useActiveSessions } from '@/hooks/api/useActiveSessions';
import {
    useRemotePlaystate,
    useRemoteGeneralCommand,
    PlaystateCommand,
} from '@/hooks/api/useRemotePlaystate';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import { formatPlayTime, ticksToSeconds } from '@/utils/timeConversion';
import type { SessionInfoDto } from '@jellyfin/sdk/lib/generated-client/models';

const TICKS_PER_SECOND = 10_000_000;
const SKIP_SECONDS = 10;

function formatTicks(ticks: number | null | undefined): string {
    if (!ticks) return '0:00';
    return formatPlayTime(ticksToSeconds(ticks));
}

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
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (sessions.length === 0) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/60 text-sm">
                <WifiOff size={16} />
                Kein Gerät spielt gerade
            </div>
        );
    }

    return (
        <div ref={ref} className="relative w-full max-w-xs">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-sm transition-colors"
            >
                <MonitorPlay size={16} className="shrink-0 text-white/60" />
                <span className="flex-1 text-left truncate">
                    {selected
                        ? `${selected.DeviceName ?? 'Gerät'} — ${selected.UserName ?? ''}`
                        : 'Gerät wählen …'}
                </span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && (
                <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl bg-zinc-800 border border-white/10 shadow-xl overflow-hidden">
                    {sessions.map((s) => (
                        <button
                            key={s.Id}
                            onClick={() => {
                                onSelect(s.Id!);
                                setOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/10 transition-colors ${
                                s.Id === selectedId ? 'text-white bg-white/5' : 'text-white/80'
                            }`}
                        >
                            <MonitorPlay size={16} className="shrink-0 text-white/40" />
                            <div className="flex-1 min-w-0">
                                <div className="truncate font-medium">
                                    {s.DeviceName ?? 'Unbekanntes Gerät'}
                                </div>
                                <div className="truncate text-xs text-white/50">
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

function ControlButton({
    onClick,
    children,
    label,
    large,
    variant = 'default',
}: {
    onClick: () => void;
    children: React.ReactNode;
    label: string;
    large?: boolean;
    variant?: 'default' | 'primary' | 'danger';
}) {
    const base =
        'flex items-center justify-center rounded-full transition-all active:scale-90 select-none touch-manipulation';
    const sizes = large ? 'w-18 h-18 min-w-[72px] min-h-[72px]' : 'w-14 h-14 min-w-[56px] min-h-[56px]';
    const colors =
        variant === 'primary'
            ? 'bg-white text-black hover:bg-white/90 shadow-lg'
            : variant === 'danger'
              ? 'bg-red-600/80 text-white hover:bg-red-600'
              : 'bg-white/10 text-white hover:bg-white/20';

    return (
        <button
            onClick={onClick}
            aria-label={label}
            title={label}
            className={`${base} ${sizes} ${colors}`}
        >
            {children}
        </button>
    );
}

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
    const [dragValue, setDragValue] = useState(0);
    const barRef = useRef<HTMLDivElement>(null);

    const pct = totalTicks > 0 ? (positionTicks / totalTicks) * 100 : 0;
    const displayPct = dragging ? dragValue : pct;

    function getClientX(e: React.TouchEvent | React.MouseEvent): number {
        if ('touches' in e) return e.touches[0].clientX;
        return e.clientX;
    }

    function calcPct(clientX: number): number {
        if (!barRef.current) return 0;
        const rect = barRef.current.getBoundingClientRect();
        return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    }

    function handlePointerDown(e: React.TouchEvent | React.MouseEvent) {
        const p = calcPct(getClientX(e));
        setDragging(true);
        setDragValue(p);
    }

    function handlePointerMove(e: React.TouchEvent | React.MouseEvent) {
        if (!dragging) return;
        setDragValue(calcPct(getClientX(e)));
    }

    function handlePointerUp(e: React.TouchEvent | React.MouseEvent) {
        if (!dragging) return;
        const p = calcPct(getClientX(e));
        setDragging(false);
        onSeek(Math.round((p / 100) * totalTicks));
    }

    return (
        <div className="w-full px-1">
            <div
                ref={barRef}
                className="relative h-2 rounded-full bg-white/20 cursor-pointer"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={(e) => {
                    if (dragging) handlePointerUp(e);
                }}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
            >
                <div
                    className="absolute left-0 top-0 h-full rounded-full bg-white transition-[width] duration-200"
                    style={{ width: `${displayPct}%` }}
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-md"
                    style={{ left: `calc(${displayPct}% - 8px)` }}
                />
            </div>
            <div className="flex justify-between mt-1 text-xs text-white/50">
                <span>{formatTicks(positionTicks)}</span>
                <span>{formatTicks(totalTicks)}</span>
            </div>
        </div>
    );
}

const RemotePage = () => {
    const navigate = useNavigate();
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const { data: sessions = [], isLoading, isError } = useActiveSessions();
    const { mutate: sendCommand } = useRemotePlaystate();
    const { mutate: sendGeneral } = useRemoteGeneralCommand();

    const isLoggedIn = Boolean(localStorage.getItem('jf_token'));

    useEffect(() => {
        if (!isLoggedIn) navigate('/login', { replace: true });
    }, [isLoggedIn, navigate]);

    const playingSessions = sessions.filter((s) => s.NowPlayingItem);

    useEffect(() => {
        if (playingSessions.length === 1 && !selectedSessionId) {
            setSelectedSessionId(playingSessions[0].Id!);
        }
    }, [playingSessions, selectedSessionId]);

    const session = playingSessions.find((s) => s.Id === selectedSessionId) ?? null;
    const item = session?.NowPlayingItem ?? null;
    const playState = session?.PlayState ?? null;
    const isPaused = playState?.IsPaused ?? true;
    const isMuted = playState?.IsMuted ?? false;
    const positionTicks = playState?.PositionTicks ?? 0;
    const totalTicks = item?.RunTimeTicks ?? 0;

    const posterUrl = item?.Id ? getPrimaryImageUrl(item.Id, { width: 200 }) : null;

    function cmd(command: PlaystateCommand, seekPositionTicks?: number) {
        if (!selectedSessionId) return;
        sendCommand({ sessionId: selectedSessionId, command, seekPositionTicks });
    }

    function gen(commandName: string) {
        if (!selectedSessionId) return;
        sendGeneral({ sessionId: selectedSessionId, commandName });
    }

    function handleSkip(seconds: number) {
        const newPos = Math.max(0, Math.min(totalTicks, positionTicks + seconds * TICKS_PER_SECOND));
        cmd(PlaystateCommand.Seek, newPos);
    }

    function handleSeek(ticks: number) {
        cmd(PlaystateCommand.Seek, ticks);
    }

    if (!isLoggedIn) return null;

    return (
        <div className="min-h-dvh bg-zinc-950 text-white flex flex-col items-center">
            {/* Header */}
            <div className="w-full max-w-md px-4 pt-safe-top pt-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <MonitorPlay size={18} className="text-white" />
                        </div>
                        <span className="font-semibold text-lg tracking-tight">Fernbedienung</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {isLoading ? (
                            <RefreshCw size={14} className="text-white/40 animate-spin" />
                        ) : isError ? (
                            <WifiOff size={14} className="text-red-400" />
                        ) : (
                            <Wifi size={14} className="text-green-400" />
                        )}
                    </div>
                </div>

                <SessionPicker
                    sessions={playingSessions}
                    selectedId={selectedSessionId}
                    onSelect={setSelectedSessionId}
                />
            </div>

            {/* Content area */}
            <div className="flex-1 w-full max-w-md px-4 flex flex-col gap-6 pb-10">
                {session && item ? (
                    <>
                        {/* Now playing info */}
                        <div className="flex items-start gap-4 bg-white/5 rounded-2xl p-4">
                            {posterUrl && (
                                <img
                                    src={posterUrl}
                                    alt={item.Name ?? ''}
                                    className="w-16 h-24 rounded-lg object-cover shrink-0 shadow-md"
                                />
                            )}
                            <div className="flex-1 min-w-0 pt-1">
                                <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                                    {isPaused ? 'Pausiert' : 'Läuft gerade'}
                                </div>
                                <div className="font-semibold text-base leading-tight truncate">
                                    {item.SeriesName ?? item.Name}
                                </div>
                                {item.SeriesName && (
                                    <div className="text-sm text-white/60 mt-0.5">
                                        {item.SeasonName && `${item.SeasonName} · `}
                                        {item.Name}
                                    </div>
                                )}
                                <div className="text-xs text-white/40 mt-2 flex items-center gap-1">
                                    <MonitorPlay size={11} />
                                    {session.DeviceName ?? 'Unbekanntes Gerät'}
                                </div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        {totalTicks > 0 && (
                            <ProgressBar
                                positionTicks={positionTicks}
                                totalTicks={totalTicks}
                                onSeek={handleSeek}
                            />
                        )}

                        {/* Main transport controls */}
                        <div className="flex items-center justify-center gap-4">
                            <ControlButton
                                onClick={() => cmd(PlaystateCommand.PreviousTrack)}
                                label="Vorheriger Titel"
                            >
                                <SkipBack size={22} />
                            </ControlButton>

                            <ControlButton
                                onClick={() => handleSkip(-SKIP_SECONDS)}
                                label="10 Sekunden zurück"
                            >
                                <span className="flex flex-col items-center leading-none">
                                    <svg
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                        <path d="M3 3v5h5" />
                                        <text
                                            x="12"
                                            y="16"
                                            textAnchor="middle"
                                            fontSize="8"
                                            fontWeight="700"
                                            stroke="none"
                                            fill="currentColor"
                                        >
                                            10
                                        </text>
                                    </svg>
                                </span>
                            </ControlButton>

                            <ControlButton
                                onClick={() => cmd(PlaystateCommand.PlayPause)}
                                label={isPaused ? 'Abspielen' : 'Pausieren'}
                                large
                                variant="primary"
                            >
                                {isPaused ? <Play size={30} fill="black" /> : <Pause size={30} fill="black" />}
                            </ControlButton>

                            <ControlButton
                                onClick={() => handleSkip(SKIP_SECONDS)}
                                label="10 Sekunden vor"
                            >
                                <svg
                                    width="22"
                                    height="22"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                                    <path d="M21 3v5h-5" />
                                    <text
                                        x="12"
                                        y="16"
                                        textAnchor="middle"
                                        fontSize="8"
                                        fontWeight="700"
                                        stroke="none"
                                        fill="currentColor"
                                    >
                                        10
                                    </text>
                                </svg>
                            </ControlButton>

                            <ControlButton
                                onClick={() => cmd(PlaystateCommand.NextTrack)}
                                label="Nächster Titel"
                            >
                                <SkipForward size={22} />
                            </ControlButton>
                        </div>

                        {/* Volume controls */}
                        <div className="flex items-center justify-center gap-3">
                            <ControlButton
                                onClick={() => gen('ToggleMute')}
                                label={isMuted ? 'Ton an' : 'Ton aus'}
                            >
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </ControlButton>

                            <ControlButton onClick={() => gen('VolumeDown')} label="Leiser">
                                <Volume1 size={20} />
                            </ControlButton>

                            <ControlButton onClick={() => gen('VolumeUp')} label="Lauter">
                                <Volume2 size={20} />
                            </ControlButton>

                            <ControlButton
                                onClick={() => cmd(PlaystateCommand.Stop)}
                                label="Stop"
                                variant="danger"
                            >
                                <Square size={20} fill="white" />
                            </ControlButton>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/40 py-16">
                        <MonitorPlay size={56} strokeWidth={1} />
                        <div className="text-center">
                            <p className="font-medium text-white/60">
                                {playingSessions.length === 0
                                    ? 'Kein aktives Gerät'
                                    : 'Gerät auswählen'}
                            </p>
                            <p className="text-sm mt-1">
                                {playingSessions.length === 0
                                    ? 'Starte die Wiedergabe auf einem anderen Gerät'
                                    : 'Wähle oben ein Gerät zum Steuern aus'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RemotePage;
