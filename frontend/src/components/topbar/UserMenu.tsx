import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    ChevronDown,
    Globe,
    Laptop,
    LogOut,
    Moon,
    Settings,
    Settings2,
    Sun,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/hooks/api/useCurrentUser';
import { useConfig } from '@/hooks/api/useConfig';
import { getPassword, setPassword } from '@/utils/localstorageCredentials';
import { useTheme } from '@/components/theme-provider';
import { logout } from '@/api/logout';
import { getApi } from '@/api/getApi';
import { getUserProfileImageUrl } from '@/utils/jellyfinUrls';
import { useTranslation } from 'react-i18next';
import { useUpdateUserConfiguration } from '@/hooks/api/playbackPreferences/useUpdateUserConfiguration';
import { useAuthorizeQuickConnect } from '@/hooks/api/useQuickConnect';
import i18n from 'i18next';
import {
    clearLocalTheme,
    getLocalTheme,
    LOCAL_THEME_PELAGICA_DEFAULT,
    LOCAL_THEME_SERVER_DEFAULT,
    saveLocalTheme,
} from '@/utils/localTheme';
import { useThemes } from '@/hooks/api/themes/useThemes';
import AuthorizeQuickConnectDialog from './AuthorizeQuickConnectDialog';
import LanguageCombobox from './LanguageCombobox';

const UserMenu = () => {
    const { t } = useTranslation('sidebar');
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { data: user } = useCurrentUser();
    const updateUserConfiguration = useUpdateUserConfiguration();
    const [audioLanguageOpen, setAudioLanguageOpen] = useState(false);
    const [subtitleLanguageOpen, setSubtitleLanguageOpen] = useState(false);
    const authorizeQuickConnect = useAuthorizeQuickConnect();
    const [quickConnectLoading, setQuickConnectLoading] = useState(false);
    const [quickConnectSuccess, setQuickConnectSuccess] = useState(false);
    const [quickConnectError, setQuickConnectError] = useState(false);
    const [localTheme, setLocalTheme] = useState<string | null>(
        getLocalTheme() ?? LOCAL_THEME_SERVER_DEFAULT
    );
    const { data: themes, isLoading: isLoadingThemes } = useThemes();
    const { config } = useConfig();
    const [seerrPassword, setSeerrPasswordState] = useState(getPassword() || '');

    const onAuthorizeQuickConnect = (code: string) => {
        setQuickConnectLoading(true);
        setQuickConnectSuccess(false);
        setQuickConnectError(false);
        authorizeQuickConnect
            .mutateAsync({ code })
            .then(() => {
                setQuickConnectLoading(false);
                setQuickConnectSuccess(true);
            })
            .catch((err) => {
                if (err?.response?.status === 500) {
                    setQuickConnectLoading(false);
                    setQuickConnectSuccess(true);
                } else {
                    setQuickConnectLoading(false);
                    setQuickConnectError(true);
                }
            });
    };

    if (!user?.Id) return null;

    const profileImageUrl = getUserProfileImageUrl(user.Id);
    const userName = user?.Name || t('unknown_user');
    const isAdmin = user?.Policy?.IsAdministrator;
    const initials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
                    <Avatar className="h-7 w-7 rounded-lg">
                        <AvatarImage src={profileImageUrl} alt={userName} />
                        <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium max-w-32 truncate">
                        {userName}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 rounded-lg">
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5">
                        <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarImage src={profileImageUrl} alt={userName} />
                            <AvatarFallback className="rounded-lg text-xs">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm font-medium">{userName}</span>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* Theme */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        {theme === 'light' ? (
                            <Sun className="text-muted-foreground" />
                        ) : theme === 'dark' ? (
                            <Moon className="text-muted-foreground" />
                        ) : (
                            <Laptop className="text-muted-foreground" />
                        )}
                        {t('theme')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setTheme('light')}>
                                <Sun className="text-muted-foreground" />
                                {t('light')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme('dark')}>
                                <Moon className="text-muted-foreground" />
                                {t('dark')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme('system')}>
                                <Laptop className="text-muted-foreground" />
                                {t('system')}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>

                {/* Language */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Globe className="text-muted-foreground" />
                        {t('language')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            {[
                                { code: 'en', flag: 'us', label: 'English' },
                                { code: 'de', flag: 'de', label: 'Deutsch' },
                                { code: 'fr', flag: 'fr', label: 'Français' },
                                { code: 'pt', flag: 'pt', label: 'Português' },
                                { code: 'ja', flag: 'jp', label: '日本語' },
                            ].map(({ code, flag, label }) => (
                                <DropdownMenuItem
                                    key={code}
                                    onClick={() => i18n.changeLanguage(code)}
                                >
                                    <img
                                        src={`https://flagcdn.com/${flag}.svg`}
                                        className="inline h-4 w-6 object-cover"
                                        alt={flag}
                                    />
                                    {label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>

                {/* Preferences */}
                <Dialog>
                    <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Settings2 className="text-muted-foreground" />
                            {t('preferences')}
                        </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t('preferences')}</DialogTitle>
                        </DialogHeader>
                        <div>
                            <Label className="mb-2 text-sm font-medium">
                                {t('audio_language_preference')}
                            </Label>
                            <LanguageCombobox
                                selected={user.Configuration?.AudioLanguagePreference || ''}
                                onSelect={(code) => {
                                    updateUserConfiguration.mutate({
                                        userId: user.Id!,
                                        playbackPreferences: { AudioLanguagePreference: code },
                                    });
                                    setAudioLanguageOpen(false);
                                }}
                                open={audioLanguageOpen}
                                onOpenChange={setAudioLanguageOpen}
                            />
                        </div>
                        <div>
                            <Label className="mb-2 text-sm font-medium">
                                {t('subtitle_language_preference')}
                            </Label>
                            <LanguageCombobox
                                selected={user.Configuration?.SubtitleLanguagePreference || ''}
                                onSelect={(code) => {
                                    updateUserConfiguration.mutate({
                                        userId: user.Id!,
                                        playbackPreferences: { SubtitleLanguagePreference: code },
                                    });
                                    setSubtitleLanguageOpen(false);
                                }}
                                open={subtitleLanguageOpen}
                                onOpenChange={setSubtitleLanguageOpen}
                            />
                        </div>
                        <div>
                            <Label className="mb-2 text-sm font-medium">
                                {t('theme_preference')}
                            </Label>
                            <Select
                                value={localTheme || undefined}
                                onValueChange={(val) => {
                                    if (val === LOCAL_THEME_SERVER_DEFAULT) clearLocalTheme();
                                    else saveLocalTheme(val);
                                    setLocalTheme(val);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('select_theme')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value={LOCAL_THEME_SERVER_DEFAULT}>
                                            {t('server_default')}
                                        </SelectItem>
                                        <SelectItem value={LOCAL_THEME_PELAGICA_DEFAULT}>
                                            {t('pelagica_default')}
                                        </SelectItem>
                                    </SelectGroup>
                                    {!isLoadingThemes && themes && (
                                        <SelectGroup>
                                            <SelectLabel>Custom Themes</SelectLabel>
                                            {themes.map((th) => (
                                                <SelectItem key={th.id} value={th.id}>
                                                    {th.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        {config?.seerrUrl && (
                            <div>
                                <Label className="mb-2 text-sm font-medium">Seerr Password</Label>
                                <Input
                                    type="password"
                                    value={seerrPassword}
                                    onChange={(e) => {
                                        const pwd = e.target.value;
                                        setSeerrPasswordState(pwd);
                                        setPassword(pwd);
                                    }}
                                    placeholder="Your Jellyfin Password"
                                />
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <DropdownMenuSeparator />

                <AuthorizeQuickConnectDialog
                    onAuthorize={onAuthorizeQuickConnect}
                    isLoading={quickConnectLoading}
                    hasSuccess={quickConnectSuccess}
                    hasError={quickConnectError}
                />

                {isAdmin && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link to="/settings">
                                <Settings className="text-muted-foreground" />
                                {t('pelagica_config')}
                            </Link>
                        </DropdownMenuItem>
                    </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => {
                        logout(getApi());
                        navigate('/login', { replace: true });
                    }}
                >
                    <LogOut />
                    {t('logout')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    v{import.meta.env.VITE_APP_VERSION ?? 'dev'}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default UserMenu;
