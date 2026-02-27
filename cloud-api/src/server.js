require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const { CodeStore, normalizeCode, normalizeDeviceId } = require("./code-store");

const app = express();
const port = Number(process.env.PORT || 8787);
const dbFile = process.env.CODE_DB_FILE || "./data/codes.json";
const dbPath = path.resolve(process.cwd(), dbFile);
const store = new CodeStore(dbPath);

const configuredOrigins = String(process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(express.json({ limit: "32kb" }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (configuredOrigins.includes("*") || configuredOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("origin_not_allowed"));
    }
  })
);

app.use((error, req, res, next) => {
  if (error && error.message === "origin_not_allowed") {
    res.status(403).json({ ok: false, message: "CORS origin is not allowed" });
    return;
  }
  next(error);
});

function extractCodeAndDevice(req) {
  return {
    code: normalizeCode(req.body && req.body.code),
    deviceId: normalizeDeviceId(req.body && req.body.deviceId)
  };
}

app.get("/api/v1/health", (req, res) => {
  res.json({
    ok: true,
    serverTime: new Date().toISOString(),
    stats: store.getStats()
  });
});

app.post("/api/v1/codes/bind", (req, res) => {
  const { code, deviceId } = extractCodeAndDevice(req);
  const result = store.bind(code, deviceId);
  if (!result.ok) {
    res.status(result.statusCode || 400).json({
      ok: false,
      message: result.message || "Bind failed"
    });
    return;
  }
  res.json({
    ok: true,
    status: result.status,
    code,
    maxBindDevices: result.maxBindDevices,
    usedBindDevices: result.usedBindDevices,
    remainingBindDevices: result.remainingBindDevices
  });
});

app.post("/api/v1/codes/unbind", (req, res) => {
  const { code, deviceId } = extractCodeAndDevice(req);
  const result = store.unbind(code, deviceId);
  if (!result.ok) {
    res.status(result.statusCode || 400).json({
      ok: false,
      message: result.message || "Unbind failed"
    });
    return;
  }
  res.json({
    ok: true,
    status: result.status,
    code,
    maxBindDevices: result.maxBindDevices,
    usedBindDevices: result.usedBindDevices,
    remainingBindDevices: result.remainingBindDevices
  });
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "API route not found"
  });
});

app.listen(port, () => {
  console.log("[yz-access-code-api] running on port " + port);
  console.log("[yz-access-code-api] db file: " + dbPath);
  console.log("[yz-access-code-api] stats:", store.getStats());
});
