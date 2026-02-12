// ============================================================================
// Resend Email Client
// ============================================================================

import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResendClient(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error(
        "RESEND_API_KEY environment variable is not set. Add it to .env.local"
      );
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
