"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = __dirname;
const manifestPath = path.join(root, "SRP-v1.0.1-CONFORMANCE.json");
const outputPath = path.join(root, "conformance-report.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function runCommand(command) {
  const startedAt = new Date().toISOString();
  try {
    const output = execSync(command, { cwd: root, stdio: ["ignore", "pipe", "pipe"] }).toString("utf8").trim();
    return {
      command,
      startedAt,
      endedAt: new Date().toISOString(),
      ok: true,
      output
    };
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString("utf8") : "";
    const stderr = error.stderr ? error.stderr.toString("utf8") : "";
    return {
      command,
      startedAt,
      endedAt: new Date().toISOString(),
      ok: false,
      output: [stdout, stderr].filter(Boolean).join("\n").trim(),
      exitCode: typeof error.status === "number" ? error.status : 1
    };
  }
}

const testRun = runCommand("npm test");
const conformanceRun = runCommand("npm run conformance");

const counts = {
  total: manifest.requirements.length,
  pass: manifest.requirements.filter((r) => r.status === "pass").length,
  manualReview: manifest.requirements.filter((r) => r.status === "manual-review").length,
  fail: manifest.requirements.filter((r) => r.status === "fail").length
};

const overallOk = testRun.ok && conformanceRun.ok && counts.fail === 0;

const report = {
  protocol: manifest.protocol,
  version: manifest.version,
  generatedAt: new Date().toISOString(),
  sources: {
    spec: manifest.specDocument,
    vectors: manifest.vectorsDocument,
    manifest: path.basename(manifestPath)
  },
  summary: {
    overallOk,
    counts
  },
  runs: {
    test: testRun,
    conformance: conformanceRun
  },
  requirements: manifest.requirements
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

if (!overallOk) {
  console.error(`Conformance report generated at ${outputPath} with FAIL status.`);
  process.exit(1);
}

console.log(`Conformance report generated at ${outputPath} (${counts.pass} pass, ${counts.manualReview} manual-review, ${counts.fail} fail).`);
