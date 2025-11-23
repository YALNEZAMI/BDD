const { postgreConf, monetdbConf } = require("./config");
const { getConnexion } = require("./connexion");

/**
 * Exécute une requête sur PostgreSQL et retourne métriques enrichies.
 */
async function runQueryPostgre(pool, sql, params = []) {
  const start = process.hrtime.bigint();
  const result = {
    engine: "postgre",
    durationMs: 0,
  };

  // Exécution de la requête
  const raw = await pool.execute(sql, params);
  const end = process.hrtime.bigint();
  result.durationMs = Number(end - start) / 1e6;

  return result;
}

/**
 * Exécute une requête sur MonetDB et retourne métriques enrichies.
 */
async function runQueryMonetdb(conn, sql) {
  const start = process.hrtime.bigint();
  const result = {
    engine: "monetdb",
    durationMs: 0,
  };

  // Exécution principale
  const raw = await conn.execute(sql);
  const end = process.hrtime.bigint();
  result.durationMs = Number(end - start) / 1e6;

  return result;
}

/**
 * Exécute un tableau de requêtes plusieurs fois et retourne un tableau de résultats par exécution
 * @param {Array<{id:string ,label:string, sql:string, type:string}>} queries
 * @param {number} nbrExecution Nombre de fois à exécuter chaque requête
 * @returns {Array} tableau de { q, pg, monet } pour chaque exécution
 */
async function getResultsArray(queries, nbrExecutionMin = 0, nbrExecution = 2) {
  const pool = getConnexion(postgreConf);
  const conn = getConnexion(monetdbConf);
  await pool.connect();
  await conn.connect();

  const results = [];

  for (const q of queries) {
    for (let i = nbrExecutionMin; i < nbrExecution; i++) {
      const pgRes = await runQueryPostgre(pool, q.sql);
      const monetRes = await runQueryMonetdb(conn, q.sql);

      results.push({
        q,
        pg: pgRes,
        monet: monetRes,
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
};
