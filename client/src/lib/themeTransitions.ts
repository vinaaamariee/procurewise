/**
 * Temporarily disables all CSS transitions during theme switching.
 * This prevents transition jitter, layout stutter, color flashes, and sizing jumps.
 */
export function disableTransitionsTemporarily(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const css = document.createElement("style");
  css.setAttribute("type", "text/css");
  css.appendChild(
    document.createTextNode(
      `*, *::before, *::after {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);

  // Force reflow so changes take effect immediately without animation
  (() => window.getComputedStyle(document.body))();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (document.head.contains(css)) {
      document.head.removeChild(css);
    }
  };

  // Re-enable transitions after the browser has completed the theme render
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cleanup();
    });
  });

  return cleanup;
}
