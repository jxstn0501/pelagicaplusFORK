import { useState, useRef, useEffect } from 'react';
import { Check, DotIcon, Fingerprint, TriangleAlert } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';

const AuthorizeQuickConnectDialog = ({
    onAuthorize,
    isLoading,
    hasSuccess,
    hasError,
}: {
    onAuthorize: (code: string) => void;
    isLoading: boolean;
    hasSuccess: boolean;
    hasError: boolean;
}) => {
    const { t } = useTranslation('sidebar');
    const [code, setCode] = useState('');
    const [open, setOpen] = useState(false);
    const authorizedCodeRef = useRef<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const successTimeoutRef = useRef<any | null>(null);
    const prevErrorRef = useRef(false);
    const prevOpenRef = useRef(false);

    useEffect(() => {
        if (prevOpenRef.current && !open) {
            queueMicrotask(() => {
                setCode('');
                authorizedCodeRef.current = null;
                prevErrorRef.current = false;
                if (successTimeoutRef.current) {
                    clearTimeout(successTimeoutRef.current);
                    successTimeoutRef.current = null;
                }
            });
        }
        prevOpenRef.current = open;
    }, [open]);

    useEffect(() => {
        if (code.length === 6 && !hasSuccess && !isLoading && authorizedCodeRef.current !== code) {
            authorizedCodeRef.current = code;
            onAuthorize(code);
        }
    }, [code, onAuthorize, hasSuccess, isLoading]);

    useEffect(() => {
        if (hasSuccess && !successTimeoutRef.current) {
            successTimeoutRef.current = setTimeout(() => {
                setOpen(false);
                successTimeoutRef.current = null;
            }, 1500);
        }
    }, [hasSuccess]);

    useEffect(() => {
        if (hasError && !prevErrorRef.current && code.length === 6) {
            queueMicrotask(() => {
                setCode('');
                authorizedCodeRef.current = null;
            });
        }
        prevErrorRef.current = hasError;
    }, [hasError, code.length]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Fingerprint className="text-muted-foreground" />
                    {t('quick_connect')}
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('authorize_quick_connect')}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground mb-4">
                    {t('enter_quick_connect_code')}
                </p>
                <div className="flex justify-center max-w-full overflow-hidden">
                    <InputOTP
                        maxLength={6}
                        onChange={setCode}
                        value={code}
                        disabled={isLoading || hasSuccess}
                    >
                        <InputOTPGroup className="gap-0 sm:gap-2 sm:*:data-[slot=input-otp-slot]:rounded-md sm:*:data-[slot=input-otp-slot]:border">
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <div
                            role="separator"
                            className="text-muted-foreground hidden sm:inline-flex"
                        >
                            <DotIcon />
                        </div>
                        <InputOTPGroup className="gap-0 sm:gap-2 sm:*:data-[slot=input-otp-slot]:rounded-md sm:*:data-[slot=input-otp-slot]:border">
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>
                {hasError && (
                    <p className="text-sm mt-4 text-destructive text-center flex items-center justify-center gap-2">
                        <TriangleAlert size={16} />
                        {t('quick_connect_authorization_failed')}
                    </p>
                )}
                {hasSuccess && (
                    <p className="text-sm mt-4 text-primary text-center flex items-center justify-center gap-2">
                        <Check size={16} />
                        {t('quick_connect_authorized')}
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AuthorizeQuickConnectDialog;
