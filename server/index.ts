import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { api } from "./routes.js";
import { ClaudeError } from "./claude.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(here, "../web/dist");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "30mb" }));

app.use("/api", api);

app.use("/api", (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ClaudeError) return res.status(502).json({ error: err.message });
  console.error(err);
  const msg = err instanceof Error ? err.message : "Something went wrong";
  res.status(500).json({ error: msg });
});

if (fs.existsSync(webDist)) {
  app.use(express.static(webDist, { index: false, maxAge: "1h" }));
  app.get(/.*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(path.join(webDist, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.type("text").send("eOTS API is running. Build the web app with `npm run build`, or use `npm run dev`.");
  });
}

if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.warn("Warning: ANTHROPIC_API_KEY is not set. Idea generation will fail until it is.");
}

app.listen(config.port, () => {
  console.log(`eOTS listening on http://localhost:${config.port} (model: ${config.model}, data: ${config.dataDir})`);
});
