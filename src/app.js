// check-ports.js

const { checkConnections } = require("./connexion.js");
const { populateMonet } = require("./populateMonetdb.js");
const { populatePostgre } = require("./populatePostgre.js");
const { getResultsArray } = require("./compare");
const { getData } = require("./generateData.js");
const { insertDefaults, server } = require("./config.js");
const {
  exportCumulativeGraphData,
  createGraphFromCSV,
} = require("./export.js");

/**
 *
 * verification des ports et connections
 * verification des bases de données
 * creation des tables
 * population des tables
 */
async function firstSetUp() {
  console.log("firstSetUp");

  try {
    console.log("\n____CHECK CONNECTIONS_____");
    const bothConnected = await checkConnections();
    if (!bothConnected) {
      console.error(
        "Un ou les deux sgbd ne sont pas connecté (démarrez les serveur et assurez vous de la conformité des ports)"
      );
      return;
    }
    console.log("\n_____POSTGRE: CREATE BD,TABLES,POPULATING_____");
    const data = getData(insertDefaults.nClients, insertDefaults.nOrders);
    // Crée le pool **après** s'assurer que la base existe
    const populatePostgreResult = await populatePostgre(
      data.clients,
      data.orders,
      insertDefaults.batchSize
    );
    if (populatePostgreResult.ok) {
      console.log(populatePostgreResult.message);
    } else {
      console.error("Error: " + populatePostgreResult.message);
    }
    console.log("\n____MONETDB: CREATE TABLES,POPULATING_____");

    const populateMonetResult = await populateMonet(
      data.clients,
      data.orders,
      insertDefaults.batchSize
    );
    if (populateMonetResult.ok) {
      console.log(populateMonetResult.message);
    } else {
      console.error("Error: " + populateMonetResult.message);
    }
    return true;
  } catch (err) {
    console.error("Erreur :", err);
    return false;
  }
}
/**
 * params:{
 * nbrStart: int// à partir de quelle nbr de requetes commencer
 * nbrEnd: int// jusqu'à combien de requetes aller
 * queries: {
 *  id: string//id query
 *  label: string//label query
 *  sql: string// requete syntaxe sql
 *  type: string// OLTP | OLAP
 * }[]
 * jump:int //espacement du nombre de requetes
 * }
 *
 */
async function traiter(params) {
  try {
    console.log("\n____PERFORMING QUERIES_____");
    console.log("processing queries...");
    const res = await getResultsArray(
      params.queries,
      params.nbrStart,
      params.nbrEnd
    );
    // console.log(res);

    console.log("creating csv file...");
    const CSV = exportCumulativeGraphData(res, params);
    console.log("creating graphique chart...");
    const fileName = await createGraphFromCSV(CSV, "result" + ".png");
    let split = CSV.split("/");
    if (split.length == 1) {
      split = CSV.split("\\");
    }
    const csvName = split[split.length - 1];

    return {
      ok: true,
      message: " Traitement terminé",
      url: server.local_url + "/bin/" + fileName,
      csvPath: server.local_url + "/bin/" + csvName,
    };
  } catch (err) {
    console.error("Erreur :", err);
  }
}

module.exports = { firstSetUp, traiter };
