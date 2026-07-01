import { ensureDefaultUsers } from "../src/lib/user-service";

async function run() {
  await ensureDefaultUsers();
  console.log("Default users verified");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
