// populatePostgre.js
const { getConnexion } = require("./connexion");
const { postgreConf, insertDefaults } = require("./config");
const conf = postgreConf;

/**
 * Ensure the PostgreSQL database exists
 */
async function ensureDatabaseExistsPostgres(conf) {
  const { Client } = require("pg");
  const adminConf = { ...conf, database: "postgres" };
  const adminClient = new Client(adminConf);
  await adminClient.connect();
  try {
    const res = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [conf.database]
    );
    if (res.rowCount === 0) {
      console.log(
        `Postgres: database "${conf.database}" not found — creating...`
      );
      await adminClient.query(`CREATE DATABASE ${conf.database}`);
      console.log(`Postgres: database "${conf.database}" created.`);
    } else {
      console.log(`Postgres: database "${conf.database}" already exists.`);
    }
  } finally {
    await adminClient.end();
  }
}

/**
 * Create tables in the target database using a Pool
 */
async function createTablesPostgres(pool) {
  await pool.execute(`
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS clients;

    CREATE TABLE clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100),
      age INT
    );

    CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      client_id INT REFERENCES clients(id),
      product VARCHAR(100),
       amount NUMERIC(15,2)
    );
  `);
  console.log("Postgres: clients and orders tables created.");
}

/**
 * Insert clients from a pre-generated array
 * clients: [{name,email,age}, ...]
 */
async function fillClientsPostgres(pool, clients = [], batchSize = 200) {
  let inserted = 0;
  while (inserted < clients.length) {
    const chunk = clients.slice(inserted, inserted + batchSize);
    const placeholders = [];
    const values = [];
    chunk.forEach((c, i) => {
      const base = i * 3;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      values.push(c.name, c.email, c.age);
    });
    const sql = `INSERT INTO clients (name, email, age) VALUES ${placeholders.join(
      ","
    )}`;
    await pool.execute(sql, values);
    inserted += chunk.length;
  }
}

/**
 * Insert orders from a pre-generated array
 * orders: [{clientIndex, product, amount}, ...]
 * clientIndex corresponds to index in the clients array inserted above
 */
async function fillOrdersPostgres(pool, orders = [], batchSize = 200) {
  const res = await pool.execute("SELECT id FROM clients ORDER BY id");
  const clientIds = res.rows.map((r) => r.id);

  let inserted = 0;
  while (inserted < orders.length) {
    const chunk = orders.slice(inserted, inserted + batchSize);
    const placeholders = [];
    const values = [];
    chunk.forEach((o, i) => {
      const base = i * 3;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      values.push(clientIds[o.clientIndex], o.product, o.amount);
    });
    const sql = `INSERT INTO orders (client_id, product, amount) VALUES ${placeholders.join(
      ","
    )}`;
    await pool.execute(sql, values);
    inserted += chunk.length;
  }
}

/**
 * Main function: population des clients et orders
 */
async function populatePostgre(
  clients = [],
  orders = [],
  batchSize = insertDefaults.batchSize
) {
  if (!conf) return { ok: false, message: "Postgres: no config found." };

  await ensureDatabaseExistsPostgres(conf);

  const pool = getConnexion(conf);
  try {
    await createTablesPostgres(pool);
    await fillClientsPostgres(pool, clients, batchSize);
    await fillOrdersPostgres(pool, orders, batchSize);
  } finally {
    await pool.close();
  }

  return {
    ok: true,
    message: `Postgres: populated ${clients.length} clients and ${orders.length} orders.`,
  };
}

module.exports = { populatePostgre, fillClientsPostgres, fillOrdersPostgres };
