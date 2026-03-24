## VELA Platform (MVP)

Plataforma base de VELA construida con Next.js + TypeScript + Tailwind.

Incluye tres módulos iniciales:

- `/` Inicio institucional con propuesta de valor y navegación.
- `/access` Capa de portales de acceso por módulo.
- `/access/velaseed`, `/access/dashboard`, `/access/admin` Puertas de entrada por módulo.
- `/login` Autenticación por rol (`admin`, `analista`, `operador`).
- `/signup` Registro separado de cuenta.
- `/admin/users` Gestión de usuarios (solo rol `admin`).
- `/dashboard` Dashboard institucional conectado a API con métricas reales.
- `/velaseed` Módulo de diagnóstico VELASEED con scoring backend + persistencia local de borrador.

## Configuración PostgreSQL

1. Crea tu archivo `.env` desde `.env.example`.
2. Configura `DATABASE_URL` apuntando a tu instancia PostgreSQL.
3. Configura `AUTH_SECRET` y contraseñas por rol (`VELA_ADMIN_PASSWORD`, `VELA_ANALISTA_PASSWORD`, `VELA_OPERADOR_PASSWORD`).
4. Los accesos por defecto son:

- `admin@vela.local`
- `analista@vela.local`
- `operador@vela.local`

Estas credenciales se crean automáticamente en la tabla `User` cuando no existen usuarios.

5. Ejecuta migraciones de desarrollo:
```bash
npm run db:migrate -- --name init
```

Si ya tenías una base existente sin historial de migraciones, crea una baseline sin perder datos:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0001_init/migration.sql
npx prisma migrate resolve --applied 0001_init
```

6. (Opcional) Abre Prisma Studio:

```bash
npm run db:studio
```

## Getting Started

Ejecuta el servidor de desarrollo:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Abre [http://localhost:3000](http://localhost:3000) para ver la plataforma.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run vercel-build
npm run db:generate
npm run db:push
npm run db:migrate -- --name init
npm run db:migrate:deploy
npm run db:migrate:status
npm run db:reset-dev
npm run users:seed
npm run users:seed -- --reset
```

## Deploy en Vercel

1. Conecta el repositorio en Vercel.
2. En Project Settings -> Build & Development Settings, usa como Build Command:

```bash
npm run vercel-build
```

3. Configura variables de entorno en Vercel:

- `DATABASE_URL` (PostgreSQL pública, no localhost)
- `AUTH_SECRET` (valor largo y aleatorio)
- `VELA_ADMIN_PASSWORD`
- `VELA_ANALISTA_PASSWORD`
- `VELA_OPERADOR_PASSWORD`

4. Redeploy. `vercel-build` ejecuta `prisma migrate deploy` antes de construir Next.js.

`users:seed` crea (si faltan) los usuarios por defecto. Con `--reset` recrea credenciales por defecto.

## Notas del módulo VELASEED

- Envía evaluación a `/api/evaluations` y persiste en PostgreSQL.
- Calcula IEV y probabilidades desde backend (supervivencia, expansión, formalización, riesgo).
- Clasifica automáticamente: Scale / Optimization / Sustainability Candidate.
- Guarda y restaura borrador local del formulario.
- Soporta atajo `Ctrl+S` para guardar evaluación.

## Control de acceso por rol

- `admin` y `analista`: acceso a `/dashboard` y `/api/dashboard`.
- `admin`, `analista`, `operador`: acceso a `/velaseed` y `/api/evaluations`.
- `admin`: acceso a `/admin/users` y `/api/admin/users`.
- `admin`: puede ejecutar seed manual desde `/api/admin/seed-users` o panel `/admin/users`.
- Las rutas protegidas redirigen a `/login` si no hay sesión.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
