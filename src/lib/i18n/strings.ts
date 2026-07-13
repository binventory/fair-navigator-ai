/**
 * Central UI strings catalog.
 *
 * All user-facing strings for the visitor PWA (and, over time, the whole app)
 * live here. Ship English now; add a `de` catalog and a locale switch later
 * without touching any component.
 *
 * Never hardcode a user-facing string in a component. Always import from `t`.
 */

export const t = {
  brand: {
    name: "ExpoAI",
  },
  common: {
    back: "Back",
    loading: "Loading…",
    error: "Something went wrong.",
    notFound: "Not found",
    home: "Home",
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    search: "Search",
    clear: "Clear",
    optional: "Optional",
  },
  visitor: {
    fair: {
      dates: "Dates",
      location: "Location",
      about: "About",
      exhibitors: "Exhibitors",
      floorPlan: "Floor plan",
      schedule: "Schedule",
      notPublished: "This fair is not published.",
      notPublishedDetail:
        "The link may be wrong or the organiser has taken it offline.",
    },
    exhibitors: {
      title: "Exhibitors",
      subtitle: "Browse companies exhibiting at this fair.",
      searchPlaceholder: "Search by company, booth or category",
      empty: "No exhibitors match your search.",
      emptyAll: "No exhibitors have been listed yet.",
      booth: "Booth",
      category: "Category",
      website: "Website",
      viewDetails: "View details",
      backToList: "Back to exhibitors",
      showingPage: "Showing page",
    },
    map: {
      title: "Floor plan",
      subtitle: "Tap a highlighted booth to see the exhibitor.",
      none: "No floor plan is available for this fair yet.",
      hotspotHint: "Tap a booth",
    },
    schedule: {
      title: "Schedule",
      subtitle: "Sessions and events at this fair.",
      empty: "No schedule items have been posted yet.",
      allDay: "All day",
    },
  },
  privacy: {
    // Confirmation to the visitor: the public site writes nothing to their device
    // beyond what is strictly required to render the page. No TTDSG §25 consent
    // needed for the visitor pages as long as this stays true.
    essentialOnly:
      "This page stores no cookies and no data on your device.",
  },
  auth: {
    forgotPassword: "Forgot password?",
    resetTitle: "Reset your password",
    resetDescription: "Enter your account email and we'll send a reset link.",
    resetEmailLabel: "Email",
    sendResetLink: "Send reset link",
    sending: "Sending…",
    resetGenericConfirmation:
      "If an account exists for that email, we've sent a reset link. Check your inbox.",
    backToSignIn: "Back to sign in",
    newPasswordTitle: "Choose a new password",
    newPasswordDescription: "Set a new password to finish signing in.",
    newPasswordLabel: "New password",
    confirmPasswordLabel: "Confirm password",
    updatePassword: "Update password",
    updating: "Updating…",
    passwordsDoNotMatch: "Passwords do not match.",
    passwordTooShort: "Password must be at least 8 characters.",
    resetLinkInvalid:
      "This reset link is invalid or has expired. Request a new one below.",
    passwordUpdated: "Password updated. Redirecting…",
    requestNewLink: "Request a new link",
  },
} as const;

export type Strings = typeof t;

