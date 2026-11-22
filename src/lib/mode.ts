/**
 * Decides once, on load, whether to show the split layout (shop + panel) or the plain shop.
 *
 * - Deployed site (any host that is not local): split.
 * - Local host (localhost, 127.0.0.1, [::1]): plain shop, as before the panel existed.
 * - ?panel=1 forces split anywhere. ?panel=0 forces the plain shop anywhere.
 *
 * Bug flags (?bugs=...) are independent of this and work in both modes.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function decide(): boolean {
  const { hostname, search } = window.location;
  const force = new URLSearchParams(search).get("panel");
  if (force === "1") return true;
  if (force === "0") return false;
  return !LOCAL_HOSTS.has(hostname.toLowerCase());
}

/** True when the panel layout should be shown. Computed once at module load, before the first render. */
export const SPLIT_MODE: boolean = decide();
