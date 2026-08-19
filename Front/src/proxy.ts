import { NextRequest, NextResponse } from "next/server";

const ADMIN_PATHS = ["/dashboard", "/ajustes", "/bitacora", "/clientes", "/contratos", "/notificaciones", "/plantillas", "/politicas"];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedPath = pathname === "/cambiar-password" || pathname.startsWith("/cliente/") || ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (protectedPath && !request.cookies.has("seal_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/cambiar-password", "/ajustes/:path*", "/bitacora/:path*", "/clientes/:path*", "/contratos/:path*", "/notificaciones/:path*", "/plantillas/:path*", "/politicas/:path*", "/cliente/:path*"],
};
