import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { SessionRole } from "@/lib/auth";

type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  role: SessionRole;
  active?: boolean;
  status?: "pending_verification" | "active" | "suspended" | "locked" | "disabled";
};

type UpdateUserInput = {
  id: string;
  email?: string;
  name?: string;
  role?: SessionRole;
  password?: string;
  active?: boolean;
};

const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 } as const;

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64, SCRYPT_OPTIONS).toString("hex");
  return `scrypt:${salt}:${digest}`;
}

function verifyPassword(password: string, stored: string) {
  try {
    // Current format: scrypt:<salt>:<hash>
    if (stored.startsWith("scrypt:")) {
      const [, salt, hash] = stored.split(":");
      const digest = scryptSync(password, salt, 64, SCRYPT_OPTIONS);
      return timingSafeEqual(Buffer.from(hash, "hex"), digest);
    }

    // Legacy format: <salt>:<sha256>
    if (stored.includes(":")) {
      const [salt, hash] = stored.split(":");
      const digest = createHash("sha256").update(`${salt}:${password}`).digest("hex");
      return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(digest, "hex"));
    }

    // Legacy plaintext (early development only)
    return stored === password;
  } catch {
    return false;
  }
}

function cleanUser<T extends { passwordHash?: string }>(user: T) {
  const safe = { ...user } as T;
  delete safe.passwordHash;
  return safe;
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return users.map((item) => cleanUser(item));
}

export async function createUser(input: CreateUserInput) {
  const created = await prisma.user.create({
    data: {
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
      role: input.role,
      passwordHash: hashPassword(input.password),
      active: input.active ?? true,
      status: input.status ?? "active",
    },
  });

  return cleanUser(created);
}

export async function updateUser(input: UpdateUserInput) {
  const updated = await prisma.user.update({
    where: { id: input.id },
    data: {
      email: input.email?.toLowerCase().trim(),
      name: input.name?.trim(),
      role: input.role,
      active: input.active,
      passwordHash: input.password ? hashPassword(input.password) : undefined,
    },
  });

  return cleanUser(updated);
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !user.active) {
    return null;
  }

  // Suspended, locked or disabled accounts cannot authenticate.
  if (user.status === "suspended" || user.status === "locked" || user.status === "disabled") {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return cleanUser(user);
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
}

export async function setUserPassword(userId: string, password: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashPassword(password),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  });
}

function seedPassword(envVar: string, devFallback: string): string | null {
  // In production there is NO default password: it must come from the environment.
  return process.env[envVar] ?? (process.env.NODE_ENV === "production" ? null : devFallback);
}

type DefaultUser = {
  email: string;
  name: string;
  role: SessionRole;
  password: string | null;
};

const defaultUsers: DefaultUser[] = [
  {
    email: "admin@vela.local",
    name: "Admin VELA",
    role: "admin",
    password: seedPassword("VELA_ADMIN_PASSWORD", "admin123"),
  },
  {
    email: "analista@vela.local",
    name: "Analista VELA",
    role: "analista",
    password: seedPassword("VELA_ANALISTA_PASSWORD", "analista123"),
  },
  {
    email: "operador@vela.local",
    name: "Operador VELA",
    role: "operador",
    password: seedPassword("VELA_OPERADOR_PASSWORD", "operador123"),
  },
];

const seedableUsers = defaultUsers.filter(
  (user): user is DefaultUser & { password: string } => Boolean(user.password),
);

export async function ensureDefaultUsers() {
  for (const user of seedableUsers) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });

    if (!existing) {
      await createUser(user);
    }
  }
}

export async function reseedDefaultUsers() {
  for (const user of seedableUsers) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });

    if (!existing) {
      await createUser(user);
      continue;
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: user.name,
        role: user.role,
        active: true,
        passwordHash: hashPassword(user.password),
      },
    });
  }
}