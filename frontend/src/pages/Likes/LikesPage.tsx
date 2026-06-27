import { useNavigate } from 'react-router';
import ItemsListPage from '../Item/ItemsListPage';
import Page from '../Page';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';
import { useGenericItems } from '@/hooks/api/useGenericItems';

const LIKES_CONFIG = JSON.stringify({
    isFavorite: true,
    types: ['Movie', 'Series'],
    sortBy: ['DateCreated'],
    sortOrder: 'Descending',
    limit: 100,
});

const LikesPage = () => {
    const navigate = useNavigate();

    const mockItem = {
        Id: LIKES_CONFIG,
        Name: 'Likes',
        Type: 'Folder' as BaseItemKind,
    };

    return (
        <Page
            title="Likes"
            className="flex-1 flex flex-col pt-16"
            overlayHeader={false}
            pagePadding
        >
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-20 left-4 z-50 bg-background/50 hover:bg-background/80 backdrop-blur-md rounded-full shadow-md"
                onClick={() => navigate(-1)}
            >
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <ItemsListPage
                item={mockItem}
                useItems={useGenericItems}
                defaultSortBy="DateCreated"
                defaultSortOrder="Descending"
                itemAspectClass="aspect-[2/3]"
            />
        </Page>
    );
};

export default LikesPage;
