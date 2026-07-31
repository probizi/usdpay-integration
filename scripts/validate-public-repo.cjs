"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const required = [
  "README.md",
  "SECURITY.md",
  "SUPPORT.md",
  "LICENSE",
  "openapi/openapi.json",
  "sdk/node/index.cjs",
  "examples/create-invoice.mjs",
  "examples/verify-webhook.cjs",
  "assets/usdpay-payment-flow.svg",
];

for (const file of required) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} is required`);
}

const openapi = JSON.parse(fs.readFileSync(path.join(root, "openapi/openapi.json"), "utf8"));
assert.equal(openapi.openapi, "3.1.0");
assert.equal(openapi.servers[0].url, "https://usdpay.me");

const textFiles = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(target);
    else if (path.resolve(target) === __filename) continue;
    else if (/\.(?:md|json|js|cjs|mjs|yml|yaml|svg)$/.test(entry.name) || entry.name === "LICENSE") textFiles.push(target);
  }
}
collect(root);

const combined = textFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const forbidden of [
  /BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/,
  /45\.86\.60\.76/,
  /\/opt\/usdpay/,
  /TonAPI|TronGrid|publicnode|blastapi/i,
  /ADMIN_AUDIT_HMAC_KEY|DATABASE_URL|HEALTHCHECK_TOKEN/,
]) {
  assert.doesNotMatch(combined, forbidden);
}

console.log("USDPAY public repository validation passed");
