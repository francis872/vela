import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function getDefaults() {
  return [
    {
      email: "admin@vela.local",
      name: "Admin VELA",
      role: "admin",
      password: process.env.VELA_ADMIN_PASSWORD || "admin123",
    },
    {
      email: "analista@vela.local",
      name: "Analista VELA",
      role: "analista",
      password: process.env.VELA_ANALISTA_PASSWORD || "analista123",
    },
    {
      email: "operador@vela.local",
      name: "Operador VELA",
      role: "operador",
      password: process.env.VELA_OPERADOR_PASSWORD || "operador123",
    },
  ];
}

async function main() {
  const shouldReset = process.argv.includes("--reset");

  if (shouldReset) {
    await prisma.user.deleteMany({
      where: { email: { in: getDefaults().map((item) => item.email) } },
    });
  }

  for (const item of getDefaults()) {
    await prisma.user.upsert({
      where: { email: item.email },
      update: {
        name: item.name,
        role: item.role,
        active: true,
      },
      create: {
        email: item.email,
        name: item.name,
        role: item.role,
        active: true,
        passwordHash: hashPassword(item.password),
      },
    });
  }

  console.log("Seed de usuarios completado.");
}

main()
  .catch((error) => {
    console.error("Error en seed de usuarios:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
