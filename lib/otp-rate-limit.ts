const SEND_COOLDOWN_MS = 60_000;
const lastSendByPhone = new Map<string, number>();

export function canSendOtp(mobileE164: string): boolean {
  const last = lastSendByPhone.get(mobileE164);
  if (!last) return true;
  return Date.now() - last >= SEND_COOLDOWN_MS;
}

export function recordOtpSend(mobileE164: string): void {
  lastSendByPhone.set(mobileE164, Date.now());
}

export function secondsUntilResend(mobileE164: string): number {
  const last = lastSendByPhone.get(mobileE164);
  if (!last) return 0;
  const remaining = SEND_COOLDOWN_MS - (Date.now() - last);
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}
