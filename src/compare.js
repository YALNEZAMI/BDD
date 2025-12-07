import { config } from "./config.js";
import { getConnexion } from "./connexion.js";
/**
 *
 * @param {*} pool
 * @param {Array <{id:string ,label:string, sql:string, type:string}>} queries
 * @param {*} nbrExecution
 * @returns {Array <{
 * query: {id:string ,label:string, sql:string, type:string},
 * durationMs: number,
 * throughput: number,
 * }}
 */
async function runQueryPostgre(pool, queries, nbrExecution) {
  const result = [];
  for (let i = 0; i < nbrExecution; i++) {
    for (const query of queries) {
      const start = process.hrtime.bigint();

      const raw = await pool.execute(query.sql);

      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;
      const rowCount =
        raw.rowCount || raw.affectedRows || raw.rowCnt || raw.rows.length;
      let throughput = 0;
      if (durationMs && rowCount && durationMs != 0 && rowCount != 0) {
        throughput = Number((rowCount / durationMs).toFixed(3));
      }
      result.push({
        query,
        durationMs,
        throughput,
      });
    }
  }

  return result;
}

/**
 *
 * @param {*} pool
 * @param {Array <{id:string ,label:string, sql:string, type:string}>} queries
 * @param {*} nbrExecution
 * @returns {Array <{
 * query: {id:string ,label:string, sql:string, type:string},
 * durationMs: number,
 * throughput: number
 * }}
 */
async function runQueryMonetdb(conn, queries, nbrExecution) {
  const result = [];
  for (let i = 0; i < nbrExecution; i++) {
    for (const query of queries) {
      const start = process.hrtime.bigint();

      // Exécution principale

      const raw = await conn.execute(query.sql);

      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;
      const rowCount = raw.affectedRows || raw.rowCnt || raw.data.length;
      let throughput = 0;
      if (durationMs && rowCount && durationMs != 0 && rowCount != 0) {
        throughput = Number((rowCount / durationMs).toFixed(3));
      }
      result.push({
        query,
        durationMs,
        throughput,
      });
    }
  }

  return result;
}

/**
 * Exécute un tableau de requêtes plusieurs fois et retourne un tableau de résultats par exécution
 * @param {Array<{id:string ,label:string, sql:string, type:string}>} queries
 * @param {number} nbrExecution Nombre de fois à exécuter chaque requête
 * @return {Array<{
 * query: {id:string ,label:string, sql:string, type:string},
 * postgres: {engine:string, durationMs:number},
 * monetdb: {engine:string, durationMs:number}}}
 */
export const getResultsArray = async (queries, nbrExecution) => {
  const postgresDriver = getConnexion(config.postgreConf);

  const monetdbDriver = getConnexion(config.monetdbConf);

  await postgresDriver.connect();
  await monetdbDriver.connect();

  // Parallélisme inter-SGBD seulement
  const [pgResults, monetResults] = await Promise.all([
    runQueryPostgre(postgresDriver, queries, nbrExecution),
    runQueryMonetdb(monetdbDriver, queries, nbrExecution),
  ]);
  //fusionner les résultats
  const results = [];
  for (let i = 0; i < pgResults.length; i++) {
    results.push({
      query: pgResults[i].query,
      postgres: {
        engine: "postgres",
        durationMs: pgResults[i].durationMs,
        throughput: pgResults[i].throughput,
      },
      monetdb: {
        engine: "monetdb",
        durationMs: monetResults[i].durationMs,
        throughput: monetResults[i].throughput,
      },
    });
  }

  postgresDriver.close();
  monetdbDriver.close();
  return results;
};
