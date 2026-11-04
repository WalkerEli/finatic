import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const target = resolve(process.cwd(), ".env.local");

if (existsSync(target)) {
  console.log(".env.local already exists. Not overwriting your secrets.");
  console.log("Make sure JWT_SECRET is at least 32 characters long.");
} else {
  const secret = randomBytes(48).toString("hex");

  writeFileSync(
    target,
    `JWT_SECRET=${secret}\n`,
    { mode: 0o600 }
  );

  console.log(
    "Created .env.local with a random JWT_SECRET. Keep this file private."
  );
}
