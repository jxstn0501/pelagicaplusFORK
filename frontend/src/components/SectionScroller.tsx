import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from './ui/button';

interface SectionScrollerProps {
    title?: React.ReactNode;
    items: React.ReactNode[];
    icon?: React.ReactNode;
    className?: string;
    additionalButtons?: React.ReactNode;
    contentInset?: boolean;
}

export default function SectionScroller({
    title,
    items,
    className,
    additionalButtons,
    contentInset = false,
}: SectionScrollerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = useCallback(() => {
        // Throttle with rAF — only one check per frame no matter how fast scroll fires
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const el = scrollRef.current;
            if (!el) return;
            const left = el.scrollLeft > 0;
            const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
            setCanScrollLeft((prev) => (prev === left ? prev : left));
            setCanScrollRight((prev) => (prev === right ? prev : right));
        });
    }, []);

    const scroll = (offset: number) => {
        scrollRef.current?.scrollBy({ left: offset, behavior: 'smooth' });
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        checkScroll();

        el.addEventListener('scroll', checkScroll, { passive: true });
        window.addEventListener('resize', checkScroll, { passive: true });

        return () => {
            el.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [checkScroll, items.length]);

    return (
        <div className={className}>
            <div
                className={
                    'flex items-center justify-between mb-3' +
                    (contentInset ? ` px-4 sm:px-12` : '')
                }
            >
                {title ? title : <div />}

                <div className="flex gap-2">
                    <Button
                        onClick={() => scroll(-300)}
                        disabled={!canScrollLeft}
                        size={'icon'}
                        variant={'outline'}
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        onClick={() => scroll(300)}
                        disabled={!canScrollRight}
                        size={'icon'}
                        variant={'outline'}
                    >
                        <ChevronRight />
                    </Button>
                    {additionalButtons}
                </div>
            </div>

            <div
                ref={scrollRef}
                className={
                    'flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide custom-scrollbar' +
                    (contentInset ? ` pl-4 sm:pl-12` : '')
                }
            >
                {items}
            </div>
        </div>
    );
}
