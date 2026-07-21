import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("altis2024", 12);

  await prisma.user.upsert({
    where: { email: "admin@altis.com" },
    update: { password: hash },
    create: {
      name: "Administrador",
      email: "admin@altis.com",
      password: hash,
      roles: ["ADMIN"],
      commissionRate: 0,
    },
  });

  console.log("✓ Usuário admin criado: admin@altis.com / altis2024");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
