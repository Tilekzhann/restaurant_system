// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // Защищаем админские и рабочие роуты просто по наличию токена
  const protectedPaths = [
    "/admin",
    "/cashier",
    "/waiter",
    "/kitchen",
  ];
  const needsAuth = protectedPaths.some(p => pathname === p || pathname.startsWith(`${p}/`));

  if (needsAuth && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // ВАЖНО: матчим и корень (/admin), и подроуты
  matcher: [
    "/admin",
    "/admin/:path*",
    "/cashier/:path*",
    "/waiter/:path*",
    "/kitchen/:path*",
  ],
};
