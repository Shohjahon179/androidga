const express = require("express");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.API_KEY || "";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false },
});

const app = express();
app.use(express.json({ limit: "6mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", (req, res, next) => {
  if (API_KEY && req.get("X-API-Key") !== API_KEY) {
    return res.status(401).json({ error: "API kalit noto'g'ri" });
  }
  next();
});

const TABLES = ["users", "records", "messages"];

for (const t of TABLES) {
  app.get(`/api/${t}`, async (_req, res) => {
    try {
      const r = t === "users"
        ? await pool.query("SELECT data FROM users WHERE id NOT IN (SELECT id FROM deleted_users) ORDER BY id")
        : await pool.query(`SELECT data FROM ${t} ORDER BY id`);
      res.json(r.rows.map((x) => x.data));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put(`/api/${t}/:id`, async (req, res) => {
    try {
      const data = { ...req.body, id: req.params.id };
      if (t === "users") {
        const deleted = await pool.query("SELECT 1 FROM deleted_users WHERE id=$1", [req.params.id]);
        if (deleted.rowCount) return res.status(410).json({ error: "Akkaunt o'chirilgan" });
      }
      await pool.query(
        `INSERT INTO ${t} (id, data) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [req.params.id, data]
      );
      res.json({ ok: true });
    } catch (e) {
      // users.username unique violation
      res.status(e.code === "23505" ? 409 : 500).json({ error: e.message });
    }
  });

  app.delete(`/api/${t}/:id`, async (req, res) => {
    try {
      if (t === "users") {
        await pool.query("INSERT INTO deleted_users(id) VALUES($1) ON CONFLICT DO NOTHING", [req.params.id]);
      }
      await pool.query(`DELETE FROM ${t} WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

(async () => {
  await pool.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
  // Boshlang'ich akkauntlar (faqat jadval bo'sh bo'lsa)
  const c = await pool.query("SELECT count(*)::int AS n FROM users");
  if (c.rows[0].n === 0) {
    const seed = [
      { id: "1", phoneNumber: "+998901234567", username: "xodim", password: "1234", role: "Xodim" },
      { id: "2", phoneNumber: "+998907654321", username: "rahbar", password: "1234", role: "Rahbar" },
    ];
    for (const u of seed) await pool.query("INSERT INTO users (id,data) VALUES ($1,$2)", [u.id, u]);
  }
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log("Vagon server :" + port));
})().catch((e) => { console.error(e); process.exit(1); });
