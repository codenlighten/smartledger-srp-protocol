"use strict";

const fs = require("fs");
const path = require("path");

const root = __dirname;
const inputPath = path.join(root, "conformance-report.json");
const outputPath = path.join(root, "conformance-report.md");

if (!fs.existsSync(inputPath)) {
  throw new Error("conformance-report.json not found. Run `npm run conformance:report` first.");
}

const report = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const reqs = Array.isArray(report.requirements) ? report.requirements : [];

const lines = [];
lines.push(`# ${report.protocol} ${report.version} Conformance Report`);
lines.push("");
lines.push(`Generated: ${report.generatedAt}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Overall OK: ${report.summary?.overallOk ? "Yes" : "No"}`);
lines.push(`- Total requirements: ${report.summary?.counts?.total ?? reqs.length}`);
lines.push(`- Pass: ${report.summary?.counts?.pass ?? 0}`);
lines.push(`- Manual review: ${report.summary?.counts?.manualReview ?? 0}`);
lines.push(`- Fail: ${report.summary?.counts?.fail ?? 0}`);
lines.push("");
lines.push("## Sources");
lines.push("");
lines.push(`- Spec: ${report.sources?.spec || "n/a"}`);
lines.push(`- Vectors: ${report.sources?.vectors || "n/a"}`);
lines.push(`- Manifest: ${report.sources?.manifest || "n/a"}`);
lines.push("");
lines.push("## Command Runs");
lines.push("");
for (const [name, run] of Object.entries(report.runs || {})) {
  lines.push(`### ${name}`);
  lines.push("");
  lines.push(`- Command: \`${run.command}\``);
  lines.push(`- Status: ${run.ok ? "PASS" : "FAIL"}`);
  lines.push(`- Started: ${run.startedAt}`);
  lines.push(`- Ended: ${run.endedAt}`);
  lines.push("");
  lines.push("Output:");
  lines.push("");
  lines.push("```text");
  lines.push((run.output || "").trim());
  lines.push("```");
  lines.push("");
}

lines.push("## Requirement Matrix");
lines.push("");
lines.push("| ID | Section | Normative | Automated | Status | Description | Automated By |")
lines.push("| --- | --- | --- | --- | --- | --- | --- |")
for (const r of reqs) {
  const automatedBy = Array.isArray(r.automatedBy) && r.automatedBy.length ? r.automatedBy.join(", ") : "-";
  lines.push(`| ${r.id} | ${r.section} | ${r.normative} | ${r.automated ? "Yes" : "No"} | ${r.status} | ${String(r.description || "").replace(/\|/g, "\\|")} | ${automatedBy} |`);
}

fs.writeFileSync(outputPath, lines.join("\n") + "\n");
console.log(`Markdown conformance report generated at ${outputPath}.`);
