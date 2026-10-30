import { withAuth } from "next-auth/middleware";

// Só exige login. O que cada usuário pode ver é decidido em cada página
// (lib/session.ts → requireModule), lendo as permissões atuais no banco.
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/",
    "/abastecimentos/:path*",
    "/veiculos/:path*",
    "/importar/:path*",
    "/usuarios/:path*",
    "/exportar/:path*",
    "/metas/:path*",
    "/pendencias/:path*",
    "/ticket-log/:path*",
    "/rotinas/:path*",
    "/sem-acesso",
  ],
};
