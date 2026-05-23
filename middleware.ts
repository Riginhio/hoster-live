import { NextResponse, type NextRequest } from "next/server";
import { authCookieName, parseAuthCookieValue } from "@/lib/auth/sessionCookie";

const managerOnlyRoutes = [
  "/gerente/nueva-jugada",
  "/gerente/reportes",
  "/gerente/promociones",
  "/gerente/usuarios",
];

const playAllowedRoutes = ["/gerente", "/gerente/jugada-activa", "/gerente/tablas"];

function getAuthFromRequest(request: NextRequest) {
  const cookie = request.cookies.get(authCookieName)?.value ?? null;
  return parseAuthCookieValue(cookie);
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const authUser = getAuthFromRequest(request);

  if (pathname === "/") {
    if (!authUser) {
      return NextResponse.next();
    }

    if (authUser.role === "master") {
      return redirectTo(request, "/master/dashboard");
    }

    if (authUser.role === "gerente") {
      return redirectTo(request, "/gerente");
    }

    return redirectTo(request, `/tv/${authUser.restaurantId ?? "rancho-viejo"}`);
  }

  if (pathname.startsWith("/master")) {
    if (!authUser) {
      return redirectTo(request, "/login");
    }

    if (authUser.role !== "master") {
      return redirectTo(request, authUser.role === "gerente" ? "/gerente" : "/login");
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/gerente")) {
    if (!authUser) {
      return redirectTo(request, "/login");
    }

    if (authUser.role !== "gerente") {
      return redirectTo(request, authUser.role === "master" ? "/master/dashboard" : "/login");
    }

    if (authUser.venueRole === "play" && !playAllowedRoutes.includes(pathname)) {
      return redirectTo(request, "/gerente");
    }

    if (authUser.venueRole === "manager" && pathname === "/gerente/jugada-especial") {
      return redirectTo(request, "/gerente/nueva-jugada");
    }

    if (authUser.venueRole === "play" && managerOnlyRoutes.includes(pathname)) {
      return redirectTo(request, "/gerente");
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/tv")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/master/:path*", "/gerente/:path*", "/tv/:path*"],
};
