// config.js
const N = 1000;
export const config = {
  server: {
    port: 3000,
    host: "localhost",
    protocol: "http",
    url: "localhost:3000",
    local_url: "http://localhost:3000",
  },
  postgreConf: {
    sgbd: "postgre",
    user: "postgres",
    host: "localhost",
    database: "demo", // postgresql db name (only lowercase names)
    password: "root",
    port: 5432,
  },

  monetdbConf: {
    sgbd: "monetdb",
    user: "monetdb",
    host: "localhost",
    database: "demo", //already existing monetdb db name, demo by default (only lowercase names)
    password: "monetdb",
    port: 50000,
  },

  insertDefaults: {
    nClients: N,
    nOrders: N,
    batchSize: N / 5,
  },
};
