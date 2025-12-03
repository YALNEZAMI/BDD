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
 * @return {ok: boolean, message: string}
 */
export const firstSetUp = async () => {
  let message = "";
  try {
    const connexion = await checkConnections();

    if (!connexion.ok) {
      return { ok: false, message: connexion.notConnected };
    } else {
      message += "Les deux sgbd sont bien connectés.\n";
    }
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
      message += "L'initialisation de PostgreSQL a réussi.\n";
    } else {
      console.error("Error: " + populatePostgreResult.message);
      return { ok: false, message: populatePostgreResult.message };
    }

    const populateMonetResult = await populateMonet(
      data.clients,
      data.orders,
      config.insertDefaults.batchSize
    );
    if (populateMonetResult.ok) {
      message += "L'initialisation de MonetDB a réussi.\n";
    } else {
      return { ok: false, message: populateMonetResult.message };
    }
    return { ok: true, message };
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
    console.log("Processing queries...");
    const res = await getResultsArray(
      params.queries,
      params.nbrStart,
      params.nbrEnd
    );

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
    const fileName_throughput = await createBarChartFromCSV_throughput(
      CSV_graphThroughput.path,
      png_throughput_fileName
    );

    const response = {
      ok: true,
      isBarsNulls: CSV_graphThroughput.isNull,
      ignored: CSV_graphThroughput.ignored,
      message: " Traitement terminé",
      png_timing: config.server.local_url + "/bin/" + png_timing_fileName,
      csv_timing: config.server.local_url + "/bin/" + csv_timing_fileName,
      png_throughput:
        config.server.local_url + "/bin/" + png_throughput_fileName,
      csv_throughput:
        config.server.local_url + "/bin/" + csv_throughput_fileName,
    };

    return response;
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
