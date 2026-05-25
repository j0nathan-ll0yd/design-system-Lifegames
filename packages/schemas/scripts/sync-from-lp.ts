import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, "..");
const VENDORED_DIR = join(PACKAGE_ROOT, "vendored");

const HOME = process.env.HOME;
if (!HOME) {
  console.error("ERROR: HOME environment variable is not set");
  process.exit(1);
}

const LP_PATH = resolve(HOME, "Repositories", "mantle-LifegamesPortal");
const LP_SCHEMAS_DIR = join(LP_PATH, "schemas");

// Check LP path exists — soft warning in CI/non-dev environments where LP is not checked out.
// When LP is absent, vendored/ is the source of truth and we skip the sync step entirely.
if (!existsSync(LP_PATH)) {
  console.warn(`WARNING: LP path does not exist: ${LP_PATH}`);
  console.warn("Skipping sync — vendored/ retains its current contents.");
  console.warn("To sync from LP, clone mantle-LifegamesPortal at ~/Repositories/mantle-LifegamesPortal");
  process.exit(0);
}

if (!existsSync(LP_SCHEMAS_DIR)) {
  console.warn(`WARNING: LP schemas directory does not exist: ${LP_SCHEMAS_DIR}`);
  console.warn("Skipping sync — vendored/ retains its current contents.");
  process.exit(0);
}

// Check for uncommitted LP schema changes (warn only, do not fail)
try {
  const dirty = execSync(`git -C "${LP_PATH}" status --porcelain schemas/`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
  if (dirty) {
    console.warn("WARNING: LP has uncommitted changes in schemas/:");
    console.warn(dirty);
    console.warn("Vendored copies may not match LP HEAD.");
  }
} catch {
  // LP may not be a git repo or git may not be available — skip
}

// Resolve LP git SHA
let lpGitSha: string | undefined;
try {
  lpGitSha = execSync(`git -C "${LP_PATH}" rev-parse HEAD`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
} catch {
  // Not a git repo or other error — omit from manifest
}

// Ensure vendored dir exists
mkdirSync(VENDORED_DIR, { recursive: true });

// Find all *.schema.json files in LP schemas dir
const schemaFiles = readdirSync(LP_SCHEMAS_DIR)
  .filter((f) => f.endsWith(".schema.json"))
  .map((f) => join(LP_SCHEMAS_DIR, f));

if (schemaFiles.length === 0) {
  console.error(`ERROR: No *.schema.json files found in ${LP_SCHEMAS_DIR}`);
  process.exit(1);
}

const syncedFiles: string[] = [];

for (const srcPath of schemaFiles) {
  const filename = basename(srcPath);
  const destPath = join(VENDORED_DIR, filename);

  // Validate parseable JSON
  const raw = readFileSync(srcPath, "utf8");
  try {
    JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`ERROR: ${filename} is not valid JSON: ${message}`);
    process.exit(1);
  }

  copyFileSync(srcPath, destPath);
  syncedFiles.push(filename);
  console.log(`  synced: ${filename}`);
}

// Write manifest
const manifest = {
  syncedAt: new Date().toISOString(),
  lpPath: LP_PATH,
  files: syncedFiles.sort(),
  ...(lpGitSha ? { lpGitSha } : {}),
};

writeFileSync(
  join(VENDORED_DIR, ".lp-sync-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8",
);

console.log(`\nSync complete: ${syncedFiles.length} schema(s) copied to vendored/`);
if (lpGitSha) {
  console.log(`LP git SHA: ${lpGitSha}`);
}
