const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    count: 1000,
    force: false,
    file: "./data/codes.json"
  };

  for (const arg of args) {
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (arg.startsWith("--count=")) {
      options.count = Number(arg.split("=")[1]);
      continue;
    }
    if (arg.startsWith("--file=")) {
      options.file = arg.split("=")[1];
    }
  }
  return options;
}

function randomChunk(length) {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let output = "";
  while (output.length < length) {
    const byte = crypto.randomBytes(1)[0];
    const max = Math.floor(256 / chars.length) * chars.length;
    if (byte >= max) {
      continue;
    }
    output += chars[byte % chars.length];
  }
  return output;
}

function generateCode() {
  return "YZ-" + randomChunk(4) + "-" + randomChunk(4) + "-" + randomChunk(4);
}

function main() {
  const options = parseArgs();
  if (!Number.isInteger(options.count) || options.count <= 0) {
    throw new Error("count must be a positive integer");
  }

  const targetFile = path.resolve(process.cwd(), options.file);
  const targetDir = path.dirname(targetFile);
  fs.mkdirSync(targetDir, { recursive: true });

  if (fs.existsSync(targetFile) && !options.force) {
    throw new Error("target file exists, use --force to overwrite: " + targetFile);
  }

  const codes = {};
  while (Object.keys(codes).length < options.count) {
    const code = generateCode();
    if (codes[code]) {
      continue;
    }
    codes[code] = {
      code,
      boundDeviceId: "",
      boundAt: "",
      unboundAt: "",
      bindCount: 0,
      boundDevices: [],
      maxBindDevices: 1
    };
  }

  const now = new Date().toISOString();
  const payload = {
    version: 1,
    generatedAt: now,
    count: options.count,
    codes
  };

  const tempFile = targetFile + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(tempFile, targetFile);

  const codeListFile = path.join(targetDir, "codes-list.txt");
  fs.writeFileSync(codeListFile, Object.keys(codes).join("\n") + "\n", "utf8");

  console.log("Seed complete");
  console.log("Count:", options.count);
  console.log("JSON:", targetFile);
  console.log("List:", codeListFile);
}

try {
  main();
} catch (error) {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
}
