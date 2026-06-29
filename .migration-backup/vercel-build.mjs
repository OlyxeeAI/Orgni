import { cp, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, "public");

const landing = path.join(root, "artifacts/orgni/dist/public");
const app = path.join(root, "artifacts/orgni-app/dist/public");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await cp(landing, out, { recursive: true });
await cp(app, path.join(out, "app"), { recursive: true });

console.log("Assembled Vercel output:");
console.log(`  ${landing} -> public/`);
console.log(`  ${app} -> public/app/`);
