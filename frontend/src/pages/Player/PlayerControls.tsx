import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    ArrowLeft,
    PictureInPicture2,
    AudioLines,
    SkipForward,
    Subtitles,
    Info,
    Minimize,
    SkipBack,
    Timer,
    Settings2,
    X,
    BookMarked,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Link, useNavigate } from 'react-router';
import { Badge } from '@/components/ui/badge';
import type {
    BaseItemDto,
    MediaSegmentDto,
    MediaSegmentType,
    TrickplayInfoDto,
} from '@jellyfin/sdk/lib/generated-client/models';
import { Slider } from '../../components/ui/slider';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
    formatPlayTime,
    ticksToReadableTime,
    ticksToSeconds,
    getEndsAt,
} from '@/utils/timeConversion';
import { useTranslation } from 'react-i18next';
import { usePlayerKeyboardControls } from '@/hooks/usePlayerKeyboardControls';
import { useVideoMediaSession } from '@/hooks/useVideoMediaSession';
import { useWakeLock } from '@/hooks/useWakeLock';
import NextEpisodeOverlay from '@/components/NextEpisodeOverlay';
import { getTrickplayImageUrl, getLogoUrl, getBackdropUrl } from '@/utils/jellyfinUrls';
import { useReportPlaybackProgress } from '@/hooks/api/usePlaybackProgress';
import { getRuntimePlaybackStats, type RuntimePlaybackStats } from '@/utils/playbackStats';
import { useSession } from '@/hooks/api/useSession';
import { useConfig } from '@/hooks/api/useConfig';
import {
    removeLastSubtitleLanguage,
    setLastAudioLanguage,
    setLastSubtitleLanguage,
} from '@/utils/localstorageLastlanguage';
import { AUTO_QUALITY_ID, VIDEO_QUALITY_OPTIONS } from '@/utils/videoQualityOptions';

function getPrimaryTrickplayInfo(trickplay?: BaseItemDto['Trickplay']) {
    if (!trickplay) return null;

    const entries = Object.values(trickplay);
    if (entries.length === 0) return null;
    const subEntries = Object.values(entries[0]);
    return subEntries[0] || null;
}

function getTrickplayTile(time: number, trickplay: TrickplayInfoDto) {
    const interval = trickplay.Interval ?? 1;
    const tileWidth = trickplay.TileWidth ?? 1;
    const tileHeight = trickplay.TileHeight ?? 1;

    const timeMs = time * 1000;
    const thumbnailIndex = Math.floor(timeMs / interval);
    const tilesPerImage = tileWidth * tileHeight;

    const imageIndex = Math.floor(thumbnailIndex / tilesPerImage);
    const tileIndex = thumbnailIndex % tilesPerImage;

    const x = tileIndex % tileWidth;
    const y = Math.floor(tileIndex / tileWidth);

    console.log({
        time,
        interval: trickplay.Interval,
        thumbnailIndex,
        tilesPerImage,
        imageIndex,
        totalImages: Math.ceil((trickplay.ThumbnailCount ?? 0) / tilesPerImage),
    });

    return {
        thumbnailIndex,
        imageIndex,
        x,
        y,
        width: trickplay.Width,
        height: trickplay.Height,
    };
}

function getCleanRating(rating?: string) {
    if (!rating) return '';
    const colonParts = rating.split(':');
    let clean = colonParts[colonParts.length - 1].trim();
    clean = clean.replace(/^(US|us)-/, '');
    return clean.toUpperCase();
}

interface PlayerControlsProps {
    item: BaseItemDto;
    player: ReturnType<typeof import('video.js').default> | null;
    audioTrackIndex: number | null;
    onAudioTrackChange: (index: number) => void;
    subtitleTrackIndex: number | null;
    onSubtitleTrackChange: (index: number | null) => void;
    subtitleSize: number;
    setSubtitleSize: React.Dispatch<React.SetStateAction<number>>;
    subtitleOffset: number;
    setSubtitleOffset: React.Dispatch<React.SetStateAction<number>>;
    videoQualityId: string;
    onVideoQualityChange: (qualityId: string) => void;
    isFullscreen: boolean;
    onFullscreenToggle?: () => void;
    mediaSegments?: MediaSegmentDto[];
    previousItem?: BaseItemDto | null;
    nextItem?: BaseItemDto | null;
    srcUrl: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

const PlayerControls = ({
    item,
    player,
    audioTrackIndex,
    onAudioTrackChange,
    subtitleTrackIndex,
    onSubtitleTrackChange,
    subtitleSize,
    setSubtitleSize,
    subtitleOffset,
    setSubtitleOffset,
    videoQualityId,
    onVideoQualityChange,
    isFullscreen,
    onFullscreenToggle,
    mediaSegments,
    previousItem,
    nextItem,
    srcUrl,
    containerRef,
}: PlayerControlsProps) => {
    const { t } = useTranslation('player');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [failedLogo, setFailedLogo] = useState(false);
    const [backdropFailed, setBackdropFailed] = useState(false);
    const [showPauseOverlay, setShowPauseOverlay] = useState(false);
    const [duration, setDuration] = useState(0);
    const [bufferedTime, setBufferedTime] = useState(0);
    const [volume, setVolume] = useState(() => {
        const saved = localStorage.getItem('playerVolume');
        return saved ? parseFloat(saved) : 1;
    });
    const [isMuted, setIsMuted] = useState(false);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPosition, setHoverPosition] = useState<number>(0);
    const [showControls, setShowControls] = useState(true);
    // Mirror of showControls for use inside event handlers (avoids stale closures
    // when a single tap synthesises mousemove + click on touch devices)
    const showControlsRef = useRef(true);
    // Tracks whether the last interaction came from touch/pen vs a mouse
    const lastPointerTypeRef = useRef<string>('mouse');
    // Distinguishes a single tap (toggle controls) from a double tap (seek)
    const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [seekFeedback, setSeekFeedback] = useState<'back' | 'forward' | null>(null);
    const seekFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isPiP, setIsPiP] = useState(false);
    const progressRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const navigate = useNavigate();
    const { reportProgress } = useReportPlaybackProgress();
    const [dismissedNextItemPrompt, setDismissedNextItemPrompt] = useState(false);
    const [stats, setStats] = useState<RuntimePlaybackStats | null>(null);
    const [showStats, setShowStats] = useState(false);
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
    const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
    const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sleepTimerTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { data: session } = useSession(item.Id, showStats);
    const { config } = useConfig();

    useEffect(() => {
        setContainer(containerRef.current);
    }, [containerRef]);

    useEffect(() => {
        if (!player) return;
        const update = () =>
            setStats(getRuntimePlaybackStats(player, item, session, audioTrackIndex, srcUrl));
        update();
        const interval = setInterval(update, 2000);
        return () => clearInterval(interval);
    }, [player, item, session, audioTrackIndex, srcUrl, showStats]);

    const resetPauseTimer = useCallback(() => {
        if (pauseTimerRef.current) {
            clearTimeout(pauseTimerRef.current);
        }
        if (!isPlaying) {
            setShowPauseOverlay(false);
            pauseTimerRef.current = setTimeout(() => {
                setShowPauseOverlay(true);
            }, 15000);
        }
    }, [isPlaying]);

    useEffect(() => {
        if (config.showPauseOverlay === false) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowPauseOverlay(false);
            if (pauseTimerRef.current) {
                clearTimeout(pauseTimerRef.current);
                pauseTimerRef.current = null;
            }
            return;
        }

        if (isPlaying) {
            setShowPauseOverlay(false);
            if (pauseTimerRef.current) {
                clearTimeout(pauseTimerRef.current);
                pauseTimerRef.current = null;
            }
            return;
        }

        const handleActivity = () => {
            resetPauseTimer();
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('touchstart', handleActivity);

        resetPauseTimer();

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            if (pauseTimerRef.current) {
                clearTimeout(pauseTimerRef.current);
            }
        };
    }, [isPlaying, resetPauseTimer, config.showPauseOverlay]);

    const setControlsVisible = (visible: boolean) => {
        showControlsRef.current = visible;
        setShowControls(visible);
    };

    const resetHideTimeout = () => {
        setControlsVisible(true);
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
            setControlsVisible(false);
        }, 3000);
    };

    const hideControls = () => {
        setControlsVisible(false);
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
    };

    const handleMouseMove = () => {
        // Synthesised mouse events from a touch tap shouldn't pop the controls
        // back open — the tap handler owns visibility on touch devices.
        if (lastPointerTypeRef.current === 'touch' || lastPointerTypeRef.current === 'pen') return;
        resetHideTimeout();
        if (!isPlaying) {
            resetPauseTimer();
        }
    };

    const handleMouseLeave = () => {
        hideControls();
    };

    // Remember how the surface is being interacted with so the click handler can
    // tell a touch tap apart from a mouse click.
    const handleSurfacePointerDown = (e: React.PointerEvent) => {
        lastPointerTypeRef.current = e.pointerType || 'mouse';
    };

    const showSeekFeedback = (dir: 'back' | 'forward') => {
        setSeekFeedback(dir);
        if (seekFeedbackTimerRef.current) clearTimeout(seekFeedbackTimerRef.current);
        seekFeedbackTimerRef.current = setTimeout(() => setSeekFeedback(null), 550);
    };

    // Center surface tap/click:
    //  - mouse → classic click-to-play/pause
    //  - touch single tap → toggle the controls overlay, never pause
    //  - touch double tap left/right third → seek -/+10s (YouTube/Netflix style)
    const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const isTouch =
            lastPointerTypeRef.current === 'touch' || lastPointerTypeRef.current === 'pen';
        if (!isTouch) {
            togglePlay();
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const zone: 'left' | 'right' | 'center' =
            x < rect.width * 0.35 ? 'left' : x > rect.width * 0.65 ? 'right' : 'center';

        if (singleTapTimerRef.current) {
            // Second tap within the window → double tap
            clearTimeout(singleTapTimerRef.current);
            singleTapTimerRef.current = null;
            if (zone === 'left') {
                handleSeekBackward();
                showSeekFeedback('back');
            } else if (zone === 'right') {
                handleSeekForward();
                showSeekFeedback('forward');
            } else {
                togglePlay();
            }
            return;
        }

        // First tap → briefly wait to see whether a double tap follows
        singleTapTimerRef.current = setTimeout(() => {
            singleTapTimerRef.current = null;
            if (showControlsRef.current) hideControls();
            else resetHideTimeout();
        }, 250);
    };

    const markItemAsCompleted = useCallback(
        (itemId: string | undefined) => {
            if (!itemId) return;
            reportProgress({
                itemId,
                positionTicks: item.RunTimeTicks || 0,
                isPaused: true,
            });
        },
        [item.RunTimeTicks, reportProgress]
    );

    useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
            if (singleTapTimerRef.current) {
                clearTimeout(singleTapTimerRef.current);
            }
            if (seekFeedbackTimerRef.current) {
                clearTimeout(seekFeedbackTimerRef.current);
            }
        };
    }, []);

    const handleSleepTimer = useCallback(
        (minutes: number | null) => {
            if (sleepTimerRef.current) {
                clearTimeout(sleepTimerRef.current);
                sleepTimerRef.current = null;
            }
            if (sleepTimerTickRef.current) {
                clearInterval(sleepTimerTickRef.current);
                sleepTimerTickRef.current = null;
            }
            if (minutes === null) {
                setSleepTimerMinutes(null);
                setSleepTimerRemaining(null);
                return;
            }
            const endTime = Date.now() + minutes * 60 * 1000;
            setSleepTimerMinutes(minutes);
            setSleepTimerRemaining(minutes);
            sleepTimerTickRef.current = setInterval(() => {
                const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 60000));
                setSleepTimerRemaining(remaining);
            }, 30000);
            sleepTimerRef.current = setTimeout(
                () => {
                    player?.pause();
                    setSleepTimerMinutes(null);
                    setSleepTimerRemaining(null);
                    if (sleepTimerTickRef.current) {
                        clearInterval(sleepTimerTickRef.current);
                        sleepTimerTickRef.current = null;
                    }
                },
                minutes * 60 * 1000
            );
        },
        [player]
    );

    useEffect(() => {
        return () => {
            if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
            if (sleepTimerTickRef.current) clearInterval(sleepTimerTickRef.current);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('playerVolume', volume.toString());
    }, [volume]);

    useEffect(() => {
        if (!player || player.isDisposed?.()) return;

        player.volume(volume);

        const updatePlayState = () => setIsPlaying(!player.paused());
        const updateTime = () => setCurrentTime(player.currentTime() || 0);
        const updateDuration = () => setDuration(player.duration() || 0);
        const updateMuted = () => setIsMuted(player.muted() || false);
        const updateBuffered = () => {
            const buffered = player.buffered();
            if (buffered && buffered.length > 0) {
                setBufferedTime(buffered.end(buffered.length - 1));
            }
        };

        const handleEnded = () => {
            if (!nextItem) return;
            markItemAsCompleted(item.Id);
            navigate(`/play/${nextItem.Id}`, { replace: true });
        };

        // PiP event listeners
        const videoEl = player.el()?.querySelector('video');
        const handleEnterPiP = () => setIsPiP(true);
        const handleLeavePiP = () => setIsPiP(false);
        if (videoEl) {
            videoEl.addEventListener('enterpictureinpicture', handleEnterPiP);
            videoEl.addEventListener('leavepictureinpicture', handleLeavePiP);
        }

        player.on('play', updatePlayState);
        player.on('pause', updatePlayState);
        player.on('timeupdate', updateTime);
        player.on('timeupdate', updateBuffered);
        player.on('loadedmetadata', updateDuration);
        player.on('progress', updateBuffered);
        player.on('volumechange', updateMuted);
        player.on('ended', handleEnded);

        return () => {
            player.off('play', updatePlayState);
            player.off('pause', updatePlayState);
            player.off('timeupdate', updateTime);
            player.off('timeupdate', updateBuffered);
            player.off('loadedmetadata', updateDuration);
            player.off('progress', updateBuffered);
            player.off('volumechange', updateMuted);
            player.off('ended', handleEnded);

            if (videoEl) {
                videoEl.removeEventListener('enterpictureinpicture', handleEnterPiP);
                videoEl.removeEventListener('leavepictureinpicture', handleLeavePiP);
            }
        };
    }, [player, volume, nextItem, dismissedNextItemPrompt, item.Id, navigate, markItemAsCompleted]);

    const togglePlay = useCallback(() => {
        if (!player) return;
        if (player.paused()) {
            player.play();
        } else {
            player.pause();
        }
    }, [player]);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!player || !progressRef.current) return;
        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        player.currentTime(percentage * duration);
    };

    const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        setHoverTime(percentage * duration);
        setHoverPosition(x);
    };

    const handleProgressLeave = () => {
        setHoverTime(null);
    };

    const togglePiP = useCallback(async () => {
        if (!player) return;
        const videoEl = player.el()?.querySelector('video');
        if (!videoEl) return;

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
                await videoEl.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Error toggling PiP:', error);
        }
    }, [player]);

    const handleVolumeChange = (values: number[]) => {
        if (!player || values.length === 0) return;
        const newVolume = values[0];
        setVolume(newVolume);
        if (newVolume > 0 && isMuted) player.muted(false);
        if (newVolume === 0 && !isMuted) player.muted(true);
        player.volume(newVolume);
    };

    const toggleMute = useCallback(() => {
        if (!player) return;
        player.muted(!isMuted);
    }, [player, isMuted]);

    const toggleFullscreen = useCallback(() => {
        onFullscreenToggle?.();
    }, [onFullscreenToggle]);

    const handleAudioTrackChange = (value: string) => {
        const index = parseInt(value, 10);
        onAudioTrackChange(index);
        setLastAudioLanguage(item.Id || '', index);
    };

    const handleSubtitleTrackChange = (value: string) => {
        if (value === 'off') {
            onSubtitleTrackChange(null);
            removeLastSubtitleLanguage(item.Id || '');
        } else {
            const index = parseInt(value, 10);
            onSubtitleTrackChange(index);
            setLastSubtitleLanguage(item.Id || '', index);
        }
    };

    const getMediaSegment = (type: MediaSegmentType) => {
        if (!mediaSegments || mediaSegments.length === 0) return null;
        return mediaSegments.find((segment) => segment.Type === type) || null;
    };

    const handleSkipSegment = (type: MediaSegmentType) => {
        if (!player) return;
        const segment = getMediaSegment(type);
        if (segment?.EndTicks) {
            const endSeconds = ticksToSeconds(segment.EndTicks);
            player.currentTime(endSeconds);
        }
    };

    const handleSeekBackward = useCallback(() => {
        if (!player) return;
        const newTime = Math.max(0, (player.currentTime() || 0) - 10);
        player.currentTime(newTime);
    }, [player]);

    const handleSeekForward = useCallback(() => {
        if (!player) return;
        const newTime = Math.min(duration, (player.currentTime() || 0) + 10);
        player.currentTime(newTime);
    }, [player, duration]);

    usePlayerKeyboardControls({
        togglePlay,
        toggleMute,
        toggleFullscreen,
        togglePiP,
        handleSeekBackward,
        handleSeekForward,
    });

    // Keep the screen awake during playback (installed PWA / mobile)
    useWakeLock(isPlaying);

    // OS-level media controls (lock screen, Control Center, media keys)
    const msPlay = useCallback(() => void player?.play(), [player]);
    const msPause = useCallback(() => player?.pause(), [player]);
    const msSeekTo = useCallback((time: number) => player?.currentTime(time), [player]);
    const msNext = useCallback(() => {
        if (nextItem) navigate(`/play/${nextItem.Id}`, { replace: true });
    }, [nextItem, navigate]);
    const msPrevious = useCallback(() => {
        if (previousItem) navigate(`/play/${previousItem.Id}`, { replace: true });
    }, [previousItem, navigate]);

    useVideoMediaSession({
        item,
        isPlaying,
        currentTime,
        duration,
        onPlay: msPlay,
        onPause: msPause,
        onSeekBackward: handleSeekBackward,
        onSeekForward: handleSeekForward,
        onSeekTo: msSeekTo,
        onNextTrack: nextItem ? msNext : undefined,
        onPreviousTrack: previousItem ? msPrevious : undefined,
    });

    const introSegment = getMediaSegment('Intro');
    const showSkipIntroButton =
        introSegment &&
        introSegment.StartTicks != null &&
        introSegment.EndTicks != null &&
        currentTime > ticksToSeconds(introSegment.StartTicks) &&
        currentTime < ticksToSeconds(introSegment.EndTicks);

    const outtroSegment = getMediaSegment('Outro');
    const showSkipOutroButton =
        outtroSegment &&
        outtroSegment.StartTicks != null &&
        outtroSegment.EndTicks != null &&
        currentTime > ticksToSeconds(outtroSegment.StartTicks) &&
        currentTime < ticksToSeconds(outtroSegment.EndTicks);

    const clampedCurrentTime = duration > 0 ? Math.min(currentTime, duration) : currentTime;
    const progressPercentage = Math.min(
        100,
        duration > 0 ? (clampedCurrentTime / duration) * 100 : 0
    );
    const bufferedPercentage = Math.min(100, duration > 0 ? (bufferedTime / duration) * 100 : 0);

    const title =
        item.Type === 'Episode'
            ? `${item.SeriesName} - S${item.ParentIndexNumber}E${item.IndexNumber} - ${item.Name}`
            : item.Name;

    const audioStreams = item.MediaStreams?.filter((s) => s.Type === 'Audio') || [];
    const subtitleStreams = item.MediaStreams?.filter((s) => s.Type === 'Subtitle') || [];

    const backdropItemId = item.BackdropImageTags?.length
        ? item.Id
        : (item.ParentBackdropItemId ?? item.Id);

    const timeRemaining = duration - currentTime;
    const outroStart =
        outtroSegment?.StartTicks != null ? ticksToSeconds(outtroSegment.StartTicks) : null;
    const showNextItemPrompt =
        nextItem &&
        duration > 0 &&
        !dismissedNextItemPrompt &&
        (outroStart != null
            ? currentTime >= outroStart // show when Outro/credits start
            : timeRemaining <= 30 || currentTime / duration >= 0.95); // fallback

    return (
        <>
            <div
                className="absolute top-0 left-0 w-full p-4 bg-linear-to-b from-black/80 to-transparent z-20 text-gray-200 text-lg flex items-center gap-2 transition-opacity duration-300"
                style={{
                    opacity: showControls && !showPauseOverlay ? 1 : 0,
                    pointerEvents: showControls && !showPauseOverlay ? 'auto' : 'none',
                    paddingTop: 'max(1rem, env(safe-area-inset-top))',
                    paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                    paddingRight: 'max(1rem, env(safe-area-inset-right))',
                }}
                onMouseMove={handleMouseMove}
            >
                <Button
                    variant="ghost"
                    onClick={() => {
                        if (window.history.state && window.history.state.idx > 0) {
                            navigate(-1);
                        } else {
                            navigate(`/item/${item.Id}`, { replace: true });
                        }
                    }}
                >
                    <ArrowLeft />
                </Button>
                <h1>{title}</h1>
            </div>
            <div
                className={`absolute inset-0 z-10 p-4 ${showControls ? '' : 'cursor-none'}`}
                onPointerDown={handleSurfacePointerDown}
                onClick={handleSurfaceClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            />
            {/* Double-tap seek feedback (touch) */}
            {seekFeedback && (
                <div
                    className={`absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center gap-1 text-white animate-pop-in ${
                        seekFeedback === 'back' ? 'left-[12%]' : 'right-[12%]'
                    }`}
                >
                    <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm">
                        {seekFeedback === 'back' ? (
                            <SkipBack className="w-7 h-7 fill-white" />
                        ) : (
                            <SkipForward className="w-7 h-7 fill-white" />
                        )}
                    </div>
                    <span className="text-sm font-medium">10s</span>
                </div>
            )}
            <div className="absolute bottom-28 right-8 z-30 flex gap-2">
                {showSkipIntroButton && !showNextItemPrompt && (
                    <Button
                        variant={'default'}
                        onClick={() => handleSkipSegment('Intro')}
                        className="cursor-pointer"
                        title={t('skipIntro')}
                    >
                        <SkipForward />
                        {t('skipIntro')}
                    </Button>
                )}
                {showSkipOutroButton && !showNextItemPrompt && (
                    <Button
                        variant={'default'}
                        onClick={() => handleSkipSegment('Outro')}
                        className="cursor-pointer"
                        title={t('skipOutro')}
                    >
                        <SkipForward />
                        {t('skipOutro')}
                    </Button>
                )}
                {showNextItemPrompt && (
                    <NextEpisodeOverlay
                        nextItem={nextItem}
                        onPlay={() => {
                            if (!player || !nextItem) return;
                            player.pause();
                            markItemAsCompleted(item.Id);
                            navigate(`/play/${nextItem.Id}`, { replace: true });
                        }}
                        onDismiss={() => setDismissedNextItemPrompt(true)}
                    />
                )}
            </div>
            <div
                className={`absolute top-18 left-8 z-30 p-4 bg-black/70 text-white text-sm rounded-md max-w-sm ${showStats && stats ? '' : 'hidden'}`}
                style={{
                    pointerEvents: showStats && stats ? 'auto' : 'none',
                }}
                onMouseEnter={handleMouseMove}
                onMouseMove={handleMouseMove}
            >
                {stats && (
                    <div>
                        <h4 className="mb-1">Playback Info</h4>
                        <div className="ml-2">
                            <p>
                                <span>Player</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.playbackInfo.player}
                                </span>
                            </p>
                            <p>
                                <span>Play method</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.playbackInfo.transcoding ? 'Transcoded' : 'Direct'}
                                </span>
                            </p>
                            <p>
                                <span>Protocol</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.playbackInfo.protocol}
                                </span>
                            </p>
                            {stats.playbackInfo.estimatedBandwidthKbps !== null && (
                                <p>
                                    <span>Est. Bandwidth</span>{' '}
                                    <span className="text-muted-foreground">
                                        {stats.playbackInfo.estimatedBandwidthKbps >= 1000
                                            ? `${(stats.playbackInfo.estimatedBandwidthKbps / 1000).toFixed(1)} Mbps`
                                            : `${stats.playbackInfo.estimatedBandwidthKbps} kbps`}
                                    </span>
                                </p>
                            )}
                            {stats.playbackInfo.currentAbrHeight !== null && (
                                <p>
                                    <span>ABR Quality</span>{' '}
                                    <span className="text-muted-foreground">
                                        {stats.playbackInfo.currentAbrHeight}p
                                    </span>
                                </p>
                            )}
                        </div>
                        <h4 className="mb-1 mt-3">Video Info</h4>
                        <div className="ml-2">
                            <p>
                                <span>Video Resolution</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.videoInfo.videoResolution.width}x
                                    {stats.videoInfo.videoResolution.height}
                                </span>
                            </p>
                            <p>
                                <span>Player Dimensions</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.videoInfo.playerDimensions.width}x
                                    {stats.videoInfo.playerDimensions.height}
                                </span>
                            </p>
                            <p>
                                <span>Dropped Frames</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.videoInfo.droppedFrames}
                                </span>
                            </p>
                            <p>
                                <span>Corrupted Frames</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.videoInfo.corruptedFrames}
                                </span>
                            </p>
                            <p>
                                <span>Total Frames</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.videoInfo.totalFrames}
                                </span>
                            </p>
                        </div>
                        <h4 className="mb-1 mt-3">Media Info</h4>
                        <div className="ml-2">
                            <p>
                                <span>Video Codec</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.videoCodec}
                                </span>
                            </p>
                            <p>
                                <span>Video Bitrate</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.videoBitrateKbps ?? 'N/A'} kbps
                                </span>
                            </p>
                            <p>
                                <span>Video Range Type</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.videoRangeType || 'N/A'}
                                </span>
                            </p>
                            <p>
                                <span>Audio Codec</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.audioCodec}
                                </span>
                            </p>
                            <p>
                                <span>Audio Bitrate</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.audioBitrateKbps ?? 'N/A'} kbps
                                </span>
                            </p>
                            <p>
                                <span>Audio Channels</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.audioChannels}
                                </span>
                            </p>
                            <p>
                                <span>Audio Sample Rate</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.audioSampleRate} Hz
                                </span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
            <div
                className="absolute bottom-0 left-0 right-0 z-20 bg-linear-to-t from-black/80 to-transparent p-4 transition-opacity duration-300"
                style={{
                    opacity: showControls && !showPauseOverlay ? 1 : 0,
                    pointerEvents: showControls && !showPauseOverlay ? 'auto' : 'none',
                    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
                    paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                    paddingRight: 'max(1rem, env(safe-area-inset-right))',
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Progress bar */}
                <div
                    ref={progressRef}
                    className="w-full h-3 rounded cursor-pointer mb-4 transition-all relative"
                    onClick={handleProgressClick}
                    onMouseMove={handleProgressHover}
                    onMouseLeave={handleProgressLeave}
                >
                    {/* Actually visible bar that's smaller for better asthetics */}
                    <div className="absolute top-1 left-0 w-full h-1 bg-gray-600 rounded pointer-events-none z-0" />
                    {/* buffered progress */}
                    <div
                        className="absolute top-1 left-0 h-1 bg-gray-500 rounded pointer-events-none z-5"
                        style={{ width: `${bufferedPercentage}%` }}
                    />
                    {/** Bar that shows the hovered time */}
                    <div
                        className="absolute top-1 left-0 h-1 bg-white/20 rounded pointer-events-none z-10"
                        style={{
                            width: hoverTime !== null ? `${(hoverTime / duration) * 100}%` : '0%',
                        }}
                    />
                    {/* current progress */}
                    <div
                        className="absolute top-1 left-0 h-1 bg-white rounded pointer-events-none z-15"
                        style={{ width: `${progressPercentage}%` }}
                    />
                    {/* Hover preview */}
                    {hoverTime !== null &&
                        item.Trickplay &&
                        (() => {
                            const trickplayInfo = getPrimaryTrickplayInfo(item.Trickplay);
                            if (!trickplayInfo || hoverTime === null) return null;

                            const { imageIndex, x, y, width, height } = getTrickplayTile(
                                hoverTime,
                                trickplayInfo
                            );

                            const previewWidth = width || 320;
                            const halfWidth = previewWidth / 2;
                            const clampedPosition = Math.max(
                                halfWidth,
                                Math.min(hoverPosition, window.innerWidth - halfWidth)
                            );

                            return (
                                <div
                                    className="absolute bottom-4 -translate-x-1/2 text-white pointer-events-none z-40 flex flex-col items-center"
                                    style={{ left: `${clampedPosition}px` }}
                                >
                                    <div
                                        className="relative overflow-hidden rounded-md mb-1"
                                        style={{
                                            width: width,
                                            height: height,
                                        }}
                                    >
                                        <img
                                            src={getTrickplayImageUrl(
                                                item.Id!,
                                                width || 320,
                                                imageIndex
                                            )}
                                            style={{
                                                position: 'absolute',
                                                left: -x * (width || 0),
                                                top: -y * (height || 0),
                                                maxWidth: 'none',
                                            }}
                                            draggable={false}
                                        />
                                    </div>
                                    <div className="text-center bg-black/90 p-1 px-2 rounded-md w-min">
                                        {formatPlayTime(hoverTime)}
                                    </div>
                                </div>
                            );
                        })()}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between text-white gap-4">
                    <div className="flex items-center gap-2">
                        {previousItem && (
                            <Button
                                variant={'ghost'}
                                size={'icon-lg'}
                                className="cursor-pointer"
                                title={t('previousItem')}
                                asChild
                            >
                                <Link to={`/play/${previousItem.Id}`} replace>
                                    <SkipBack size={24} />
                                </Link>
                            </Button>
                        )}
                        <Button
                            variant={'ghost'}
                            size={'icon-lg'}
                            onClick={togglePlay}
                            className="cursor-pointer"
                        >
                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </Button>
                        {nextItem && (
                            <Button
                                variant={'ghost'}
                                size={'icon-lg'}
                                className="cursor-pointer"
                                title={t('nextItem')}
                                asChild
                            >
                                <Link to={`/play/${nextItem.Id}`} replace>
                                    <SkipForward size={24} />
                                </Link>
                            </Button>
                        )}
                        <div className="text-sm ml-2">
                            {formatPlayTime(clampedCurrentTime)} / {formatPlayTime(duration)}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {(item.Chapters?.length ?? 0) > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon-lg"
                                        className="cursor-pointer"
                                        title="Kapitel"
                                    >
                                        <BookMarked size={20} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    container={container}
                                    className="w-64 max-h-80 overflow-y-auto"
                                >
                                    <DropdownMenuLabel>Kapitel</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {item.Chapters!.map((chapter, i) => {
                                        const startSec = ticksToSeconds(
                                            chapter.StartPositionTicks ?? 0
                                        );
                                        const nextStartSec = item.Chapters![i + 1]
                                            ? ticksToSeconds(
                                                  item.Chapters![i + 1].StartPositionTicks ?? 0
                                              )
                                            : Infinity;
                                        const isActive =
                                            currentTime >= startSec && currentTime < nextStartSec;
                                        return (
                                            <DropdownMenuItem
                                                key={i}
                                                className={`cursor-pointer flex justify-between gap-3 ${isActive ? 'bg-white/10 text-white' : ''}`}
                                                onClick={() => player?.currentTime(startSec)}
                                            >
                                                <span className="flex-1 truncate">
                                                    {chapter.Name || `Kapitel ${i + 1}`}
                                                </span>
                                                <span className="text-muted-foreground text-xs shrink-0">
                                                    {formatPlayTime(startSec)}
                                                </span>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant={'ghost'}
                                    size={'icon-lg'}
                                    className="cursor-pointer relative"
                                    title="Sleep Timer"
                                >
                                    <Timer
                                        size={20}
                                        className={sleepTimerMinutes ? 'text-amber-400' : ''}
                                    />
                                    {sleepTimerRemaining !== null && (
                                        <span className="absolute -top-1 -right-1 text-[9px] bg-amber-400 text-black rounded-full px-1 font-bold leading-tight">
                                            {sleepTimerRemaining}m
                                        </span>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent container={container}>
                                <DropdownMenuLabel>Sleep Timer</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup
                                    value={sleepTimerMinutes?.toString() ?? 'off'}
                                    onValueChange={(v) =>
                                        handleSleepTimer(v === 'off' ? null : parseInt(v, 10))
                                    }
                                >
                                    <DropdownMenuRadioItem value="off">Aus</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="30">
                                        30 Minuten
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="60">
                                        60 Minuten
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="90">
                                        90 Minuten
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="120">
                                        120 Minuten
                                    </DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            variant={'ghost'}
                            size={'icon-lg'}
                            onClick={() => setShowStats(!showStats)}
                            className="cursor-pointer"
                            title="Toggle Stats"
                        >
                            <Info />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant={'ghost'}
                                    size={'icon-lg'}
                                    className="cursor-pointer"
                                    title={t('quality')}
                                >
                                    <Settings2 />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent container={container} className="w-56">
                                <DropdownMenuLabel>{t('quality')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup
                                    value={videoQualityId}
                                    onValueChange={onVideoQualityChange}
                                >
                                    {VIDEO_QUALITY_OPTIONS.map((option) => (
                                        <DropdownMenuRadioItem key={option.id} value={option.id}>
                                            {option.id === AUTO_QUALITY_ID
                                                ? stats?.playbackInfo.currentAbrHeight
                                                    ? `${t('auto')} (${stats.playbackInfo.currentAbrHeight}p)`
                                                    : t('auto')
                                                : option.label}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {subtitleStreams.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant={'ghost'}
                                        size={'icon-lg'}
                                        className="cursor-pointer"
                                    >
                                        <Subtitles />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent container={container} className="w-56">
                                    <DropdownMenuLabel>{t('subtitles')}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup
                                        value={subtitleTrackIndex?.toString() || 'off'}
                                        onValueChange={handleSubtitleTrackChange}
                                    >
                                        <DropdownMenuRadioItem value="off">
                                            {t('off')}
                                        </DropdownMenuRadioItem>
                                        {subtitleStreams.map((stream, index) => (
                                            <DropdownMenuRadioItem
                                                key={index}
                                                value={index.toString()}
                                            >
                                                {stream.DisplayTitle ||
                                                    stream.Language ||
                                                    'Unknown'}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Subtitle Size</DropdownMenuLabel>
                                    <div className="flex items-center justify-between px-3 py-1 text-xs">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-7 p-0 cursor-pointer bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSubtitleSize((prev) => Math.max(50, prev - 10));
                                            }}
                                        >
                                            -
                                        </Button>
                                        <span className="font-mono text-white">
                                            {subtitleSize}%
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-7 p-0 cursor-pointer bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSubtitleSize((prev) => Math.min(250, prev + 10));
                                            }}
                                        >
                                            +
                                        </Button>
                                    </div>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Vertical Offset</DropdownMenuLabel>
                                    <div className="flex items-center justify-between px-3 py-1 text-xs">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-7 p-0 cursor-pointer bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSubtitleOffset((prev) => Math.max(0, prev - 10));
                                            }}
                                        >
                                            -
                                        </Button>
                                        <span className="font-mono text-white">
                                            {subtitleOffset}px
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-7 p-0 cursor-pointer bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSubtitleOffset((prev) =>
                                                    Math.min(300, prev + 10)
                                                );
                                            }}
                                        >
                                            +
                                        </Button>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {audioStreams.length > 1 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant={'ghost'}
                                        size={'icon-lg'}
                                        className="cursor-pointer"
                                    >
                                        <AudioLines />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent container={container}>
                                    <DropdownMenuLabel>{t('audioTracks')}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup
                                        value={audioTrackIndex?.toString() || ''}
                                        onValueChange={handleAudioTrackChange}
                                    >
                                        {audioStreams.map((stream, index) => (
                                            <DropdownMenuRadioItem
                                                key={index}
                                                value={stream.Index!.toString()}
                                            >
                                                {stream.Language || 'Unknown Language'} -{' '}
                                                {stream.Codec}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button
                            variant={'ghost'}
                            size={'icon-lg'}
                            onClick={toggleMute}
                            className="cursor-pointer"
                        >
                            {isMuted ? <VolumeX /> : <Volume2 />}
                        </Button>
                        <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            value={isMuted ? [0] : [volume]}
                            onValueChange={handleVolumeChange}
                            className="w-25 cursor-pointer mr-2 [&>[data-slot=slider-range]]:bg-white [&>[data-slot=slider-thumb]]:border-white [&>[data-slot=slider-thumb]]:bg-white"
                        />
                        {document.pictureInPictureEnabled && (
                            <Button
                                variant={'ghost'}
                                size={'icon-lg'}
                                onClick={togglePiP}
                                className="cursor-pointer"
                                title="Picture in Picture"
                            >
                                <PictureInPicture2
                                    size={20}
                                    className={isPiP ? 'text-white' : ''}
                                />
                            </Button>
                        )}
                        <Button
                            variant={'ghost'}
                            size={'icon-lg'}
                            onClick={toggleFullscreen}
                            className="cursor-pointer"
                        >
                            {isFullscreen ? <Minimize /> : <Maximize />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Pause Screen Overlay */}
            {showPauseOverlay && (
                <div
                    className="absolute inset-0 z-45 overflow-hidden animate-in fade-in duration-300 cursor-pointer"
                    onClick={togglePlay}
                >
                    {/* Backdrop artwork */}
                    {!backdropFailed && backdropItemId && (
                        <img
                            src={getBackdropUrl(backdropItemId)}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            draggable={false}
                            onError={() => setBackdropFailed(true)}
                        />
                    )}
                    <div className="absolute inset-0 bg-black/75" />

                    {/* Back button */}
                    <Button
                        variant="ghost"
                        size="icon-lg"
                        className="absolute top-5 left-5 z-10 rounded-full bg-black/40 hover:bg-black/60 text-white cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.history.state && window.history.state.idx > 0) {
                                navigate(-1);
                            } else {
                                navigate(`/item/${item.Id}`, { replace: true });
                            }
                        }}
                    >
                        <ArrowLeft />
                    </Button>

                    {/* Dismiss overlay button */}
                    <Button
                        variant="ghost"
                        size="icon-lg"
                        className="absolute top-5 right-5 z-10 rounded-full bg-black/40 hover:bg-black/60 text-white cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            resetPauseTimer();
                        }}
                    >
                        <X />
                    </Button>

                    {/* Item info */}
                    <div
                        className="relative z-5 h-full flex flex-col max-w-5xl px-8 sm:px-16 lg:px-32 pt-[8vh] pb-12 select-none cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex-1 flex flex-col justify-center gap-8 sm:gap-12">
                            {/* Movie Logo / Title */}
                            {failedLogo || !item.Id ? (
                                <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white">
                                    {item.Name}
                                </h1>
                            ) : (
                                <img
                                    src={getLogoUrl(item.Id)}
                                    alt={item.Name || ''}
                                    className="h-20 sm:h-28 object-contain object-left max-w-[60%]"
                                    onError={() => setFailedLogo(true)}
                                />
                            )}

                            {/* Info Badges Row */}
                            <div className="flex flex-wrap items-center gap-8 text-base sm:text-xl font-normal text-white/90">
                                {item.PremiereDate && (
                                    <span>{new Date(item.PremiereDate).getFullYear()}</span>
                                )}
                                {item.OfficialRating && (
                                    <Badge
                                        variant="outline"
                                        className="border-white/20 text-white/90 font-medium rounded-xs px-2 py-0.5 bg-transparent text-sm"
                                    >
                                        {getCleanRating(item.OfficialRating)}
                                    </Badge>
                                )}
                                {item.RunTimeTicks && (
                                    <span>{ticksToReadableTime(item.RunTimeTicks)}</span>
                                )}
                            </div>

                            {/* Overview / Synopsis */}
                            <p className="text-base sm:text-xl text-white/90 leading-relaxed font-normal line-clamp-4 max-w-3xl">
                                {item.Overview}
                            </p>
                        </div>

                        {/* Playback Progress Section */}
                        <div className="w-full space-y-3">
                            {/* Visual progress bar */}
                            <div className="w-full h-1 rounded-full bg-white/20 relative overflow-hidden">
                                <div
                                    className="absolute top-0 left-0 h-full bg-white/40 rounded-full"
                                    style={{ width: `${bufferedPercentage}%` }}
                                />
                                <div
                                    className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                            {/* Progress text details */}
                            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-white/70 font-medium tracking-wide">
                                <span>•</span>
                                <span>
                                    {formatPlayTime(clampedCurrentTime)} /{' '}
                                    {formatPlayTime(duration)}
                                </span>
                                <span>•</span>
                                <span>{progressPercentage.toFixed(0)}% watched</span>
                                <span>•</span>
                                <span>
                                    Ends at{' '}
                                    {(() => {
                                        const remainingTicks =
                                            (duration - clampedCurrentTime) * 10000000;
                                        return getEndsAt(remainingTicks).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        });
                                    })()}
                                </span>
                                <span>•</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PlayerControls;
