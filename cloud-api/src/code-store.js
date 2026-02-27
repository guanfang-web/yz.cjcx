const fs = require("fs");
const path = require("path");

const LEGACY_SHARED_CODES = Object.freeze([
  "YZ-7QK9-2M4R-X8P1",
  "YZ-N5T2-H9L7-C3V8",
  "YZ-4RZ1-K6W8-P2D9",
  "YZ-B8M3-Q1F7-T6N4",
  "YZ-X2C7-L9P4-R5K8",
  "YZ-H6V1-D3Q8-M9T2",
  "YZ-P4N8-Z2K5-W7R1",
  "YZ-T9L3-X5C1-Q8M6",
  "YZ-K7R2-B4H9-V1P5",
  "YZ-M1D6-T8N3-L4Q7"
]);

const LEGACY_SHARED_CODE_SET = new Set(LEGACY_SHARED_CODES);
const LEGACY_MAX_BIND_DEVICES = 30;
const DEFAULT_MAX_BIND_DEVICES = 1;

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function normalizeDeviceId(deviceId) {
  return String(deviceId || "").trim();
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function toNonNegativeInteger(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.max(0, Math.floor(num));
}

function toPositiveInteger(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  return Math.floor(num);
}

function getDefaultMaxBindDevices(code) {
  return LEGACY_SHARED_CODE_SET.has(code) ? LEGACY_MAX_BIND_DEVICES : DEFAULT_MAX_BIND_DEVICES;
}

function normalizeBoundDevices(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  const output = [];
  const seen = new Set();
  for (const item of list) {
    const normalized = normalizeDeviceId(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

function createDefaultEntry(code) {
  return {
    code,
    boundDeviceId: "",
    boundAt: "",
    unboundAt: "",
    bindCount: 0,
    boundDevices: [],
    maxBindDevices: getDefaultMaxBindDevices(code)
  };
}

class CodeStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.data = {
      version: 1,
      generatedAt: "",
      count: 0,
      codes: {}
    };
    this.load();
  }

  load() {
    ensureParentDir(this.filePath);
    if (!fs.existsSync(this.filePath)) {
      this.persist();
      return;
    }

    const raw = fs.readFileSync(this.filePath, "utf8");
    if (!raw.trim()) {
      this.persist();
      return;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid code data file format");
    }

    this.data.version = Number(parsed.version) || 1;
    this.data.generatedAt = String(parsed.generatedAt || "");
    this.data.count = Number(parsed.count) || 0;
    this.data.codes = parsed.codes && typeof parsed.codes === "object" ? parsed.codes : {};

    const changed = this.normalizeAndEnsureCodes();
    if (changed) {
      this.persist();
    }
  }

  normalizeEntry(code, source) {
    const raw = source && typeof source === "object" ? source : {};
    const normalized = createDefaultEntry(code);

    normalized.boundDeviceId = normalizeDeviceId(raw.boundDeviceId);
    normalized.boundAt = String(raw.boundAt || "");
    normalized.unboundAt = String(raw.unboundAt || "");
    normalized.bindCount = toNonNegativeInteger(raw.bindCount, 0);
    normalized.maxBindDevices = toPositiveInteger(raw.maxBindDevices, getDefaultMaxBindDevices(code));
    if (LEGACY_SHARED_CODE_SET.has(code)) {
      normalized.maxBindDevices = LEGACY_MAX_BIND_DEVICES;
    }

    const boundDevices = normalizeBoundDevices(raw.boundDevices);
    if (normalized.boundDeviceId && boundDevices.indexOf(normalized.boundDeviceId) < 0) {
      boundDevices.push(normalized.boundDeviceId);
    }
    normalized.boundDevices = boundDevices;

    if (normalized.bindCount < normalized.boundDevices.length) {
      normalized.bindCount = normalized.boundDevices.length;
    }

    return normalized;
  }

  normalizeAndEnsureCodes() {
    const existingCodes = this.data.codes && typeof this.data.codes === "object" ? this.data.codes : {};
    const normalizedCodes = {};
    let changed = false;

    for (const [rawCode, rawEntry] of Object.entries(existingCodes)) {
      const code = normalizeCode(rawCode || (rawEntry && rawEntry.code));
      if (!code) {
        changed = true;
        continue;
      }
      if (normalizedCodes[code]) {
        changed = true;
        continue;
      }
      normalizedCodes[code] = this.normalizeEntry(code, rawEntry);
      if (rawCode !== code) {
        changed = true;
      }
    }

    for (const legacyCode of LEGACY_SHARED_CODES) {
      if (!normalizedCodes[legacyCode]) {
        normalizedCodes[legacyCode] = createDefaultEntry(legacyCode);
        changed = true;
        continue;
      }
      if (normalizedCodes[legacyCode].maxBindDevices !== LEGACY_MAX_BIND_DEVICES) {
        normalizedCodes[legacyCode].maxBindDevices = LEGACY_MAX_BIND_DEVICES;
        changed = true;
      }
    }

    const count = Object.keys(normalizedCodes).length;
    if (this.data.count !== count) {
      changed = true;
    }

    this.data.codes = normalizedCodes;
    this.data.count = count;
    return changed;
  }

  persist() {
    ensureParentDir(this.filePath);
    const tempPath = this.filePath + ".tmp";
    fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), "utf8");
    fs.renameSync(tempPath, this.filePath);
  }

  getStats() {
    const codes = Object.values(this.data.codes || {});
    let bound = 0;
    let exhausted = 0;
    for (const item of codes) {
      if (item && item.boundDeviceId) {
        bound += 1;
      }
      const maxBindDevices = toPositiveInteger(item && item.maxBindDevices, DEFAULT_MAX_BIND_DEVICES);
      const usedBindDevices = normalizeBoundDevices(item && item.boundDevices).length;
      if (usedBindDevices >= maxBindDevices) {
        exhausted += 1;
      }
    }
    return {
      total: codes.length,
      bound,
      unbound: Math.max(codes.length - bound, 0),
      exhausted
    };
  }

  bind(code, deviceId) {
    const normalizedCode = normalizeCode(code);
    const normalizedDeviceId = normalizeDeviceId(deviceId);
    if (!normalizedCode) {
      return { ok: false, statusCode: 400, message: "Code is required" };
    }
    if (!normalizedDeviceId) {
      return { ok: false, statusCode: 400, message: "Device ID is required" };
    }

    const entry = this.data.codes[normalizedCode];
    if (!entry) {
      return { ok: false, statusCode: 404, message: "Code not found" };
    }
    const maxBindDevices = toPositiveInteger(entry.maxBindDevices, getDefaultMaxBindDevices(normalizedCode));
    const boundDevices = normalizeBoundDevices(entry.boundDevices);
    const hasBoundBefore = boundDevices.indexOf(normalizedDeviceId) >= 0;

    if (!entry.boundDeviceId) {
      if (!hasBoundBefore && boundDevices.length >= maxBindDevices) {
        return {
          ok: false,
          statusCode: 409,
          message: "Code has reached its maximum bind limit",
          status: "bind_limit_reached"
        };
      }
      if (!hasBoundBefore) {
        boundDevices.push(normalizedDeviceId);
      }
      entry.boundDevices = boundDevices;
      entry.maxBindDevices = maxBindDevices;
      entry.boundDeviceId = normalizedDeviceId;
      entry.boundAt = new Date().toISOString();
      entry.unboundAt = "";
      entry.bindCount = toNonNegativeInteger(entry.bindCount, 0) + 1;
      this.persist();
      return {
        ok: true,
        status: "bound",
        maxBindDevices,
        usedBindDevices: boundDevices.length,
        remainingBindDevices: Math.max(maxBindDevices - boundDevices.length, 0)
      };
    }

    if (entry.boundDeviceId === normalizedDeviceId) {
      return {
        ok: true,
        status: "already_bound_to_this_device",
        maxBindDevices,
        usedBindDevices: boundDevices.length,
        remainingBindDevices: Math.max(maxBindDevices - boundDevices.length, 0)
      };
    }

    return { ok: false, statusCode: 409, message: "Code is already bound to another device" };
  }

  unbind(code, deviceId) {
    const normalizedCode = normalizeCode(code);
    const normalizedDeviceId = normalizeDeviceId(deviceId);
    if (!normalizedCode) {
      return { ok: false, statusCode: 400, message: "Code is required" };
    }
    if (!normalizedDeviceId) {
      return { ok: false, statusCode: 400, message: "Device ID is required" };
    }

    const entry = this.data.codes[normalizedCode];
    if (!entry) {
      return { ok: false, statusCode: 404, message: "Code not found" };
    }
    const maxBindDevices = toPositiveInteger(entry.maxBindDevices, getDefaultMaxBindDevices(normalizedCode));
    const boundDevices = normalizeBoundDevices(entry.boundDevices);
    entry.boundDevices = boundDevices;
    entry.maxBindDevices = maxBindDevices;

    if (!entry.boundDeviceId) {
      return {
        ok: true,
        status: "already_unbound",
        maxBindDevices,
        usedBindDevices: boundDevices.length,
        remainingBindDevices: Math.max(maxBindDevices - boundDevices.length, 0)
      };
    }

    if (entry.boundDeviceId !== normalizedDeviceId) {
      return { ok: false, statusCode: 403, message: "Only the bound device can unbind this code" };
    }

    entry.boundDeviceId = "";
    entry.boundAt = "";
    entry.unboundAt = new Date().toISOString();
    this.persist();
    return {
      ok: true,
      status: "unbound",
      maxBindDevices,
      usedBindDevices: boundDevices.length,
      remainingBindDevices: Math.max(maxBindDevices - boundDevices.length, 0)
    };
  }
}

module.exports = {
  CodeStore,
  normalizeCode,
  normalizeDeviceId,
  LEGACY_SHARED_CODES,
  LEGACY_MAX_BIND_DEVICES,
  DEFAULT_MAX_BIND_DEVICES
};
