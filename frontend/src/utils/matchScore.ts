import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';

/**
 * Derives a Netflix-style "% Match" score from an item's community rating.
 * Community ratings are on a 0–10 scale; we map them to a 0–100 percentage.
 * Returns null when there is no rating to base the score on.
 */
export function getMatchScore(item?: BaseItemDto | null): number | null {
    const rating = item?.CommunityRating;
    if (rating == null || rating <= 0) return null;
    return Math.min(99, Math.round(rating * 10));
}

/**
 * Whether an item counts as "new" — released or added within the last `days`.
 */
export function isNewRelease(item?: BaseItemDto | null, days = 60): boolean {
    const dateStr = item?.DateCreated || item?.PremiereDate;
    if (!dateStr) return false;
    const date = new Date(dateStr).getTime();
    if (Number.isNaN(date)) return false;
    return Date.now() - date <= days * 24 * 60 * 60 * 1000;
}
