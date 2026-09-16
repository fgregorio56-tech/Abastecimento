import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/usuarios") && role !== "MASTER") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (
      (path.startsWith("/importar") || path.startsWith("/abastecimentos/corrigir")) &&
      role === "VIEWER"
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: [
    "/",
    "/abastecimentos/:path*",
    "/veiculos/:path*",
    "/importar/:path*",
    "/usuarios/:path*",
    "/exportar/:path*",
    "/metas/:path*",
  ],
};
