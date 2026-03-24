import { NextRequest, NextResponse } from "next/server";
import {
  PROFILE_READY_COOKIE,
  SESSION_COOKIE,
  verifySession,
  UserRole,
} from "@/lib/auth";

function getAllowedRoles(pathname: string): UserRole[] {
  if (pathname.startsWith("/vela")) {
    return ["admin", "analista", "operador"];
  }

  if (pathname.startsWith("/access")) {
    return ["admin", "analista", "operador"];
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return ["admin"];
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/dashboard")) {
    return ["admin", "analista"];
  }

  if (pathname.startsWith("/velaseed") || pathname.startsWith("/api/evaluations")) {
    return ["admin", "analista", "operador"];
  }

  if (pathname.startsWith("/api/builder-lab") || pathname.startsWith("/api/coworking")) {
    return ["admin", "analista", "operador"];
  }

  return ["admin", "analista", "operador"];
}

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api/");
}

function requiresProfile(pathname: string) {
  return (
    pathname.startsWith("/access") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/velaseed") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/dashboard") ||
    pathname.startsWith("/api/evaluations") ||
    pathname.startsWith("/api/builder-lab") ||
    pathname.startsWith("/api/coworking")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const allowedRoles = getAllowedRoles(pathname);
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    if (isApiRoute(pathname)) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifySession(token);

  if (!session) {
    if (isApiRoute(pathname)) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!allowedRoles.includes(session.role)) {
    if (isApiRoute(pathname)) {
      return NextResponse.json({ error: "Sin permisos para este recurso" }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  const profileReady = request.cookies.get(PROFILE_READY_COOKIE)?.value === "true";

  if (requiresProfile(pathname) && !profileReady) {
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: "Perfil incompleto. Completa onboarding en /vela" },
        { status: 428 },
      );
    }

    return NextResponse.redirect(new URL("/vela", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/vela/:path*",
    "/access/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/velaseed/:path*",
    "/api/admin/:path*",
    "/api/dashboard/:path*",
    "/api/evaluations/:path*",
    "/api/builder-lab/:path*",
    "/api/coworking/:path*",
  ],
};
