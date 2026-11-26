export type TooltipPlacement = "top" | "bottom" | "right";

const gap = 8;
const gutter = 8;

interface Size {
  width: number;
  height: number;
}

/** Viewport coordinates: flip when the preferred side is full, then clamp. */
export function placeTooltip(
  anchor: Size & { top: number; left: number },
  size: Size,
  viewport: Size,
  preferred: TooltipPlacement,
): { left: number; top: number } {
  const above = anchor.top - gap - size.height;
  const below = anchor.top + anchor.height + gap;
  const fitsAbove = above >= gutter;
  const fitsBelow = below + size.height <= viewport.height - gutter;
  const beside = anchor.left + anchor.width + gap;
  const side =
    preferred === "right" && beside + size.width > viewport.width - gutter
      ? "top"
      : preferred;
  const left =
    side === "right" ? beside : anchor.left + (anchor.width - size.width) / 2;
  const top =
    side === "right"
      ? anchor.top + (anchor.height - size.height) / 2
      : side === "top"
        ? fitsAbove || !fitsBelow
          ? above
          : below
        : fitsBelow || !fitsAbove
          ? below
          : above;
  const clamp = (value: number, max: number) =>
    Math.max(gutter, Math.min(value, max - gutter));
  return {
    left: clamp(left, viewport.width - size.width),
    top: clamp(top, viewport.height - size.height),
  };
}
