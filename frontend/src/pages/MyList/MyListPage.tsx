import { useNavigate } from 'react-router';
import ItemsListPage from '../Item/ItemsListPage';
import Page from '../Page';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';
import { useGenericItems } from '@/hooks/api/useGenericItems';
import { useTranslation } from 'react-i18next';
import ItemsRow from '../Home/ItemsRow';

const MY_LIST_CONFIG = JSON.stringify({
    isInKefinTweaksWatchlist: true,
    types: ['Movie', 'Series'],
    sortBy: ['DateCreated'],
    sortOrder: 'Descending',
    limit: 100,
});

const MyListPage = () => {
    const { t } = useTranslation('sidebar');
    const navigate = useNavigate();
    const title = t('my_list', { defaultValue: 'Meine Liste' });

    const mockItem = {
        Id: MY_LIST_CONFIG,
        Name: title,
        Type: 'Folder' as BaseItemKind,
    };

    return (
        <Page
            title={title}
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
            <div className="mb-6">
                <ItemsRow
                    title="Likes"
                    allLink="/likes"
                    contentInset={false}
                    items={{
                        isFavorite: true,
                        types: ['Movie', 'Series'],
                        sortBy: ['DateCreated'],
                        sortOrder: 'Descending',
                        limit: 20,
                    }}
                    detailFields={['ReleaseYear']}
                />
            </div>
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

export default MyListPage;
