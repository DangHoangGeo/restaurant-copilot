import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  const { token } = await req.json();
  const secret = process.env.NEXT_PRIVATE_CAPTCHA_SECRET!;
  const res = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}`,
  });
  const data = await res.json();
  if (!data.success) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
  return NextResponse.json({ valid: true });
}
