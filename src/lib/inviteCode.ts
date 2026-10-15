/**
 * Pulls the invite code out of whatever someone scanned or pasted: a full invite link
 * (https://…/join/<code>), the same link without "https://", or just the code. Anything else isn't an
 * invite. Only the code is used, so a QR code can never send you to another website.
 */
const CODE = "[A-Za-z0-9-]{16,64}";

export function parseInviteCode(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  const fromLink = new RegExp(`/join/(${CODE})(?:[/?#]|$)`).exec(value);
  if (fromLink) return fromLink[1];
  return new RegExp(`^${CODE}$`).test(value) ? value : null;
}
