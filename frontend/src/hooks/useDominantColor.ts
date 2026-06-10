import { useEffect, useState } from 'react';

function extractDominantColor(src: string): Promise<string | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                // Sample a small area — bottom-left corner has most color info
                canvas.width = 40;
                canvas.height = 40;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);
                ctx.drawImage(img, 0, img.height * 0.3, img.width * 0.5, img.height * 0.7, 0, 0, 40, 40);
                const data = ctx.getImageData(0, 0, 40, 40).data;

                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 16) {
                    // Skip near-black and near-white pixels
                    const pr = data[i], pg = data[i + 1], pb = data[i + 2];
                    const brightness = (pr + pg + pb) / 3;
                    if (brightness > 20 && brightness < 230) {
                        r += pr; g += pg; b += pb; count++;
                    }
                }
                if (count === 0) return resolve(null);
                resolve(`${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)}`);
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

export function useDominantColor(src: string | undefined) {
    const [color, setColor] = useState<string | null>(null);

    useEffect(() => {
        if (!src) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setColor(null);
        extractDominantColor(src).then(setColor);
    }, [src]);

    return color;
}
