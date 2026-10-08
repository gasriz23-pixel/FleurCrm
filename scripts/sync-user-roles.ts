import { PrismaClient, UserRole } from "@prisma/client";

const db = new PrismaClient();

async function syncRole(emailVar: string, role: UserRole) {
  const email = process.env[emailVar]?.trim().toLowerCase();
  if (!email) return;
  const result = await db.user.updateMany({ where: { email }, data: { role } });
  if (result.count === 0) {
    console.log(`Utente non trovato: ${email}. Eseguire il bootstrap con la password iniziale.`);
  }
}

async function main() {
  await syncRole("GASPARE_EMAIL", UserRole.ADMIN);
  await syncRole("GABRIELE_EMAIL", UserRole.ADMIN);
  await syncRole("DESIREE_EMAIL", UserRole.BACKOFFICE);
}

main().finally(() => db.$disconnect());
