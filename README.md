# FleurCrm — Lavanolo CRM

CRM SaaS per aziende di lavanderia industriale e servizio lavanolo.

## Stack
- Next.js + TypeScript
- PostgreSQL + Prisma
- Redis + BullMQ (worker asincrono)
- Tailwind CSS
- Playwright + Cheerio per enrichment
- API adapters per Google Places, OSM/Overpass e fonti configurabili

## Principi
- Database separato dal deploy applicativo
- Job di ricerca persistenti e server-side
- Deduplicazione e audit log
- RBAC per utenti commerciali, back office e amministratori
- Nessun dato inventato: ogni lead mantiene fonte, verifica e confidence
- GDPR/ePrivacy by design per il modulo email

## Avvio
1. Copiare `.env.example` in `.env`
2. Avviare PostgreSQL e Redis
3. `npm install`
4. `npm run db:generate`
5. `npm run db:migrate`
6. `npm run dev`

Il worker viene avviato separatamente con `npm run worker:dev`.
