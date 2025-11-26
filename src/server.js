import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { firstSetUp, traiter } from "./app.js";

const app = express();

// (optionnel) pour parser JSON dans les requêtes POST
app.use(express.json());
// public at project root (sibling of src)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, "..", "public", "bin");
console.log(PUBLIC_DIR);
// Tell express to serve static files from PUBLIC_DIR at web root "/"
app.use(express.static(PUBLIC_DIR));

// optional: quick debug route to list files in public
app.get("/__public_files__", (req, res) => {
  try {
    const files = fs.readdirSync(PUBLIC_DIR);
    res.json({ path: PUBLIC_DIR, files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Route simple
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Route simple
app.get("/setup", async (req, res) => {
  const setup = await firstSetUp();
  res.send({ ok: setup, message: "setup réussi" });
});
app.post("/traiter", async (req, res) => {
  const result = await traiter(req.body);
  res.send(result);
});

// Choisir un port
const PORT = 3000;

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
