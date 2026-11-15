import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { config, photosDir } from "./config.js";
import { emptyDatabase, type Database } from "./types.js";

const dbFile = path.join(config.dataDir, "db.json");
const configFile = path.join(config.dataDir, "config.json");

export interface AppConfig {
  pinHash: string | null;
  pinSalt: string | null;
  sessionSecret: string;
}

fs.mkdirSync(photosDir, { recursive: true });

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, value: unknown) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

let appConfig: AppConfig = readJson<AppConfig>(configFile, {
  pinHash: null,
  pinSalt: null,
  sessionSecret: randomBytes(32).toString("hex"),
});
if (!fs.existsSync(configFile)) writeJson(configFile, appConfig);

let db: Database = { ...emptyDatabase(), ...readJson<Partial<Database>>(dbFile, {}) };
db.profile = { ...emptyDatabase().profile, ...db.profile };

export const store = {
  get config() {
    return appConfig;
  },
  saveConfig(next: AppConfig) {
    appConfig = next;
    writeJson(configFile, appConfig);
  },
  get db() {
    return db;
  },
  save() {
    writeJson(dbFile, db);
  },
  newId(prefix = "") {
    return prefix + randomBytes(6).toString("hex");
  },
  photoPath(id: string) {
    if (!/^[a-f0-9]{12}$/.test(id)) throw new Error("bad photo id");
    return path.join(photosDir, `${id}.jpg`);
  },
  savePhoto(base64: string) {
    const id = randomBytes(6).toString("hex");
    fs.writeFileSync(this.photoPath(id), Buffer.from(base64, "base64"));
    return id;
  },
  readPhotoBase64(id: string) {
    return fs.readFileSync(this.photoPath(id)).toString("base64");
  },
  deletePhoto(id: string) {
    try {
      fs.unlinkSync(this.photoPath(id));
    } catch {
      /* already gone */
    }
  },
};
