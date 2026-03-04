"use strict";

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "SRP-v1.0.1-CONFORMANCE.json");
const raw = fs.readFileSync(filePath, "utf8");
const json = JSON.parse(raw);

if (!Array.isArray(json.requirements) || json.requirements.length === 0) {
  throw new Error("Conformance file must include a non-empty requirements array.");
}

const requiredKeys = ["id", "section", "normative", "description", "automated", "status"];
for (const req of json.requirements) {
  for (const key of requiredKeys) {
    if (!(key in req)) {
      throw new Error(`Requirement ${req.id || "<unknown>"} missing key: ${key}`);
    }
  }
}

const passCount = json.requirements.filter((r) => r.status === "pass").length;
const manualCount = json.requirements.filter((r) => r.status === "manual-review").length;
const failCount = json.requirements.filter((r) => r.status === "fail").length;

if (failCount > 0) {
  throw new Error(`Conformance has ${failCount} failing requirements.`);
}

console.log(`SRP conformance manifest valid: ${json.requirements.length} requirements (${passCount} pass, ${manualCount} manual-review).`);
