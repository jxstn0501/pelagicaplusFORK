import { useState, useEffect, useRef, type PropsWithChildren } from 'react';

interface LazyRowProps {
    placeholderHeight?: string;
}

export const LazyRow = ({
    children,
    placeholderHeight = '280px',
}: PropsWithChildren<LazyRowProps>) => {
    const [isIntersected, setIsIntersected] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Preload content 600px before entering viewport
    useEffect(() => {
        if (isIntersected) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setIsIntersected(true);
            },
            { rootMargin: '600px 0px' }
        );
        const currentRef = ref.current;
        if (currentRef) observer.observe(currentRef);
        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [isIntersected]);

    // Trigger reveal animation when row enters viewport
    useEffect(() => {
        if (isVisible) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setIsVisible(true);
            },
            { rootMargin: '80px 0px' }
        );
        const currentRef = ref.current;
        if (currentRef) observer.observe(currentRef);
        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [isVisible]);

    return (
        <div
            ref={ref}
            style={{
                minHeight: isIntersected ? 'auto' : placeholderHeight,
                contentVisibility: 'auto',
                containIntrinsicBlockSize: placeholderHeight,
            }}
            className={`transition-all duration-700 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
        >
            {isIntersected ? children : null}
        </div>
    );
};

export default LazyRow;
