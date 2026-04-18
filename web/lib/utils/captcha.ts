/**
 * Shared reCAPTCHA v2 server-side verification.
 * Always call this from API route handlers — never trust client-side captcha checks alone.
 */
export async function verifyRecaptchaToken(token: string): Promise<boolean> {
  const secret = process.env.NEXT_PRIVATE_CAPTCHA_SECRET;
  if (!secret) {
    console.error('NEXT_PRIVATE_CAPTCHA_SECRET is not set');
    return false;
  }

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
