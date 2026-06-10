import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserRating } from '@/hooks/api/useUserRating';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface UserRatingButtonProps {
    itemId: string | null | undefined;
}

const UserRatingButton = ({ itemId }: UserRatingButtonProps) => {
    const { t } = useTranslation('item');
    const { likes, setRating, isLoading } = useUserRating(itemId);

    const handleThumbsUp = () => {
        setRating(likes === true ? null : true);
    };

    const handleThumbsDown = () => {
        setRating(likes === false ? null : false);
    };

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="outline"
                size="icon"
                onClick={handleThumbsUp}
                disabled={isLoading}
                title={t('rate_like', { defaultValue: 'Like' })}
                className="hover:scale-105 active:scale-95 transition-transform duration-200 ease-out"
            >
                <ThumbsUp
                    className={cn(
                        'transition-colors duration-200 w-4 h-4',
                        likes === true
                            ? 'animate-pop-in text-green-500 fill-green-500'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                />
            </Button>
            <Button
                variant="outline"
                size="icon"
                onClick={handleThumbsDown}
                disabled={isLoading}
                title={t('rate_dislike', { defaultValue: 'Dislike' })}
                className="hover:scale-105 active:scale-95 transition-transform duration-200 ease-out"
            >
                <ThumbsDown
                    className={cn(
                        'transition-colors duration-200 w-4 h-4',
                        likes === false
                            ? 'animate-pop-in text-red-500 fill-red-500'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                />
            </Button>
        </div>
    );
};

export default UserRatingButton;
