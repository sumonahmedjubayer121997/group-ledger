/** Turns Firebase auth errors into short, human messages. Returns null when there is nothing to show. */
export function friendlyAuthError(error: unknown): string | null {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don't match. Try again, or reset your password.";
    case "auth/email-already-in-use":
      return "There's already an account with this email. Sign in instead.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/weak-password":
      return "Choose a stronger password.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again, or reset your password.";
    case "auth/network-request-failed":
      return "You seem to be offline. Check your connection and try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow pop-ups for this site and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    default:
      return "Something went wrong. Please try again.";
  }
}
