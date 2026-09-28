// Watches the site files and automatically commits + pushes changes to GitHub.
// Vercel is connected to the repo, so every push redeploys the live site.
//
// Usage (from the project folder):  node tools/auto-deploy.js
// Stop with Ctrl+C.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DEBOUNCE_MS = 5000; // wait for edits to settle before deploying
const IGNORED = [/^\.git([\\/]|$)/, /node_modules/, /~$/, /\.swp$/, /\.tmp$/];

let timer = null;
let deploying = false;
let pending = false;

const git = (args) => execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8" }).trim();
const log = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

function deploy() {
  if (deploying) { pending = true; return; }
  deploying = true;
  try {
    const changes = git("status --porcelain");
    if (!changes) return;

    const files = changes.split("\n").map((l) => l.slice(3)).filter(Boolean);
    const summary = files.length <= 3 ? files.join(", ") : `${files.length} files`;

    git("add -A");
    git(`commit -q -m "Auto-deploy: update ${summary.replace(/"/g, "'")}"`);
    log(`Committed changes to ${summary}. Pushing...`);
    git("push -q origin HEAD");
    log("Pushed. Vercel will redeploy the live site in a few seconds.");
  } catch (err) {
    log(`Deploy failed: ${err.stderr || err.message}`);
  } finally {
    deploying = false;
    if (pending) { pending = false; schedule(); }
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(deploy, DEBOUNCE_MS);
}

fs.watch(ROOT, { recursive: true }, (_event, file) => {
  if (!file || IGNORED.some((re) => re.test(file))) return;
  schedule();
});

log(`Watching ${ROOT} — changes will be pushed and deployed automatically.`);
deploy(); // push anything already pending on startup
