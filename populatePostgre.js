// populatePostgre.js
const { Client, Pool } = require("pg");
const { faker } = require("@faker-js/faker");
const { postgreConf, insertDefaults } = require("./config");
const { getConnexion } = require("./connexion");

const conf = postgreConf;
/**
 * Ensure the PostgreSQL database (postgreConf.database) exists by connecting
 * to the 'postgres' admin database and issuing CREATE DATABASE if missing.
 */
async function ensureDatabaseExistsPostgres(conf) {
  const adminConf = { ...conf, database: "postgres" }; // connect to admin DB
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
 * Create tables in the target database using a Pool.
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
      amount NUMERIC(10,2)
    );
  `);
  console.log("Postgres: clients and orders tables created.");
}

/**
 * Insert n clients using parameterized batched INSERT to avoid huge SQL and injection.
 */
async function fillClientsPostgres(pool, n = 1000, batchSize = 200) {
  let inserted = 0;
  while (inserted < n) {
    const chunkCount = Math.min(batchSize, n - inserted);
    const values = [];
    const placeholders = [];
    for (let i = 0; i < chunkCount; i++) {
      const base = i * 3;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      values.push(
        faker.person.fullName(),
        faker.internet.email(),
        faker.number.int({ min: 18, max: 80 })
      );
    }
    const sql = `INSERT INTO clients (name, email, age) VALUES ${placeholders.join(
      ","
    )}`;
    await pool.execute(sql, values);
    inserted += chunkCount;
  }
}

/**
 * Insert n orders by first fetching client ids then inserting batches.
 */
async function fillOrdersPostgres(pool, n = 1000, batchSize = 200) {
  const res = await pool.execute("SELECT id FROM clients");
  const ids = res.rows.map((r) => r.id);
  if (ids.length === 0)
    throw new Error("Postgres: no clients found to create orders");

  let inserted = 0;
  while (inserted < n) {
    const chunkCount = Math.min(batchSize, n - inserted);
    const placeholders = [];
    const values = [];
    for (let i = 0; i < chunkCount; i++) {
      const clientId = ids[Math.floor(Math.random() * ids.length)];
      const product = faker.commerce.productName();
      const amount = faker.number.int({ min: 10, max: 1000 });
      // create placeholders and add values
      const base = i * 3;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      values.push(clientId, product, amount);
    }
    const sql = `INSERT INTO orders (client_id, product, amount) VALUES ${placeholders.join(
      ","
    )}`;
    await pool.execute(sql, values);
    inserted += chunkCount;
  }
}

/**
 * Main exported function
 */
async function populatePostgre(
  nClients = insertDefaults.nClients,
  nOrders = insertDefaults.nOrders,
  batchSize = insertDefaults.batchSize
) {
  if (!conf) {
    return { ok: false, message: "Postgres: no config found." };
  }
  // ensure DB exists
  await ensureDatabaseExistsPostgres(conf);

  // connect to target DB with Pool
  const pool = getConnexion(conf);
  try {
    await createTablesPostgres(pool);
    await fillClientsPostgres(pool, nClients, batchSize);
    await fillOrdersPostgres(pool, nOrders, batchSize);
  } finally {
    await pool.close();
  }
  return {
    ok: true,
    message:
      "Postgres: populated " + nClients + " clients et " + nOrders + " orders.",
  };
}

module.exports = { populatePostgre };
