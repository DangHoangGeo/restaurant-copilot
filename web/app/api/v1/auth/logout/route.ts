import {  NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST() {
  // Clear the auth token by setting an expired cookie
  console.log("Logging out user...");
  const cookie = serialize("auth_token", "", {
    httpOnly: true,
    secure: process.env.NEXT_PRIVATE_DEVELOPMENT !== "true",
    sameSite: "lax",
    path: "/",
    domain: process.env.NEXT_PRIVATE_DEVELOPMENT === "true" ? "localhost" : "." + process.env.NEXT_PRIVATE_PRODUCTION_URL,
    maxAge: 0, // This makes the cookie expire immediately
  });

  const response = NextResponse.json({ message: "Logged out successfully" });
  response.headers.set("Set-Cookie", cookie);
  return response;
}