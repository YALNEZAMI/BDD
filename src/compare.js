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
    const executions = [];

    for (let i = nbrExecutionMin; i < nbrExecution; i++) {
      // Exécution parallèle PostgreSQL + MonetDB
      executions.push(
        (async () => {
          const [pgRes, monetRes] = await Promise.all([
            runQueryPostgre(pool, q.sql),
            runQueryMonetdb(conn, q.sql),
          ]);

          return {
            q,
            pg: pgRes,
            monet: monetRes,
          };
        })()
      );
    }

    // Attendre toutes les exécutions pour cette requête
    const res = await Promise.all(executions);
    results.push(...res);
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
