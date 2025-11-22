const { faker } = require("@faker-js/faker");
const { monetdbConf, insertDefaults } = require("./config");
const { getConnexion } = require("./connexion");

const conf = monetdbConf;
/**
 * Create tables in MonetDB
 */
async function createTablesMonet(conn) {
  await conn.execute(`
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS clients;

    CREATE TABLE clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name STRING,
      email STRING,
      age INT
    );

    CREATE TABLE orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT REFERENCES clients(id),
      product STRING,
      amount DECIMAL(10,2)
    );
  `);
  console.log("MonetDB: clients and orders tables created.");
}

/**
 * Insert clients in batches
 */
async function fillClientsMonet(
  conn,
  n = insertDefaults.nClients,
  batchSize = insertDefaults.batchSize
) {
  for (let start = 0; start < n; start += batchSize) {
    const values = [];
    for (let i = start; i < Math.min(start + batchSize, n); i++) {
      const name = faker.person.fullName().replace(/'/g, "''");
      const email = faker.internet.email().replace(/'/g, "''");
      const age = faker.number.int({ min: 18, max: 80 });
      values.push(`('${name}', '${email}', ${age})`);
    }

    await conn.execute(
      `INSERT INTO clients (name, email, age) VALUES ${values.join(",")};`
    );
  }
}

/**
 * Insert orders in batches
 */
async function fillOrdersMonet(
  conn,
  n = insertDefaults.nOrders,
  batchSize = insertDefaults.batchSize
) {
  // Get client IDs first
  const result = await conn.execute("SELECT id FROM clients;");
  const clientIds = result.data.map((row) => row[0]);

  if (clientIds.length === 0) {
    console.warn("No clients found — skipping orders insertion.");
    return;
  }

  for (let start = 0; start < n; start += batchSize) {
    const values = [];
    for (let i = start; i < Math.min(start + batchSize, n); i++) {
      const client_id = clientIds[Math.floor(Math.random() * clientIds.length)];
      const product = faker.commerce.productName().replace(/'/g, "''");
      const amount = faker.number.int({ min: 10, max: 1000 });
      values.push(`(${client_id}, '${product}', ${amount})`);
    }

    await conn.execute(
      `INSERT INTO orders (client_id, product, amount) VALUES ${values.join(
        ","
      )};`
    );
  }
}

/**
 * Main function
 */
async function populateMonet(
  nClients = insertDefaults.nClients,
  nOrders = insertDefaults.nOrders,
  batchSize = insertDefaults.batchSize
) {
  const conn = getConnexion(conf);

  try {
    await conn.connect();
    console.log(`MonetDb: database "${conf.database}" already exists `);
    await createTablesMonet(conn);
    await fillClientsMonet(conn, nClients, batchSize);
    await fillOrdersMonet(conn, nOrders, batchSize);
  } catch (err) {
    // console.error("Error populating MonetDB:", err);
    return {
      ok: false,
      message: "monetdb: " + conf.database + " doit être créer préalablement !",
    };
    // await conn.rollback();
  } finally {
    await conn.close();
  }
  return {
    ok: true,
    message:
      "Monetdb: populated " + nClients + " clients et " + nOrders + " orders.",
  };
}

module.exports = { populateMonet };
