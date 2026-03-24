import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "analista" | "operador";
  active: boolean;
};

const DEFAULT_USERS: Array<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password: string;
}> = [
  {
    id: "default_admin",
    email: "admin@vela.local",
    name: "Admin VELA",
    role: "admin",
    password: process.env.VELA_ADMIN_PASSWORD || "admin123",
  },
  {
    id: "default_analista",
    email: "analista@vela.local",
    name: "Analista VELA",
    role: "analista",
    password: process.env.VELA_ANALISTA_PASSWORD || "analista123",
  },
  {
    id: "default_operador",
    email: "operador@vela.local",
    name: "Operador VELA",
    role: "operador",
    password: process.env.VELA_OPERADOR_PASSWORD || "operador123",
  },
];

function defaultEmails() {
  return DEFAULT_USERS.map((item) => item.email);
}

function toAuthUser(user: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
  };
}

function authenticateFromDefaults(email: string, password: string): AuthUser | null {
  const normalized = email.trim().toLowerCase();
  const found = DEFAULT_USERS.find((user) => user.email === normalized);

  if (!found || found.password !== password) {
    return null;
  }

  return {
    id: found.id,
    email: found.email,
    name: found.name,
    role: found.role,
    active: true,
  };
}

export async function ensureDefaultUsers() {
  const total = await prisma.user.count();

  if (total > 0) {
    return;
  }

  const data: Array<{
    email: string;
    name: string;
    role: UserRole;
    passwordHash: string;
    active: boolean;
  }> = [];

  for (const user of DEFAULT_USERS) {
    data.push({
      email: user.email,
      name: user.name,
      role: user.role,
      passwordHash: await hashPassword(user.password),
      active: true,
    });
  }

  await prisma.user.createMany({ data });
}

export async function reseedDefaultUsers() {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: defaultEmails(),
      },
    },
  });

  const data: Array<{
    email: string;
    name: string;
    role: UserRole;
    passwordHash: string;
    active: boolean;
  }> = [];

  for (const user of DEFAULT_USERS) {
    data.push({
      email: user.email,
      name: user.name,
      role: user.role,
      passwordHash: await hashPassword(user.password),
      active: true,
    });
  }

  await prisma.user.createMany({ data });
}

export async function authenticateUser(email: string, password: string) {
  try {
    await ensureDefaultUsers();

    const normalized = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (!user || !user.active) {
      return null;
    }

    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
      return null;
    }

    return toAuthUser(user);
  } catch {
    return authenticateFromDefaults(email, password);
  }
}

export async function listUsers() {
  await ensureDefaultUsers();

  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createUser(input: {
  email: string;
  name: string;
  role: UserRole;
  password: string;
  active?: boolean;
}) {
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email.trim().toLowerCase(),
      name: input.name,
      role: input.role,
      passwordHash,
      active: input.active ?? true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

export async function updateUser(input: {
  id: string;
  email?: string;
  name?: string;
  role?: UserRole;
  password?: string;
  active?: boolean;
}) {
  const data: {
    email?: string;
    name?: string;
    role?: UserRole;
    passwordHash?: string;
    active?: boolean;
  } = {};

  if (input.email !== undefined) {
    data.email = input.email.trim().toLowerCase();
  }

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.role !== undefined) {
    data.role = input.role;
  }

  if (input.active !== undefined) {
    data.active = input.active;
  }

  if (input.password && input.password.length > 0) {
    data.passwordHash = await hashPassword(input.password);
  }

  const user = await prisma.user.update({
    where: { id: input.id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}
