import { config } from "./config.js";
import { Connection } from "monetdb"; // Version 2.x
import { Pool } from "pg";
import net from "net";
// Vérifie si un port est ouvert
async function checkPort(host, port, timeout = 1000) {
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

/**
 * @ensure les deux sgbd sont connectés
 * @return {ok:boolean, notConnected:string}
 */
export const checkConnections = async () => {
  const targets = [config.postgreConf, config.monetdbConf];
  let ok = true;
  let notConnected = "";
  for (const t of targets) {
    const r = await checkPort(t.host, t.port, 800);

    if (!r.ok) {
      ok = false;
      notConnected += `-${t.sgbd.toUpperCase()} not listening to port ${
        t.port
      }, run it on the indicated port or change the port in config.js to the current server. \n`;
    }
  }

  return { ok, notConnected };
};

/**
 *
 * @param {*} conf une configuration de driver venant de config.js
 * @returns retourne un driver (monetdb | postgre)
 */
export const getConnexion = (conf) => {
  if (conf.sgbd === "postgres") {
    const pool = new Pool(conf);
    return normalizeConnexion(pool, conf.sgbd);
  }

  if (conf.sgbd === "monetdb") {
    const conn = new Connection({
      host: config.monetdbConf.host,
      port: config.monetdbConf.port,
      user: config.monetdbConf.user,
      password: config.monetdbConf.password,
      database: config.monetdbConf.database,
    });
    return normalizeConnexion(conn, conf.sgbd);
  }
};

/**
 *
 * @param {*} conn un dirver resultant de getConnexion
 * @param {string} engine nom du driver postgre | monetdb
 * @returns une forme unifié du driver initial
 */
function normalizeConnexion(conn, engine) {
  if (engine === "postgres") {
    return {
      type: "postgres",
      raw: conn,
      connect: async () => {}, // Pool se connecte automatiquement
      execute: async (sql, params) => await conn.query(sql, params),
      close: async () => await conn.end(),
    };
  } else if (engine === "monetdb") {
    return {
      type: "monetdb",
      raw: conn,
      connect: () => conn.connect(),
      execute: async (sql) => {
        const res = await conn.execute(sql);
        await conn.commit();
        return res;
      },
      close: async () => await conn.close(),
    };
  }
}
