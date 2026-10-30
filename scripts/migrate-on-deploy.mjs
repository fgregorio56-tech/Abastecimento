// Aplica as migrações do banco antes do build — só no deploy de PRODUÇÃO da
// Vercel. Previews e builds locais não mexem no banco.
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV === "production") {
  console.log("Deploy de produção: aplicando migrações do banco (prisma migrate deploy)...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(`VERCEL_ENV=${process.env.VERCEL_ENV ?? "local"}: migrações não aplicadas neste build.`);
}
