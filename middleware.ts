import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminAuth } from "@/firebase/admin";

export const runtime = "nodejs"; // 👈 обязательная строка

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Проверяем подлинность токена
    await adminAuth.verifyIdToken(token);
    return NextResponse.next();
  } catch (error) {
    console.error("Invalid token:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/cashier/:path*",
    "/waiter/:path*",
    "/kitchen/:path*",
    "/staff/:path*",  // 👈 добавь
    "/logs/:path*",   // 👈 добавь
  ],
};

