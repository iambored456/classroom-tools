const FALLBACK_OUTER_PADDING = 2;
const FALLBACK_INNER_INSET = 3;
const FALLBACK_BAR_GAP = 10;
const FALLBACK_CORNER_RADIUS = 15;

type FillLayoutBar = {
    x: number;
    yTop: number;
    width: number;
    height: number;
    yBottom: number;
    cornerRadius: number;
};

type FillLayout = {
    width: number;
    height: number;
    bars: FillLayoutBar[];
};

function parsePixels(value: string | number | null | undefined, fallback = 0) {
    const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBar(bar: Partial<FillLayoutBar> | null | undefined, fallbackRadius = FALLBACK_CORNER_RADIUS): FillLayoutBar {
    const x = Math.max(0, Number(bar?.x) || 0);
    const yTop = Math.max(0, Number(bar?.yTop) || 0);
    const width = Math.max(1, Number(bar?.width) || 0);
    const height = Math.max(1, Number(bar?.height) || 0);
    const desiredRadius = Number.isFinite(bar?.cornerRadius) ? bar.cornerRadius : fallbackRadius;
    const cornerRadius = Math.max(0, Math.min(desiredRadius, width / 2, height / 2));

    return {
        x,
        yTop,
        width,
        height,
        yBottom: yTop + height,
        cornerRadius
    };
}

export function createFallbackFillLayout(width: number, height: number, barCount: number): FillLayout {
    const safeWidth = Math.max(1, Math.round(Number(width) || 0));
    const safeHeight = Math.max(1, Math.round(Number(height) || 0));
    const safeBarCount = Math.max(1, Math.floor(Number(barCount) || 1));
    const contentWidth = Math.max(20, safeWidth - (FALLBACK_OUTER_PADDING * 2));
    const slotWidth = Math.max(8, (contentWidth - (FALLBACK_BAR_GAP * (safeBarCount - 1))) / safeBarCount);
    const yTop = FALLBACK_OUTER_PADDING + FALLBACK_INNER_INSET;
    const heightInner = Math.max(8, safeHeight - (FALLBACK_OUTER_PADDING * 2) - (FALLBACK_INNER_INSET * 2));

    const bars = Array.from({ length: safeBarCount }, (_, index) => normalizeBar({
        x: FALLBACK_OUTER_PADDING + (index * (slotWidth + FALLBACK_BAR_GAP)) + FALLBACK_INNER_INSET,
        yTop,
        width: Math.max(4, slotWidth - (FALLBACK_INNER_INSET * 2)),
        height: heightInner,
        cornerRadius: FALLBACK_CORNER_RADIUS
    }));

    return {
        width: safeWidth,
        height: safeHeight,
        bars
    };
}

export function measureFillLayout(
    containerElement: HTMLElement | null | undefined,
    segmentElements: ArrayLike<Element> | Iterable<Element> | null | undefined,
    barCount: number
): FillLayout {
    const fallback = createFallbackFillLayout(
        containerElement?.clientWidth || 0,
        containerElement?.clientHeight || 0,
        barCount
    );

    if (!containerElement) {
        return fallback;
    }

    const containerRect = containerElement.getBoundingClientRect();
    const segments = Array.from(segmentElements || []);
    if (containerRect.width <= 0 || containerRect.height <= 0 || segments.length === 0) {
        return fallback;
    }

    const measuredBars = segments.map((segmentElement, index) => {
        if (!segmentElement) {
            return fallback.bars[index];
        }

        const segmentRect = segmentElement.getBoundingClientRect();
        if (segmentRect.width <= 0 || segmentRect.height <= 0) {
            return fallback.bars[index];
        }

        const styles = window.getComputedStyle(segmentElement);
        const borderLeft = parsePixels(styles.borderLeftWidth);
        const borderRight = parsePixels(styles.borderRightWidth);
        const borderTop = parsePixels(styles.borderTopWidth);
        const borderBottom = parsePixels(styles.borderBottomWidth);
        const outerRadius = parsePixels(styles.borderTopLeftRadius, FALLBACK_CORNER_RADIUS);
        const borderInset = Math.max(borderLeft, borderRight, borderTop, borderBottom);

        return normalizeBar({
            x: (segmentRect.left - containerRect.left) + borderLeft,
            yTop: (segmentRect.top - containerRect.top) + borderTop,
            width: Math.max(1, segmentRect.width - borderLeft - borderRight),
            height: Math.max(1, segmentRect.height - borderTop - borderBottom),
            cornerRadius: Math.max(0, outerRadius - borderInset)
        }, outerRadius);
    });

    if (measuredBars.length === 0) {
        return fallback;
    }

    return {
        width: Math.max(1, Math.round(containerRect.width)),
        height: Math.max(1, Math.round(containerRect.height)),
        bars: measuredBars
    };
}
