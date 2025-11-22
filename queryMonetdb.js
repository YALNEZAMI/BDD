const { Connection } = require("monetdb");
const { monetdbConf } = require("./config");
const { getConnexion } = require("./connexion");
const conf = monetdbConf;
/**
 * Mesure le temps d'exécution d'une requête et retourne les résultats.
 */
async function runQuery(conn, sql) {
  const start = process.hrtime.bigint();
  const res = await conn.execute(sql);
  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;

  // Approximation de la taille en mémoire des résultats
  const sizeBytes = res.data ? JSON.stringify(res.data).length : 0;

  return {
    rows: res.data || [],
    rowCount: res.data.length,
    durationMs,
    sizeBytes,
  };
}

async function main() {
  const conn = getConnexion(conf);

  await conn.connect();

  try {
    console.log("MonetDB: Running OLTP queries...");
    let result = await runQuery(
      conn,
      "UPDATE clients SET age = age + 1 WHERE age < 30"
    );
    console.log(
      `Updated rows: ${result.rowCount}, time: ${result.durationMs.toFixed(
        2
      )}ms`
    );

    console.log("MonetDB: Running OLAP queries...");
    result = await runQuery(
      conn,
      `
      SELECT age, COUNT(*) as n_clients, AVG(amount) as avg_order
      FROM clients
      LEFT JOIN orders ON clients.id = orders.client_id
      GROUP BY age
      ORDER BY age
      LIMIT 1000
    `
    );
    console.log(
      `Rows returned: ${result.rowCount}, approx size: ${
        result.sizeBytes
      } bytes, time: ${result.durationMs.toFixed(2)}ms`
    );
  } finally {
    await conn.close();
  }
}

module.exports = { runQuery, main };
