import { useEffect, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useRandomEpisode } from '@/hooks/api/useRandomEpisode';
import { useQueryClient } from '@tanstack/react-query';

interface ShuffleButtonProps {
    seriesId: string;
}

const ShuffleButton = ({ seriesId }: ShuffleButtonProps) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [triggered, setTriggered] = useState(false);

    const { data: episode, isFetching } = useRandomEpisode(
        triggered ? seriesId : undefined
    );

    useEffect(() => {
        if (triggered && !isFetching && episode) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTriggered(false);
            navigate(`/play/${episode.Id}`);
        }
    }, [triggered, isFetching, episode, navigate]);

    const handleClick = async () => {
        await queryClient.invalidateQueries({ queryKey: ['random-episode', seriesId] });
        setTriggered(true);
    };

    return (
        <Button
            variant="outline"
            className="w-fit"
            onClick={handleClick}
            disabled={isFetching}
        >
            <Shuffle className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Zufällige Folge
        </Button>
    );
};

export default ShuffleButton;
