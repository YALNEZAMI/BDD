function normalizeConnexion(conn, engine) {
  if (engine === "postgre") {
    return {
      type: "postgre",
      raw: conn,
      connect: async () => {}, // Pool se connecte automatiquement
      execute: (sql, params) => conn.query(sql, params),
      close: () => conn.end(),
    };
  } else if (engine === "monetdb") {
    return {
      type: "monetdb",
      raw: conn,
      connect: () => conn.connect(),
      execute: (sql) => conn.execute(sql),
      close: () => conn.close(),
      commit: () => conn.commit(),
    };
  }
}
module.exports = {
  normalizeConnexion,
};
