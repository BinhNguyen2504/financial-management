// Safari's default mousedown can blur a button before its click. Keep focus on
// the activated control so dialog restoration and menu clicks work consistently.
export function focusPointerControl(event: {
  target: EventTarget | null;
  button: number;
  preventDefault(): void;
}) {
  if (event.button !== 0 || !(event.target instanceof Element)) return;
  const control = event.target.closest<HTMLElement>("button, a[href], summary");
  if (!control) return;
  event.preventDefault();
  control.focus({ preventScroll: true });
}
