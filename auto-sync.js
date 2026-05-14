const chokidar = require("chokidar");
const { execSync } = require("child_process");
const path = require("path");

const REPO_DIR = __dirname;
let debounceTimer = null;
let pendingChanges = false;

function git(cmd) {
  try {
    return execSync(cmd, { cwd: REPO_DIR, encoding: "utf8" }).trim();
  } catch (e) {
    return null;
  }
}

function sync() {
  const status = git("git status --porcelain");
  if (!status) {
    console.log("[auto-sync] 无变更，跳过");
    return;
  }

  git("git add -A");
  const ts = new Date().toLocaleString("zh-CN");
  const commitMsg = `自动同步 - ${ts}`;
  git(`git commit -m "${commitMsg}"`);
  const pushResult = git("git push");
  if (pushResult !== null) {
    console.log(`[auto-sync] ✓ 已提交并推送 - ${ts}`);
  } else {
    console.log(`[auto-sync] ✗ 推送失败，请检查网络`);
  }
}

function onchange(filePath) {
  const relative = path.relative(REPO_DIR, filePath);
  console.log(`[auto-sync] 检测到变更: ${relative}`);
  pendingChanges = true;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(sync, 5000);
}

const watcher = chokidar.watch(".", {
  cwd: REPO_DIR,
  ignored: /(\.git|node_modules|auto-sync\.js|\.gitignore)/,
  ignoreInitial: true,
  persistent: true,
});

watcher
  .on("add", onchange)
  .on("change", onchange)
  .on("unlink", onchange);

console.log("[auto-sync] 正在监听文件变更... (停止按 Ctrl+C)");
