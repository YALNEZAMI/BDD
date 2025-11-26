// config.js
const N = 1000;
const SGBD_SERVICES_DOCKERIZED = false;
const APP_DOCKERIZED = false;
export const config = {
  server: {
    port: 3000,
    host: "localhost",
    protocol: "http",
    url: "localhost:3000",
    local_url: "http://localhost:3000",
  },
  postgreConf: {
    sgbd: "postgres",
    user: "postgres",
    host: SGBD_SERVICES_DOCKERIZED
      ? "postgres"
      : APP_DOCKERIZED
      ? "host.docker.internal"
      : "localhost",
    database: "demo", // postgresql db name (only lowercase names)
    password: "root",
    port: 5432,
  },

  monetdbConf: {
    sgbd: "monetdb",
    user: "monetdb",
    host: SGBD_SERVICES_DOCKERIZED
      ? "monetdb"
      : APP_DOCKERIZED
      ? "host.docker.internal"
      : "localhost",
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
