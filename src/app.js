import { checkConnections } from "./connexion.js";
import { populateMonet } from "./populateMonetdb.js";
import { populatePostgre } from "./populatePostgre.js";
import { getData } from "./generateData.js";
import { config } from "./config.js";
import {
  exportCumulativeGraphData_graphTiming,
  createGraphFromCSV_graphTiming,
  exportCumulativeGraphData_graphThroughput,
  createBarChartFromCSV_throughput,
} from "./export.js";
import { getResultsArray } from "./compare.js";

/**
 *
 * verification des ports et connections
 * verification des bases de données et creation de celle de postgre seulement !!!!
 * creation des tables
 * population des tables
 */
export const firstSetUp = async () => {
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
    return { ok: true, message: "setup réussi" };
  } catch (err) {
    console.error("Erreur :", err);
    return { ok: false, message: err };
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
    const csv_timing_fileName = "result_timing.csv";
    const csv_throughput_fileName = "result_throughput.csv";
    const png_timing_fileName = "graphe_timing.png";
    const png_throughput_fileName = "graphe_throughput.png";
    const CSV_graphTiming = exportCumulativeGraphData_graphTiming(
      res,
      params,
      csv_timing_fileName
    );
    const CSV_graphThroughput = exportCumulativeGraphData_graphThroughput(
      res,
      params,
      csv_throughput_fileName
    );

    console.log("creating graphique chart...");
    const fileName_graphTiming = await createGraphFromCSV_graphTiming(
      CSV_graphTiming,
      png_timing_fileName,
      getMajorType(params.queries)
    );
    const fileName_throughput = createBarChartFromCSV_throughput(
      CSV_graphThroughput,
      png_throughput_fileName,
      getMajorType(params.queries)
    );

    return {
      ok: true,
      message: " Traitement terminé",
      png_timing: config.server.local_url + "/bin/" + png_timing_fileName,
      csv_timing: config.server.local_url + "/bin/" + csv_timing_fileName,
      png_throughput:
        config.server.local_url + "/bin/" + png_throughput_fileName,
      csv_throughput:
        config.server.local_url + "/bin/" + csv_throughput_fileName,
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
