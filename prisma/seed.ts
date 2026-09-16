import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.MASTER_EMAIL ?? "fgregorio56@gmail.com";
  const password = process.env.MASTER_PASSWORD ?? "Abastecimento@2026";
  const name = process.env.MASTER_NAME ?? "Administrador";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Usuário mestre já existe: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: "MASTER" },
  });

  console.log("Usuário mestre criado com sucesso:");
  console.log(`  e-mail: ${email}`);
  console.log(`  senha:  ${password}`);
  console.log("Troque a senha assim que possível em Usuários > Perfil.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
