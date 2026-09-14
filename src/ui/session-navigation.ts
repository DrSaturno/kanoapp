/** Full navigation discards cached tenant data at authentication boundaries. */
export function resetSessionNavigation(destination: '/' | '/login') {
  window.location.assign(destination);
}
