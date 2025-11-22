const { postgreConf, monetdbConf } = require("./config");
const { getConnexion } = require("./connexion");
const { normalizeRawResult } = require("./utils.js");

const CONF_PG = postgreConf;
const CONF_MONET = monetdbConf;
const QUERIES = [
  {
    id: "oltp_update_age",
    label: "OLTP - Update age < 30 (+1)",
    sql: `UPDATE clients SET age = age + 1 WHERE age < 30;`,
    type: "oltp",
  },
  {
    id: "oltp_insert_sample",
    label: "OLTP - Insert sample client (temp)",
    sql: `INSERT INTO clients (name,email,age) VALUES ('__SAMPLE__','sample@example.com',42); DELETE FROM clients WHERE email = 'sample@example.com';`,
    type: "oltp",
  },
  {
    id: "olap_group_by_age",
    label: "OLAP - Group by age (count + avg)",
    sql: `
      SELECT c.age AS age, COUNT(*) AS n_clients, AVG(o.amount) AS avg_order
      FROM clients c
      LEFT JOIN orders o ON c.id = o.client_id
      GROUP BY c.age
      ORDER BY age
      LIMIT 1000;
    `,
    type: "olap",
  },
  {
    id: "olap_top_products",
    label: "OLAP - Top products by sum(amount)",
    sql: `
      SELECT product, SUM(amount) AS total_amount, COUNT(*) AS n_orders
      FROM orders
      GROUP BY product
      ORDER BY total_amount DESC
      LIMIT 50;
    `,
    type: "olap",
  },
];
/**
 * Exécute la requête via ton wrapper unifié et renvoie:
 * { ok, durationMs (client), serverTimeMs (optionnel), rows, rowCount, sizeBytes, error }
 *
 * - wrapper doit avoir: wrapper.type === 'postgre'|'monetdb' ; wrapper.execute(sql, params)
 */
async function runQuery(wrapper, sql, params = []) {
  const start = process.hrtime.bigint();
  try {
    const raw = await wrapper.execute(sql, params);
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;

    const normalized = normalizeRawResult(raw, wrapper.type);
    return {
      ok: true,
      durationMs,
      serverTimeMs: normalized.serverTimeMs, // undefined si non dispo
      rows: normalized.rows,
      rowCount: normalized.rowCount,
      sizeBytes: normalized.sizeBytes,
      raw: normalized.raw,
    };
  } catch (err) {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    return {
      ok: false,
      error: err.message || String(err),
      durationMs,
      rows: [],
      rowCount: 0,
      sizeBytes: 0,
    };
  }
}

async function compare() {
  const pool = getConnexion(CONF_PG);
  const conn = getConnexion(CONF_MONET);
  pool.connect();
  conn.connect();

  // console.log("pg form res");
  // const pgResult = await runQuery(pool, QUERIES[0].sql);
  // console.log("monet form res");
  // const monetResult = await runQuery(conn, QUERIES[0].sql);
  for (const q of QUERIES) {
    // console.log("pg form res");
    const pgResult = await runQuery(pool, q.sql);
    // console.log("monet form res");
    const monetResult = await runQuery(conn, q.sql);
    console.log(
      `Query: ${q.label} (${q.type})\n` +
        `Postgres: ${pgResult.rowCount} rows, ${pgResult.durationMs.toFixed(
          2
        )}ms\n` +
        `MonetDB: ${
          monetResult.rowCount
        } rows, ${monetResult.durationMs.toFixed(2)}ms\n`
    );
  }
  await pool.close();
  await conn.close();
}

module.exports = { runQuery, compare };
