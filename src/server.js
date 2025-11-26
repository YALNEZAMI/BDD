import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { firstSetUp, traiter } from "./app.js";
import "dotenv/config"; // ceci charge automatiquement le .env

const app = express();

// (optionnel) pour parser JSON dans les requêtes POST
app.use(express.json());
// public at project root (sibling of src)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, "..", "public");
// Tell express to serve static files from PUBLIC_DIR at web root "/"
app.use(express.static(PUBLIC_DIR));

// Route simple
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Route simple
app.get("/setup", async (req, res) => {
  console.log("setup route");

  const setup = await firstSetUp();
  res.send(setup);
});
app.post("/traiter", async (req, res) => {
  const result = await traiter(req.body);
  res.send(result);
});

// Choisir un port
const PORT = 3000;

// Démarrer le serveur
app.listen(PORT, async () => {
  await firstSetUp();
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
