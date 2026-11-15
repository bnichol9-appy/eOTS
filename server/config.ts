import path from "node:path";

// Load ./.env if present (no dependency needed on Node 20.12+).
try {
  process.loadEnvFile(path.resolve(".env"));
} catch {
  /* no .env file, rely on the real environment */
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  dataDir: path.resolve(process.env.EOTS_DATA_DIR ?? "./data"),
  model: process.env.EOTS_MODEL ?? "claude-opus-5-5",
  secureCookies: process.env.EOTS_SECURE_COOKIES === "true",
  isProd: process.env.NODE_ENV === "production",
  sessionHours: 12,
};

export const photosDir = path.join(config.dataDir, "photos");
