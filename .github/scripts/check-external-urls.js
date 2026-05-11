#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const attributesToCheck = new Set(["href", "src", "action"]);
const localFileExtensions = new Set([
  "css",
  "eot",
  "exe",
  "gif",
  "goms",
  "htm",
  "html",
  "ico",
  "jpeg",
  "jpg",
  "js",
  "mp4",
  "pdf",
  "png",
  "svg",
  "ttf",
  "webp",
  "woff",
  "woff2",
  "xlsx",
  "zip",
]);

const schemePattern = /^[A-Za-z][A-Za-z0-9+.-]*:/;
const hostPattern = /^(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,63}$/;
const attrPattern = /\b(href|src|action)\s*=\s*(["'])(.*?)\2/gi;

function looksLikeExternalUrlWithoutScheme(rawValue) {
  const value = rawValue.trim();
  if (!value) {
    return false;
  }

  if (
    value.startsWith("#") ||
    value.startsWith("?") ||
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("{")
  ) {
    return false;
  }

  if (value.startsWith("//") || schemePattern.test(value)) {
    return false;
  }

  const firstPathPart = value.split(/[/?#]/, 1)[0];
  const hostCandidate = firstPathPart.split("@").pop().split(":", 1)[0];
  if (!hostPattern.test(hostCandidate)) {
    return false;
  }

  const suffix = hostCandidate.split(".").pop().toLowerCase();
  return !localFileExtensions.has(suffix);
}

function lineNumberForIndex(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

function walkHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === ".git") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function checkFile(root, filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const failures = [];
  attrPattern.lastIndex = 0;

  let match;
  while ((match = attrPattern.exec(content)) !== null) {
    const attrName = match[1].toLowerCase();
    const attrValue = match[3];

    if (
      attributesToCheck.has(attrName) &&
      looksLikeExternalUrlWithoutScheme(attrValue)
    ) {
      failures.push({
        attrName,
        attrValue: attrValue.trim(),
        line: lineNumberForIndex(content, match.index),
        path: path.relative(root, filePath),
      });
    }
  }

  return failures;
}

function main() {
  const root = path.resolve(__dirname, "..", "..");
  const failures = walkHtmlFiles(root).flatMap((filePath) =>
    checkFile(root, filePath),
  );

  if (failures.length === 0) {
    console.log("No scheme-less external URLs found.");
    return 0;
  }

  console.error("Scheme-less external URLs found:");
  for (const failure of failures) {
    console.error(
      `  ${failure.path}:${failure.line}: ${failure.attrName}="${failure.attrValue}"`,
    );
    console.error(`    Use "https://${failure.attrValue}" or another explicit scheme.`);
  }

  return 1;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { looksLikeExternalUrlWithoutScheme };
