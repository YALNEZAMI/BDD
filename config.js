// config.js
module.exports = {
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
    nClients: 2000,
    nOrders: 2000,
    batchSize: 200,
  },
};
