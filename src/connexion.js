const net = require("net");
const { postgreConf, monetdbConf } = require("./config.js");
const { Connection } = require("monetdb"); // Version 2.x
const { Pool } = require("pg");
const { normalizeConnexion } = require("./utils.js");
// Vérifie si un port est ouvert
function checkPort(host, port, timeout = 1000) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let done = false;

    sock.setTimeout(timeout);
    sock.on("connect", () => {
      done = true;
      sock.destroy();
      resolve({ host, port, ok: true });
    });
    sock.on("timeout", () => {
      if (!done) {
        done = true;
        sock.destroy();
        resolve({ host, port, ok: false, reason: "timeout" });
      }
    });
    sock.on("error", (err) => {
      if (!done) {
        done = true;
        resolve({ host, port, ok: false, reason: err.message });
      }
    });
    sock.connect(port, host);
  });
}

// Vérifie si les services écoutent
async function checkConnections() {
  const targets = [postgreConf, monetdbConf];
  let bothConnected = true;
  for (const t of targets) {
    const r = await checkPort(t.host, t.port, 800);
    if (!r.ok) bothConnected = false;
    console.log(
      `${t.sgbd} (${t.host}:${t.port}) -> ${
        r.ok ? "LISTENING" : "NOT LISTENING"
      }${r.reason ? " — " + r.reason : ""}`
    );
  }

  return bothConnected;
}

function getConnexion(conf) {
  if (conf.sgbd === "postgre") {
    const pool = new Pool(conf);
    return normalizeConnexion(pool, conf.sgbd);
  }

  if (conf.sgbd === "monetdb") {
    const conn = new Connection({
      host: monetdbConf.host,
      port: monetdbConf.port,
      user: monetdbConf.user,
      password: monetdbConf.password,
      database: monetdbConf.database,
    });
    return normalizeConnexion(conn, conf.sgbd);
  }
}

module.exports = { checkConnections, getConnexion };
