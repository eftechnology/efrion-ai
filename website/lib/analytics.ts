/* eslint-disable @typescript-eslint/no-explicit-any */

// Extend window with GA4 + Umami globals
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    umami?: { track: (event: string, data?: Record<string, any>) => void };
  }
}

type EventParams = Record<string, string | number | boolean>;

/**
 * Send an event to both GA4 and Umami simultaneously.
 * Safe to call server-side — checks for window before accessing globals.
 */
export function track(event: string, params?: EventParams) {
  if (typeof window === 'undefined') return;

  // GA4
  if (typeof window.gtag === 'function') {
    window.gtag('event', event, params ?? {});
  }

  // Umami
  if (window.umami?.track) {
    window.umami.track(event, params);
  }
}

// ── Named events ──────────────────────────────────────────────────────────────

export const analytics = {
  // CTAs
  clickRequestAccess: (source: string) =>
    track('request_access_click', { source }),

  clickDownloadExtension: (source: string) =>
    track('extension_download', { source }),

  clickGitHub: (source: string) =>
    track('github_click', { source }),

  clickContactEmail: () =>
    track('contact_email_click'),

  // Request access form
  formSubmit: () =>
    track('request_access_submit'),

  formSuccess: (erpSystem: string) =>
    track('request_access_success', { erp_system: erpSystem }),

  formError: (reason: string) =>
    track('request_access_error', { reason }),

  // Navigation
  navClick: (label: string) =>
    track('nav_click', { label }),
};
