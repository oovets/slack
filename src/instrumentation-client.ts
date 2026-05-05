/**
 * Client-side polyfills for Samsung Tizen Chromium browser compatibility.
 * Runs before React hydration - required for older Tizen TVs (Chromium < 66).
 * The polyfill no-ops when AbortController is already available.
 */
import "abortcontroller-polyfill/dist/polyfill-patch-fetch";
