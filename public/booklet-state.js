export function clampPage(index, count) {
  return Math.max(0, Math.min(count - 1, index));
}

export function swipeDirection(dx, dy) {
  if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}
