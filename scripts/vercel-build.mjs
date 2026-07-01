import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

try {
  run("npx prisma migrate resolve --rolled-back 0001_init --schema prisma/schema.prisma");
} catch {
  // No failed migration to recover.
}

run("npx prisma migrate deploy --schema prisma/schema.prisma");
run("npx next build");
