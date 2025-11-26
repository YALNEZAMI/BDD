import { checkConnections } from "./connexion.js";
import { populateMonet } from "./populateMonetdb.js";
import { populatePostgre } from "./populatePostgre.js";
import { getData } from "./generateData.js";
import { config } from "./config.js";
import { exportCumulativeGraphData, createGraphFromCSV } from "./export.js";
import { getResultsArray } from "./compare.js";

/**
 *
 * verification des ports et connections
 * verification des bases de données et creation de celle de postgre seulement !!!!
 * creation des tables
 * population des tables
 */
export const firstSetUp = async () => {
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
    const data = getData(
      config.insertDefaults.nClients,
      config.insertDefaults.nOrders
    );
    // Crée le pool **après** s'assurer que la base existe
    const populatePostgreResult = await populatePostgre(
      data.clients,
      data.orders,
      config.insertDefaults.batchSize
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
      config.insertDefaults.batchSize
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
};
/**
 * @param params:{
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
 * @return {Array <{ok: boolean, message: string, url: string, csvPath: string}>}
 *
 */
export const traiter = async (params) => {
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
    const fileName = await createGraphFromCSV(
      CSV,
      "result" + ".png",
      getMajorType(params.queries)
    );
    let split = CSV.split("/");
    if (split.length == 1) {
      split = CSV.split("\\");
    }
    const csvName = split[split.length - 1];

    return {
      ok: true,
      message: " Traitement terminé",
      url: config.server.local_url + "/bin/" + fileName,
      csvPath: config.server.local_url + "/bin/" + csvName,
    };
  } catch (err) {
    console.error("Erreur :", err);
  }
};
/**
 * @param queries
 * @return string le type majoritaire dans queries => OLTP | OLAP
 */
function getMajorType(queries) {
  let oltp = 0;
  let olap = 0;
  for (const q of queries) {
    if (q.type.toUpperCase() == "OLTP") {
      oltp++;
    } else if (q.type.toUpperCase() == "OLAP") {
      olap++;
    }
  }
  if (oltp > olap) {
    return "OLTP";
  } else if (oltp < olap) {
    return "OLAP";
  } else {
    return "OLAP/OLTP";
  }
}
