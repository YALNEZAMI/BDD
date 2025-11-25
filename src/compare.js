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
 * @return {Array<{q: {id:string ,label:string, sql:string, type:string}, pg: {engine:string, durationMs:number}, monet: {engine:string, durationMs:number}}}
 */
async function getResultsArray(queries, nbrExecutionMin = 0, nbrExecution = 2) {
  const pool = getConnexion(postgreConf);

  const conn = getConnexion(monetdbConf);

  await pool.connect();
  await conn.connect();

  const results = [];

  for (const q of queries) {
    for (let i = nbrExecutionMin; i < nbrExecution; i++) {
      // Parallélisme inter-SGBD seulement
      const [pgRes, monetRes] = await Promise.all([
        runQueryPostgre(pool, q.sql), // 1 seule requête PG à la fois
        runQueryMonetdb(conn, q.sql), // peut s'exécuter en parallèle
      ]);

      results.push({ q, pg: pgRes, monet: monetRes });
    }
  }

  await pool.close();
  await conn.close();

  return results;
}

module.exports = {
  getResultsArray,
  runQueryPostgre,
  runQueryMonetdb,
};
