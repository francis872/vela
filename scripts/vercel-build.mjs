import { execSync } from "node:child_process";

function run(command, options = {}) {
  execSync(command, { stdio: "inherit", ...options });
}

try {
  // Recover once if a previous failed migration left the database locked.
  run("npx prisma migrate resolve --rolled-back 0001_init --schema prisma/schema.prisma");
} catch {
  // If there is no failed migration to resolve, continue with normal deploy.
}

run("npx prisma migrate deploy --schema prisma/schema.prisma");
run("npx next build");