export function clampPage(index, count) {
  return Math.max(0, Math.min(count - 1, index));
}

export function swipeDirection(dx, dy) {
  if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

export function visibleChapters(current, count, maximum = 5) {
  const length = Math.min(maximum, count);
  const start = Math.max(0, Math.min(current - Math.floor(length / 2), count - length));
  return Array.from({length}, (_, index) => start + index);
}

export function pageHint({scrollable, atEnd, hasNext, nextLabel, touch}) {
  if (scrollable && !atEnd) return 'Scroll down to explore this chapter ↓';
  if (!hasNext) return 'Your place in the story · You’ve reached the last chapter';
  return touch ? `Swipe left for ${nextLabel} ←` : `Next: ${nextLabel} · Tap Next or press →`;
}
