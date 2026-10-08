import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../lib/auth";

const db = new PrismaClient();

const accounts = [
  ["GASPARE_EMAIL", "GASPARE_PASSWORD", UserRole.ADMIN],
  ["GABRIELE_EMAIL", "GABRIELE_PASSWORD", UserRole.ADMIN],
  ["DESIREE_EMAIL", "DESIREE_PASSWORD", UserRole.BACKOFFICE],
] as const;

async function main() {
  for (const [emailVar, passwordVar, role] of accounts) {
    const email = process.env[emailVar]?.trim().toLowerCase();
    const password = process.env[passwordVar];
    if (!email) throw new Error(`Variabile ${emailVar} mancante`);
    if (!password || password.length < 12) {
      throw new Error(`Variabile ${passwordVar} mancante o password troppo corta (minimo 12 caratteri)`);
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      await db.user.update({
        where: { id: existing.id },
        data: { role, passwordHash: hashPassword(password) },
      });
      console.log(`Aggiornato: ${email}`);
      continue;
    }

    await db.user.create({
      data: {
        name: role === UserRole.ADMIN ? email.split("@")[0] : email.split("@")[0],
        email,
        role,
        passwordHash: hashPassword(password),
      },
    });
    console.log(`Creato: ${email}`);
  }
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
