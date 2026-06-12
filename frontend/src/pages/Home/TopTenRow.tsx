import SectionScroller from '@/components/SectionScroller';
import ScrollableSectionPoster from '@/components/ScrollableSectionPoster';
import { Skeleton } from '@/components/ui/skeleton';
import type { SectionItemsConfig } from '@/hooks/api/useConfig';
import { useRowItems } from '@/hooks/api/useRowItems';
import { useMemo } from 'react';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';

interface TopTenRowProps {
    title?: string;
    items?: SectionItemsConfig;
}

const TopTenRow = ({ title, items }: TopTenRowProps) => {
    // Cap at 10 — it's a Top 10 list
    const config = useMemo<SectionItemsConfig>(
        () => ({ ...(items || {}), limit: Math.min(items?.limit || 10, 10) }),
        [items]
    );
    const { data: topItems, isLoading } = useRowItems(config);

    const posterUrls = useMemo(() => {
        if (!topItems) return {};
        return topItems.reduce(
            (acc, item) => {
                acc[item.Id!] = getPrimaryImageUrl(item.Id!, undefined, item.ImageTags?.Primary);
                return acc;
            },
            {} as Record<string, string>
        );
    }, [topItems]);

    if (!isLoading && (!topItems || topItems.length === 0)) return null;

    return (
        <SectionScroller
            className="max-w-full"
            title={<h2 className="text-2xl font-bold">{title}</h2>}
            contentInset={true}
            items={
                topItems
                    ? topItems.map((item, index) => (
                          <div
                              key={item.Id}
                              className="flex items-end shrink-0"
                              style={{ contain: 'layout style' }}
                          >
                              <span className="top10-number text-[6rem] sm:text-[7.5rem] lg:text-[9rem]">
                                  {index + 1}
                              </span>
                              <ScrollableSectionPoster
                                  item={item}
                                  posterUrl={`${posterUrls[item.Id!]}&maxWidth=416&maxHeight=640&quality=85`}
                                  showPlayButton={true}
                                  hoverPreview={true}
                                  className="-ml-5 lg:-ml-7"
                              />
                          </div>
                      ))
                    : Array.from({ length: 5 }).map((_, index) => (
                          <div key={index} className="flex items-end shrink-0">
                              <Skeleton className="w-16 h-40 lg:w-20 lg:h-52 mr-[-1rem]" />
                              <Skeleton className="w-36 h-54 lg:w-44 lg:h-64 2xl:w-52 2xl:h-80 rounded-md" />
                          </div>
                      ))
            }
        />
    );
};

export default TopTenRow;
