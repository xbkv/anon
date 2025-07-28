import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const guestCookie = req.cookies.get("guest");

  if (req.nextUrl.pathname === "/" && guestCookie?.value === "true") {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"], // `/`のみ適用
};
