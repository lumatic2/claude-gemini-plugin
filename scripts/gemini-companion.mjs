#!/usr/bin/env node --no-deprecation
// gemini-companion.mjs — Gemini CLI bridge for Claude Code plugin

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import os from "node:os";

const ROOT_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const JOBS_DIR = path.join(ROOT_DIR, "jobs");

// 헬퍼: gemini 바이너리 경로 동적 감지
function findGeminiBinary() {
  const isWindows = process.platform === "win32";
  const whichCmd = isWindows ? "where" : "which";

  try {
    const result = spawnSync(whichCmd, ["gemini"], { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
    if (result.stdout && result.stdout.trim()) {
      // \r\n 처리: 줄 분리 후 빈 줄 제거, 각 항목 trim
      const lines = result.stdout.split("\n").map(l => l.trim().replace(/\r/g, "")).filter(Boolean);
      if (isWindows) {
        // Windows: .cmd 파일 우선 선택 (shell: true 없이도 cmd.exe가 실행 가능)
        return lines.find(l => l.endsWith(".cmd")) || lines[0];
      }
      return lines[0];
    }
  } catch (e) {
    // which/where 실패, 폴백으로 진행
  }

  // 폴백: NVM 글로브 패턴
  const homeDir = os.homedir();
  try {
    const nvmDir = path.join(homeDir, ".nvm/versions/node");
    if (fs.existsSync(nvmDir)) {
      const nodeVersions = fs.readdirSync(nvmDir).sort().reverse();
      for (const ver of nodeVersions) {
        const geminiPath = path.join(nvmDir, ver, "bin", "gemini");
        if (fs.existsSync(geminiPath)) {
          return geminiPath;
        }
      }
    }
  } catch (e) {
    // NVM 폴백 실패
  }

  // 실패 시 기본값
  return "gemini";
}

const GEMINI_BIN = findGeminiBinary();

// 모델 매핑
const MODEL_MAP = {
  pro: "gemini-3.1-pro-preview",
  flash: "gemini-3-flash-preview",
};
const DEFAULT_MODEL = "gemini-3-flash-preview";

function ensureJobsDir() {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

function generateJobId() {
  return "g-" + crypto.randomBytes(4).toString("hex");
}

function jobFile(id) {
  return path.join(JOBS_DIR, id + ".json");
}

function readJob(id) {
  try { return JSON.parse(fs.readFileSync(jobFile(id), "utf-8")); }
  catch { return null; }
}

function writeJob(id, data) {
  ensureJobsDir();
  fs.writeFileSync(jobFile(id), JSON.stringify(data, null, 2));
}

function listJobs() {
  try {
    return fs.readdirSync(JOBS_DIR)
      .filter(f => f.endsWith(".json"))
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(JOBS_DIR, f), "utf-8")); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  } catch { return []; }
}

function parseModelFlag(args) {
  const idx = args.indexOf("--model");
  if (idx !== -1 && args[idx + 1]) {
    const raw = args[idx + 1];
    return MODEL_MAP[raw] || raw;
  }
  return DEFAULT_MODEL;
}

function stripFlags(args, ...flags) {
  const result = [];
  let i = 0;
  while (i < args.length) {
    if (flags.includes(args[i])) {
      // skip flag and its value if it takes one
      if (["--model", "--base"].includes(args[i])) i += 2;
      else i += 1;
    } else {
      result.push(args[i++]);
    }
  }
  return result;
}

// Windows cmd.exe용 shell quoting: 각 인자를 큰따옴표로 감싸고 내부 " 이스케이프
function shellQuote(s) {
  return '"' + String(s).replace(/"/g, '""') + '"';
}

// shell: true 환경에서 안전한 커맨드 문자열 생성
function buildCmdStr(bin, args) {
  return [bin, ...args].map(shellQuote).join(" ");
}

async function runGemini(model, prompt, { background = false, jobId = null } = {}) {
  const id = jobId || generateJobId();
  const cmdStr = buildCmdStr(GEMINI_BIN, ["--yolo", "-m", model, "-p", prompt]);

  if (background) {
    ensureJobsDir();
    const outFile = path.join(JOBS_DIR, id + ".out");
    const doneFile = path.join(JOBS_DIR, id + ".done");
    const jobFilePath = jobFile(id);
    writeJob(id, { id, status: "running", model, prompt, startedAt: new Date().toISOString(), outFile, doneFile });

    // 별도 Node 프로세스에서 gemini 동기 실행 → 완료 후 job 파일 업데이트
    // child.unref() 후 companion이 즉시 종료되므로 close 이벤트 대신 래퍼 사용
    const wrapperCode = [
      `const {spawnSync}=require('child_process');`,
      `const fs=require('fs');`,
      `const r=spawnSync(${JSON.stringify(cmdStr)},[],{shell:true,encoding:'utf-8',maxBuffer:50*1024*1024});`,
      `const out=(r.stdout||'')+(r.stderr||'');`,
      `fs.writeFileSync(${JSON.stringify(outFile)},out||'[no output]');`,
      `try{const j=JSON.parse(fs.readFileSync(${JSON.stringify(jobFilePath)},'utf-8'));`,
      `fs.writeFileSync(${JSON.stringify(jobFilePath)},JSON.stringify({...j,status:'completed',exitCode:r.status,completedAt:new Date().toISOString()},null,2));}catch{}`,
      `fs.writeFileSync(${JSON.stringify(doneFile)},'done');`,
    ].join("\n");

    const child = spawn(process.execPath, ["-e", wrapperCode], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    console.log(`[gemini] Job started in background: ${id}`);
    console.log(`[gemini] Check progress with: /gemini:status ${id}`);
    console.log(`[gemini] Get result with:     /gemini:result ${id}`);
    return;
  }

  // 포그라운드 실행 (subagent가 background Agent로 감싸지므로 여기선 동기 대기)
  const result = spawnSync(cmdStr, { shell: true, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
  if (result.error) {
    console.error("[gemini] Error:", result.error.message);
    process.exit(1);
  }
  const raw = (result.stdout || "") + (result.stderr || "");
  process.stdout.write(cleanOutput(raw) + "\n");
}

async function cmdTask(argv) {
  const background = argv.includes("--background");
  const model = parseModelFlag(argv);
  const clean = stripFlags(argv, "--background", "--wait", "--model");
  const prompt = clean.join(" ");
  if (!prompt.trim()) { console.error("[gemini] No task provided."); process.exit(1); }
  await runGemini(model, prompt, { background });
}

async function cmdReview(argv) {
  const background = argv.includes("--background");
  const baseIdx = argv.indexOf("--base");
  const base = baseIdx !== -1 ? argv[baseIdx + 1] : "HEAD";
  const model = parseModelFlag(argv);

  // git diff 수집
  const diff = spawnSync("git", ["diff", base], { encoding: "utf-8" });
  if (diff.error || !diff.stdout.trim()) {
    console.log("[gemini] No changes to review.");
    return;
  }
  const prompt = `Review the following git diff and provide constructive feedback:\n\n${diff.stdout}`;
  await runGemini(model, prompt, { background });
}

async function cmdStatus(argv) {
  const id = argv[0];
  if (id) {
    const job = readJob(id);
    if (!job) { console.log(`[gemini] Job not found: ${id}`); return; }
    // doneFile 존재 시 완료로 간주 (child.unref() 후 close 이벤트 미수신 대비)
    if (job.status === "running" && job.doneFile && fs.existsSync(job.doneFile)) {
      job.status = "completed";
    }
    console.log(`Job: ${job.id}`);
    console.log(`Status: ${job.status}`);
    console.log(`Model: ${job.model}`);
    console.log(`Started: ${job.startedAt}`);
    if (job.completedAt) console.log(`Completed: ${job.completedAt}`);
    return;
  }
  const jobs = listJobs().slice(0, 10);
  if (!jobs.length) { console.log("[gemini] No jobs found."); return; }
  for (const j of jobs) {
    console.log(`${j.id}  ${j.status.padEnd(8)}  ${j.startedAt}  ${j.prompt?.slice(0, 60)}`);
  }
}

const GEMINI_NOISE = /YOLO mode is enabled|All tool calls will be automatically approved|Loaded cached credentials|Registering notification handlers|listChanged|MCP context refresh|Server '.+' has (tools|prompts)|^\s*$/;

function cleanOutput(raw) {
  return raw
    .split("\n")
    .filter(l => !GEMINI_NOISE.test(l))
    .join("\n")
    .trim();
}

async function cmdResult(argv) {
  const id = argv[0] || listJobs()[0]?.id;
  if (!id) { console.log("[gemini] No jobs found."); return; }
  const job = readJob(id);
  if (!job) { console.log(`[gemini] Job not found: ${id}`); return; }
  try {
    const out = fs.readFileSync(job.outFile, "utf-8");
    console.log(cleanOutput(out));
  } catch { console.log("[gemini] Result not available yet."); }
}

async function cmdCancel(argv) {
  const id = argv[0] || listJobs().find(j => j.status === "running")?.id;
  if (!id) { console.log("[gemini] No running job found."); return; }
  const job = readJob(id);
  if (!job) { console.log(`[gemini] Job not found: ${id}`); return; }
  writeJob(id, { ...job, status: "cancelled", cancelledAt: new Date().toISOString() });
  console.log(`[gemini] Cancelled: ${id}`);
}

async function cmdCheck() {
  const res = spawnSync(GEMINI_BIN, ["--version"], { encoding: "utf-8", shell: true });
  if (res.error) {
    console.log("❌ Gemini CLI not found. Install with: npm install -g @google/gemini-cli");
  } else {
    console.log("✅ Gemini CLI available:", res.stdout.trim());
  }
}

// main
const [,, cmd, ...rest] = process.argv;
switch (cmd) {
  case "task":           await cmdTask(rest); break;
  case "review":         await cmdReview(rest); break;
  case "status":         await cmdStatus(rest); break;
  case "result":         await cmdResult(rest); break;
  case "cancel":         await cmdCancel(rest); break;
  case "check":          await cmdCheck(); break;
  case "session-start":  break; // no-op
  case "session-end":    break; // no-op
  default:
    console.error(`[gemini] Unknown command: ${cmd}`);
    process.exit(1);
}
