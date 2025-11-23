const { postgreConf, monetdbConf } = require("./config");
const { getConnexion } = require("./connexion");
const { normalizeQueryResults, normalizeRawResult } = require("./utils.js");

/**
 * Exécute une requête sur PostgreSQL et retourne métriques enrichies.
 */
async function runQueryPostgre(pool, sql, params = []) {
  const start = process.hrtime.bigint();

  // Mesures avant
  const sizeRes = await pool.execute(`
    SELECT SUM(pg_total_relation_size(relid)) AS bytes,
           SUM(n_dead_tup) AS dead_rows
    FROM pg_stat_user_tables;
  `);
  const diskBefore = sizeRes.rows[0].bytes;
  const deadRowsBefore = sizeRes.rows[0].dead_rows;

  const ioRes = await pool.execute(`
    SELECT 
    sum(heap_blks_read) AS io_read,
    sum(heap_blks_hit) AS io_hit,
    sum(idx_blks_read) AS idx_read,
    sum(idx_blks_hit) AS idx_hit
FROM pg_statio_user_tables;

  `);
  const ioBefore = ioRes.rows[0];

  // Exécution de la requête
  const raw = await pool.execute(sql, params);
  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;

  // Mesures après
  const sizeRes2 = await pool.execute(`
    SELECT SUM(pg_total_relation_size(relid)) AS bytes,
           SUM(n_dead_tup) AS dead_rows
    FROM pg_stat_user_tables;
  `);
  const diskAfter = sizeRes2.rows[0].bytes;
  const deadRowsAfter = sizeRes2.rows[0].dead_rows;

  const ioRes2 = await pool.execute(`
    SELECT 
    sum(heap_blks_read) AS io_read,
    sum(heap_blks_hit) AS io_hit,
    sum(idx_blks_read) AS idx_read,
    sum(idx_blks_hit) AS idx_hit
FROM pg_statio_user_tables;

  `);
  const ioAfter = ioRes2.rows[0];

  const normalized = normalizeRawResult(raw, "postgre");

  return {
    engine: "postgre",
    durationMs,
    rows: normalized.rows,
    rowCount: normalized.rowCount,
    sizeBytes: normalized.sizeBytes,
    diskBefore,
    diskAfter,
    deadRowsBefore,
    deadRowsAfter,
    ioBefore,
    ioAfter,
    raw: normalized.raw,
  };
}

/**
 * Exécute une requête sur MonetDB et retourne métriques enrichies.
 */
async function runQueryMonetdb(conn, sql) {
  const start = process.hrtime.bigint();

  // stats avant
  const statsBefore = await conn.execute("SELECT * FROM sys.tables;");

  // Exécution principale
  const raw = await conn.execute(sql);
  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;

  // stats après
  const statsAfter = await conn.execute("SELECT * FROM sys.tables;");

  const normalized = normalizeRawResult(raw, "monetdb");

  return {
    engine: "monetdb",
    durationMs,
    rows: normalized.rows,
    rowCount: normalized.rowCount,
    sizeBytes: normalized.sizeBytes,
    statsBefore: statsBefore.data,
    statsAfter: statsAfter.data,
    raw: normalized.raw,
  };
}

/**
 * q une requete sql
 * retourne {q: la requete, pg: resultat pg, monet: resultat monet}
 */
async function compareQuery(q) {
  const pool = getConnexion(postgreConf);
  const conn = getConnexion(monetdbConf);
  pool.connect();
  conn.connect();
  const pgRes = await runQueryPostgre(pool, q.sql);
  const monetRes = await runQueryMonetdb(conn, q.sql);

  const normalized = normalizeQueryResults(pgRes, monetRes);

  console.log("----");
  await pool.close();
  await conn.commit();
  await conn.close();
  return { q, ...normalized };
}

/**
 * Exécute un tableau de requêtes et calcule les moyennes des métriques
 * @param {Array<{label:string, sql:string, type:string}>} queries
 * @param {number} nbrExecution Nombre de fois à exécuter chaque requête
 * @returns {Object} { pg: {avgRowCount, avgSizeBytes, avgDurationMs}, monet: {...} }
 */
async function compareMultipleQueries(queries, nbrExecution = 1) {
  const pool = getConnexion(postgreConf);
  const conn = getConnexion(monetdbConf);
  await pool.connect();
  await conn.connect();

  const pgTotals = { rowCount: 0, sizeBytes: 0, durationMs: 0 };
  const monetTotals = { rowCount: 0, sizeBytes: 0, durationMs: 0 };

  for (const q of queries) {
    for (let i = 0; i < nbrExecution; i++) {
      const pgRes = await runQueryPostgre(pool, q.sql);
      const monetRes = await runQueryMonetdb(conn, q.sql);

      const normalized = normalizeQueryResults(pgRes, monetRes);

      pgTotals.rowCount += normalized.pg.rowCount;
      pgTotals.sizeBytes += normalized.pg.sizeBytes;
      pgTotals.durationMs += normalized.pg.durationMs;

      monetTotals.rowCount += normalized.monet.rowCount;
      monetTotals.sizeBytes += normalized.monet.sizeBytes;
      monetTotals.durationMs += normalized.monet.durationMs;
    }
  }

  const totalExecutions = queries.length * nbrExecution;

  await pool.close();
  await conn.commit();
  await conn.close();

  return {
    pg: {
      avgRowCount: pgTotals.rowCount / totalExecutions,
      avgSizeBytes: pgTotals.sizeBytes / totalExecutions,
      avgDurationMs: pgTotals.durationMs / totalExecutions,
    },
    monet: {
      avgRowCount: monetTotals.rowCount / totalExecutions,
      avgSizeBytes: monetTotals.sizeBytes / totalExecutions,
      avgDurationMs: monetTotals.durationMs / totalExecutions,
    },
  };
}
/**
 * Exécute un tableau de requêtes plusieurs fois et retourne un tableau de résultats par exécution
 * @param {Array<{label:string, sql:string, type:string}>} queries
 * @param {number} nbrExecution Nombre de fois à exécuter chaque requête
 * @returns {Array} tableau de { q, pg, monet } pour chaque exécution
 */
async function getResultsArray(queries, nbrExecutionMin = 0, nbrExecution = 1) {
  const pool = getConnexion(postgreConf);
  const conn = getConnexion(monetdbConf);
  await pool.connect();
  await conn.connect();

  const results = [];

  for (const q of queries) {
    for (let i = nbrExecutionMin; i < nbrExecution; i++) {
      const pgRes = await runQueryPostgre(pool, q.sql);
      const monetRes = await runQueryMonetdb(conn, q.sql);

      const normalized = normalizeQueryResults(pgRes, monetRes);

      results.push({
        q,
        pg: {
          durationMs: normalized.pg.durationMs,
          rowCount: normalized.pg.rowCount,
          sizeBytes: normalized.pg.sizeBytes,
        },
        monet: {
          durationMs: normalized.monet.durationMs,
          rowCount: normalized.monet.rowCount,
          sizeBytes: normalized.monet.sizeBytes,
        },
      });
    }
  }

  await pool.close();
  await conn.commit();
  await conn.close();

  return results;
}

module.exports = {
  getResultsArray,
  runQueryPostgre,
  runQueryMonetdb,
  normalizeQueryResults,
  compareQuery,
  compareMultipleQueries,
};
