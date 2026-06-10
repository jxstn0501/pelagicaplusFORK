import { useState, useEffect, useRef, type PropsWithChildren } from 'react';

interface LazyRowProps {
    placeholderHeight?: string;
}

export const LazyRow = ({ children, placeholderHeight = '280px' }: PropsWithChildren<LazyRowProps>) => {
    const [isIntersected, setIsIntersected] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isIntersected) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersected(true);
                }
            },
            {
                rootMargin: '600px 0px',
            }
        );

        const currentRef = ref.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, [isIntersected]);

    return (
        <div
            ref={ref}
            style={{
                minHeight: isIntersected ? 'auto' : placeholderHeight,
                // Skip rendering and painting for off-screen rows entirely
                contentVisibility: 'auto',
                containIntrinsicBlockSize: placeholderHeight,
            }}
        >
            {isIntersected ? children : null}
        </div>
    );
};

export default LazyRow;
