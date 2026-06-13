import { useCallback, useEffect, useRef, useState } from 'react';
import Page from '../Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@radix-ui/react-label';
import { Server, TriangleAlert, User, UserPlus } from 'lucide-react';
import { usePublicUsers, getPublicUserImageUrl } from '@/hooks/api/usePublicUsers';
import { jellyfin } from '@/api/jellyfinClient';
import { useLogin } from '@/hooks/api/useLogin';
import {
    useQuickConnectInitiate,
    useQuickConnectStatus,
    useQuickConnectAuthenticate,
} from '@/hooks/api/useQuickConnect';
import { Spinner } from '@/components/ui/spinner';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@/hooks/api/useConfig';
import { getServerUrl } from '@/utils/localstorageCredentials';
import { useServerBranding } from '../../hooks/api/useServerBranding';

const Disclaimer = ({ text }: { text: string | null | undefined }) => {
    if (!text) return null;
    return (
        <p className="mt-4 text-sm text-muted-foreground text-center whitespace-pre-wrap">
            {text
                .split('\n')
                .filter((line) => !!line.trim())
                .map((line, i, arr) => (
                    <span key={i}>
                        {line}
                        {i < arr.length - 1 && <br />}
                    </span>
                ))}
        </p>
    );
};

const LoginPage = () => {
    const { config } = useConfig();
    const { data: branding } = useServerBranding();
    const navigate = useNavigate();
    const { t } = useTranslation('login');
    const [step, setStep] = useState<'server' | 'login' | 'quickconnect'>(
        config?.serverAddress ? 'login' : 'server'
    );

    const [checkingServer, setCheckingServer] = useState(false);
    const [serverCheckError, setServerCheckError] = useState<string | null>(null);

    const login = useLogin();
    const [loggingIn, setLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [showManual, setShowManual] = useState(false);
    const [selectedUsername, setSelectedUsername] = useState('');
    const { data: publicUsers } = usePublicUsers(step === 'login');
    const hasProfiles = !!publicUsers && publicUsers.length > 0;

    const handleProfileSelect = async (name: string, hasPassword: boolean) => {
        setSelectedUsername(name);
        setLoginError(null);
        if (!hasPassword) {
            setLoggingIn(true);
            try {
                await login.mutateAsync({
                    server: getServerUrl() || '',
                    username: name,
                    password: '',
                });
                navigate('/', { replace: true });
                return;
            } catch {
                // Password actually required — fall through to the manual form
            } finally {
                setLoggingIn(false);
            }
        }
        setShowManual(true);
    };

    const quickConnectInitiate = useQuickConnectInitiate();
    const quickConnectAuthenticate = useQuickConnectAuthenticate();
    const [quickConnectSecret, setQuickConnectSecret] = useState<string | undefined>(undefined);
    const [quickConnectCode, setQuickConnectCode] = useState<string | null>(null);
    const [quickConnectError, setQuickConnectError] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [quickConnectApproved, setQuickConnectApproved] = useState(false);
    const initiatingQuickConnectRef = useRef(false);

    const quickConnectStatus = useQuickConnectStatus(
        getServerUrl() || '',
        quickConnectSecret,
        isPolling
    );

    const [splashScreenUrl, setSplashScreenUrl] = useState<string | null>(getServerUrl);

    useEffect(() => {
        const serverUrl = getServerUrl();
        if (!serverUrl) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSplashScreenUrl(null);
            return;
        }
        const splashUrl = new URL('/Branding/Splashscreen', serverUrl).toString();
        setSplashScreenUrl(splashUrl);
    }, [step]);

    useEffect(() => {
        if (config?.serverAddress) {
            if (!config.serverAddress.trim()) return;
            if (
                !config.serverAddress.startsWith('http://') &&
                !config.serverAddress.startsWith('https://')
            ) {
                console.warn(
                    'Ignoring predefined server address: If you specify a server address in config.json, it must include http:// or https://'
                );
                return;
            }
            localStorage.setItem('jf_server', config.serverAddress);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStep('login');
            setServerCheckError(null);
        }
    }, [config?.serverAddress]);

    const initiateQuickConnect = useCallback(async () => {
        setQuickConnectError(null);
        try {
            const server = getServerUrl() || '';
            const result = await quickConnectInitiate.mutateAsync(server);

            if (result.Code && result.Secret) {
                setQuickConnectCode(result.Code);
                setQuickConnectSecret(result.Secret);
                setIsPolling(true);
            } else {
                setQuickConnectError(t('quick_connect_failed'));
            }
        } catch (error) {
            console.error('Quick Connect initiation error:', error);
            setQuickConnectError(t('quick_connect_failed'));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [t]);

    const handleQuickConnectAuthenticated = useCallback(async () => {
        if (!quickConnectSecret || quickConnectApproved) return;

        setQuickConnectApproved(true);
        setIsPolling(false);
        setLoggingIn(true);

        try {
            const server = getServerUrl() || '';
            await quickConnectAuthenticate.mutateAsync({ server, secret: quickConnectSecret });

            console.log('Quick Connect login successful');
            navigate('/', { replace: true });
        } catch (error) {
            console.error('Quick Connect authentication error:', error);
            setQuickConnectError(t('quick_connect_failed'));
            setQuickConnectApproved(false);
            setLoggingIn(false);
        }
    }, [quickConnectSecret, quickConnectAuthenticate, navigate, t, quickConnectApproved]);

    useEffect(() => {
        if (step === 'quickconnect' && !quickConnectCode && !initiatingQuickConnectRef.current) {
            initiatingQuickConnectRef.current = true;
            initiateQuickConnect().finally(() => {
                initiatingQuickConnectRef.current = false;
            });
        }
    }, [quickConnectCode, step, initiateQuickConnect]);

    useEffect(() => {
        if (quickConnectStatus.data?.Authenticated) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            handleQuickConnectAuthenticated();
        }
    }, [quickConnectStatus.data, handleQuickConnectAuthenticated]);

    const onSubmitServer = async (e: React.FormEvent) => {
        setCheckingServer(true);

        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const serverInput = form.querySelector('#server-address') as HTMLInputElement;
        const serverAddress = serverInput?.value?.trim();

        if (!serverAddress) {
            setServerCheckError(t('please_enter_server_address'));
            setCheckingServer(false);
            return;
        }

        const servers = await jellyfin.discovery.getRecommendedServerCandidates(serverAddress);
        const best = jellyfin.discovery.findBestServer(servers);

        if (!best) {
            setServerCheckError(t('could_not_find_server'));
            setCheckingServer(false);
            return;
        }

        console.log('Found server:', best.address);

        localStorage.setItem('jf_server', best.address);
        setStep('login');
        setServerCheckError(null);
        setCheckingServer(false);
    };

    const onSubmitLogin = async (e: React.FormEvent) => {
        setLoggingIn(true);

        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const usernameInput = form.querySelector('#username') as HTMLInputElement;
        const passwordInput = form.querySelector('#password') as HTMLInputElement;
        const username = usernameInput?.value?.trim();
        const password = passwordInput?.value?.trim();

        if (!username) {
            setLoginError(t('enter_at_least_username'));
            setLoggingIn(false);
            return;
        }

        try {
            console.log('Attempting login for user:', username);
            console.log('Using server:', getServerUrl() || '');
            await login.mutateAsync({
                server: getServerUrl() || '',
                username,
                password,
            });
            setLoginError(null);
            setLoggingIn(false);

            console.log('Login successful');
            navigate('/', { replace: true });
        } catch (error) {
            setLoginError(t('login_failed'));
            setLoggingIn(false);
            console.error('Login error:', error);
        } finally {
            setLoggingIn(false);
        }
    };

    return (
        <Page
            title={t('title')}
            className="flex items-center justify-center h-full w-full"
            bgItem={
                splashScreenUrl && branding?.SplashscreenEnabled ? (
                    <div className="fixed top-0 left-0 w-full h-full -z-20 overflow-hidden">
                        <div className="absolute inset-0">
                            <img
                                src={splashScreenUrl}
                                alt="Splash Screen"
                                className="w-full h-full object-cover blur-lg scale-110 opacity-40"
                            />
                        </div>
                        <div className="absolute inset-0 bg-linear-to-b from-background/80 via-background/50 to-background" />
                        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
                    </div>
                ) : undefined
            }
        >
            {step === 'server' && (
                <Card className="max-w-md w-full mx-auto sm:-translate-y-12">
                    <CardHeader className="flex flex-col items-center">
                        <div className="mb-1 h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <Server size={24} className="text-gray-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            {t('connect_to_jellyfin')}
                        </CardTitle>
                        <CardDescription>{t('enter_server_address')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onSubmitServer}>
                            <Label htmlFor="server-address" className="mb-2 block font-medium">
                                {t('server_address')}
                            </Label>
                            <Input
                                id="server-address"
                                type="text"
                                placeholder="jellyfin.example.com"
                                className="w-full"
                                autoCapitalize="none"
                                autoCorrect="off"
                                inputMode="url"
                                autoFocus
                            />
                            <p className="mt-2 text-xs text-muted-foreground">{t('no_http')}</p>
                            {serverCheckError && (
                                <p className="mt-2 text-sm text-destructive flex items-center gap-2">
                                    <TriangleAlert size={16} />
                                    {serverCheckError}
                                </p>
                            )}
                            <Button className="w-full mt-4" type="submit" disabled={checkingServer}>
                                {checkingServer ? (
                                    <>
                                        <Spinner />
                                        {t('connecting')}
                                    </>
                                ) : (
                                    t('connect')
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
            {step === 'login' && hasProfiles && !showManual && (
                <Card className="max-w-md w-full mx-auto sm:-translate-y-12">
                    <CardHeader className="flex flex-col items-center">
                        <CardTitle className="text-2xl font-bold">
                            {t('who_is_watching', { defaultValue: "Who's watching?" })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            {publicUsers!.map((u) => {
                                const img = getPublicUserImageUrl(u.Id, u.PrimaryImageTag);
                                const initials = (u.Name || '?')
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase();
                                return (
                                    <button
                                        key={u.Id}
                                        type="button"
                                        disabled={loggingIn}
                                        onClick={() =>
                                            handleProfileSelect(u.Name || '', !!u.HasPassword)
                                        }
                                        className="flex flex-col items-center gap-2 group focus:outline-none"
                                    >
                                        <Avatar className="h-20 w-20 rounded-lg ring-2 ring-transparent group-hover:ring-brand group-focus-visible:ring-brand transition-all group-hover:scale-105">
                                            <AvatarImage src={img} alt={u.Name || ''} />
                                            <AvatarFallback className="rounded-lg text-lg">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm truncate max-w-20 text-muted-foreground group-hover:text-foreground">
                                            {u.Name}
                                        </span>
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedUsername('');
                                    setShowManual(true);
                                }}
                                className="flex flex-col items-center gap-2 group focus:outline-none"
                            >
                                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/40 flex items-center justify-center group-hover:border-brand group-hover:scale-105 transition-all">
                                    <UserPlus className="h-7 w-7 text-muted-foreground group-hover:text-foreground" />
                                </div>
                                <span className="text-sm truncate max-w-20 text-muted-foreground group-hover:text-foreground">
                                    {t('other_user', { defaultValue: 'Other' })}
                                </span>
                            </button>
                        </div>
                        {loginError && (
                            <p className="mt-4 text-sm text-destructive flex items-center gap-2">
                                <TriangleAlert size={16} />
                                {loginError}
                            </p>
                        )}
                        <Button
                            className="mt-6 w-full"
                            variant="secondary"
                            onClick={() => setStep('quickconnect')}
                        >
                            {t('quick_connect')}
                        </Button>
                        <Button
                            variant="link"
                            className="w-full mt-2"
                            onClick={() => setStep('server')}
                        >
                            {t('back_to_server')}
                        </Button>
                        <Disclaimer text={branding?.LoginDisclaimer} />
                    </CardContent>
                </Card>
            )}
            {step === 'login' && (!hasProfiles || showManual) && (
                <Card className="max-w-md w-full mx-auto sm:-translate-y-12">
                    <CardHeader className="flex flex-col items-center">
                        <div className="mb-1 h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <User size={24} className="text-gray-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            {t('login_to_jellyfin')}
                        </CardTitle>
                        <CardDescription>{t('enter_credentials')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onSubmitLogin}>
                            <Label htmlFor="username" className="mb-2 block font-medium">
                                {t('username')}
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder={t('username')}
                                className="mb-4 w-full"
                                defaultValue={selectedUsername}
                                autoFocus={!selectedUsername}
                            />
                            <Label htmlFor="password" className="mb-2 block font-medium">
                                {t('password')}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder={t('password')}
                                className="w-full"
                                autoFocus={!!selectedUsername}
                            />
                            {loginError && (
                                <p className="mt-4 text-sm text-destructive flex items-center gap-2">
                                    <TriangleAlert size={16} />
                                    {loginError}
                                </p>
                            )}
                            <Button className="mt-6 w-full" type="submit" disabled={loggingIn}>
                                {loggingIn ? (
                                    <>
                                        <Spinner />
                                        {t('logging_in')}
                                    </>
                                ) : (
                                    t('login')
                                )}
                            </Button>
                            <Button
                                className="mt-2 w-full"
                                variant="secondary"
                                onClick={() => setStep('quickconnect')}
                            >
                                {t('quick_connect')}
                            </Button>
                            <Button
                                variant="link"
                                className="w-full mt-2"
                                onClick={() =>
                                    hasProfiles ? setShowManual(false) : setStep('server')
                                }
                            >
                                {hasProfiles
                                    ? t('back_to_profiles', { defaultValue: 'Back' })
                                    : t('back_to_server')}
                            </Button>
                        </form>

                        <Disclaimer text={branding?.LoginDisclaimer} />
                    </CardContent>
                </Card>
            )}
            {step === 'quickconnect' && (
                <Card className="max-w-md w-full mx-auto sm:-translate-y-12">
                    <CardHeader className="flex flex-col items-center">
                        <div className="mb-1 h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <Server size={24} className="text-gray-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">{t('quick_connect')}</CardTitle>
                        <CardDescription className="text-center">
                            {t('quick_connect_description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {quickConnectInitiate.isPending && !quickConnectCode && (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Spinner />
                                <p className="mt-4 text-sm text-muted-foreground">
                                    {t('quick_connect_initiated')}
                                </p>
                            </div>
                        )}

                        {quickConnectCode && (
                            <div className="flex flex-col items-center">
                                {/* <Label className="mb-2 text-center font-medium">
                                    {t('quick_connect_code')}
                                </Label> */}
                                <div className="text-4xl sm:text-5xl font-bold tracking-widest mb-4 p-4 bg-muted rounded-lg">
                                    {quickConnectCode.slice(0, 3)} {quickConnectCode.slice(3, 6)}
                                </div>
                                <p className="text-sm text-center text-muted-foreground mb-4">
                                    {t('quick_connect_instructions')}
                                </p>

                                {isPolling && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Spinner />
                                        {t('waiting_for_approval')}
                                    </div>
                                )}

                                {loggingIn && (
                                    <div className="flex items-center gap-2 text-sm text-primary">
                                        <Spinner />
                                        {t('quick_connect_approved')}
                                    </div>
                                )}
                            </div>
                        )}

                        {quickConnectError && (
                            <p className="mt-4 text-sm text-destructive flex items-center justify-center gap-2">
                                <TriangleAlert size={16} />
                                {quickConnectError}
                            </p>
                        )}

                        <Button
                            variant="link"
                            className="w-full mt-4"
                            onClick={() => {
                                setStep('login');
                                setQuickConnectCode(null);
                                setQuickConnectSecret(undefined);
                                setQuickConnectError(null);
                                setIsPolling(false);
                                setQuickConnectApproved(false);
                                initiatingQuickConnectRef.current = false;
                            }}
                            disabled={loggingIn}
                        >
                            {t('back_to_login')}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </Page>
    );
};

export default LoginPage;
