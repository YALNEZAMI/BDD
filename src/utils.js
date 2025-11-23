const { Buffer } = require("buffer");

/**
 * Normalise la réponse brute pour Postgres ou MonetDB en:
 * { rows: Array, rowCount: number, sizeBytes: number, serverTimeMs?: number, raw }
 *
 * - engine: "postgre" ou "monetdb"
 * - raw: valeur renvoyée par wrapper.execute()
 */
function normalizeRawResult(raw, engine) {
  if (!raw) return { rows: [], rowCount: 0, sizeBytes: 0, raw };

  // --------- Postgres (pg) ----------
  // raw: { command, rowCount, rows: [...], ... }
  if (engine === "postgre") {
    const rows = Array.isArray(raw.rows) ? raw.rows : [];
    const rowCount =
      typeof raw.rowCount === "number" ? raw.rowCount : rows.length;
    const sizeBytes = rows.length
      ? Buffer.byteLength(JSON.stringify(rows), "utf8")
      : 0;
    // pg ne fournit pas de temps serveur dans l'objet standard, on ignore serverTime
    return { rows, rowCount, sizeBytes, raw };
  }

  // --------- MonetDB (mapi) ----------
  // raw: { type, affectedRows, data: [ [...], ... ], columns?: [...], queryTime?: N, ...}
  if (engine === "monetdb") {
    const data = Array.isArray(raw.data) ? raw.data : [];
    const cols = Array.isArray(raw.columns) ? raw.columns : [];
    let rows;

    if (cols.length) {
      // transformer chaque ligne tableau en objet {col: val}
      rows = data.map((arr) => {
        const obj = {};
        for (let i = 0; i < cols.length; i++) obj[cols[i]] = arr[i];
        return obj;
      });
    } else {
      // aucune colonne fournie : garder les arrays (ou vide pour UPDATE)
      rows = data.map((arr) => arr);
    }

    // affectedRows est le compte des lignes affectées pour UPDATE/INSERT/DELETE
    const rowCount =
      typeof raw.affectedRows === "number" ? raw.affectedRows : rows.length;
    const sizeBytes = rows.length
      ? Buffer.byteLength(JSON.stringify(rows), "utf8")
      : 0;

    // MonetDB renvoie souvent `queryTime` — c'est le temps du serveur (unité: souvent millisecondes).
    // On le retourne en serverTimeMs si présent.
    const serverTimeMs =
      typeof raw.queryTime === "number" ? raw.queryTime : undefined;

    return { rows, rowCount, sizeBytes, serverTimeMs, raw };
  }

  // fallback
  const fallbackRows = Array.isArray(raw) ? raw : [];
  return {
    rows: fallbackRows,
    rowCount: fallbackRows.length,
    sizeBytes: fallbackRows.length
      ? Buffer.byteLength(JSON.stringify(fallbackRows), "utf8")
      : 0,
    raw,
  };
}
/**
 * Normalise les résultats Postgre et MonetDB pour comparaison
 */
function normalizeQueryResults(pgResult, monetResult) {
  return {
    pg: {
      engine: "postgre",
      rowCount: pgResult.rowCount,
      sizeBytes: pgResult.sizeBytes,
      durationMs: pgResult.durationMs,
      // diskBefore: pgResult.diskBefore,
      // diskAfter: pgResult.diskAfter,
      // deadRowsBefore: pgResult.deadRowsBefore,
      // deadRowsAfter: pgResult.deadRowsAfter,
      // ioBefore: pgResult.ioBefore,
      // ioAfter: pgResult.ioAfter,
    },
    monet: {
      engine: "monetdb",
      rowCount: monetResult.rowCount,
      sizeBytes: monetResult.sizeBytes,
      durationMs: monetResult.durationMs,
      // statsBefore: monetResult.statsBefore,
      // statsAfter: monetResult.statsAfter,
    },
  };
}

function normalizeConnexion(conn, engine) {
  if (engine === "postgre") {
    return {
      type: "postgre",
      raw: conn,
      connect: async () => {}, // Pool se connecte automatiquement
      execute: (sql, params) => conn.query(sql, params),
      close: () => conn.end(),
    };
  } else if (engine === "monetdb") {
    return {
      type: "monetdb",
      raw: conn,
      connect: () => conn.connect(),
      execute: (sql) => conn.execute(sql),
      close: () => conn.close(),
      commit: () => conn.commit(),
    };
  }
}
module.exports = {
  normalizeQueryResults,
  normalizeConnexion,
  normalizeRawResult,
};
