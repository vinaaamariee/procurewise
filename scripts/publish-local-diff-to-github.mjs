import { execFileSync } from "node:child_process";
import fs from "node:fs";

const repo = "vinaaamariee/procurewise";
const api = (path, args = [], options = {}) => execFileSync("gh", ["api", path, ...args], { encoding: "utf8", ...options }).replace(/\x1b\[[0-9;]*m/g, "");
const base = api("repos/" + repo + "/git/ref/heads/main", ["--jq", ".object.sha"]).trim();
const baseTree = api("repos/" + repo + "/commits/" + base, ["--jq", ".commit.tree.sha"]).trim();
const remoteTree = JSON.parse(api("repos/" + repo + "/git/trees/" + baseTree + "?recursive=1"));
const remote = new Map((remoteTree.tree ?? []).filter((item) => item.type === "blob").map((item) => [item.path, item.sha]));
const localFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
const local = new Map(localFiles.map((file) => [file, execFileSync("git", ["hash-object", file], { encoding: "utf8" }).trim()]));
const changed = localFiles.filter((file) => local.get(file) !== remote.get(file));
const deleted = [...remote.keys()].filter((file) => !local.has(file));
if (!changed.length && !deleted.length) throw new Error("No local files differ from GitHub main.");

const entries = [];
for (const file of changed) {
  const content = fs.readFileSync(file).toString("base64");
  const blob = JSON.parse(api("repos/" + repo + "/git/blobs", ["--method", "POST", "--input", "-"], { input: JSON.stringify({ encoding: "base64", content }) }));
  entries.push({ path: file, mode: "100644", type: "blob", sha: blob.sha });
}
for (const file of deleted) entries.push({ path: file, mode: "100644", type: "blob", sha: null });
const tree = JSON.parse(api("repos/" + repo + "/git/trees", ["--method", "POST", "--input", "-"], { input: JSON.stringify({ base_tree: baseTree, tree: entries }) }));
const commit = JSON.parse(api("repos/" + repo + "/git/commits", ["--method", "POST", "--input", "-"], { input: JSON.stringify({ message: "Add authentication UX, README deployment guidance, and explicit ProcureWise schema binding", tree: tree.sha, parents: [base] }) }));
api("repos/" + repo + "/git/refs/heads/main", ["--method", "PATCH", "-f", "sha=" + commit.sha, "-F", "force=false"], { stdio: "inherit" });
console.log(JSON.stringify({ base, changed, deleted, commit: commit.sha }, null, 2));
