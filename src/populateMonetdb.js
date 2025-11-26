import { config } from "./config.js";
import { getConnexion } from "./connexion.js";

/**
 * @param conn driver resultat de getConnexion() dans connexion.js
 * Create tables in MonetDB
 */
async function createTablesMonet(conn) {
  console.log("before monet tables creation");

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
      amount NUMERIC(15,2)
    );
  `);
  console.log("MonetDB: clients and orders tables created.");
}

/**
 * Insert clients from a pre-generated array
 * clients: [{name,email,age}, ...]
 */
async function fillClientsMonet(conn, clients = [], batchSize = 200) {
  for (let start = 0; start < clients.length; start += batchSize) {
    const values = clients
      .slice(start, start + batchSize)
      .map(
        (c) =>
          `('${c.name.replace(/'/g, "''")}', '${c.email.replace(
            /'/g,
            "''"
          )}', ${c.age})`
      );
    await conn.execute(
      `INSERT INTO clients (name, email, age) VALUES ${values.join(",")};`
    );
  }
}

/**
 * Insert orders from a pre-generated array
 * orders: [{clientIndex, product, amount}, ...]
 * clientIndex corresponds to index in the clients array inserted above
 */
async function fillOrdersMonet(conn, orders = [], batchSize = 200) {
  // Fetch actual client IDs from DB (preserving the insertion order)
  const result = await conn.execute("SELECT id FROM clients ORDER BY id;");
  const clientIds = result.data.map((row) => row[0]);

  for (let start = 0; start < orders.length; start += batchSize) {
    const values = orders.slice(start, start + batchSize).map((o) => {
      const client_id = clientIds[o.clientIndex];
      return `(${client_id}, '${o.product.replace(/'/g, "''")}', ${o.amount})`;
    });
    await conn.execute(
      `INSERT INTO orders (client_id, product, amount) VALUES ${values.join(
        ","
      )};`
    );
  }
}

/**
 * Main function: population des client et orders
 */
export const populateMonet = async (
  clients,
  orders,
  batchSize = config.insertDefaults.batchSize
) => {
  const conn = getConnexion(config.monetdbConf);

  await conn.connect();

  await createTablesMonet(conn);

  await fillClientsMonet(conn, clients, batchSize);

  await fillOrdersMonet(conn, orders, batchSize);
  await conn.close();

  return {
    ok: true,
    message: `MonetDB: populated ${clients.length} clients and ${orders.length} orders.`,
  };
};
