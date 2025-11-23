// export.js
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

// === public A LA RACINE DU PROJET ===
const PUBLIC_DIR = path.join(__dirname, "..", "public");
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

/**
 * @param {Array} results - tableau de {pg:{durationMs}, monet:{durationMs}}
 * @param {string} type - "OLTP" ou "OLAP"
 * @param {number} jump - échantillonnage
 */
function exportCumulativeGraphData(results, object) {
  const csvLines = ["NumExecutedQueries,PostgreSQL,MonetDB"];
  const jump = object.jump || 1;
  let pgCum = 0;
  let monetCum = 0;

  let resultIndex = 0; // index dans results[]
  for (let count = object.nbrStart; count <= object.nbrEnd; count += jump) {
    if (resultIndex >= results.length) break;
    const r = results[resultIndex];
    pgCum += r.pg.durationMs;
    monetCum += r.monet.durationMs;

    csvLines.push(`${count},${pgCum.toFixed(2)},${monetCum.toFixed(2)}`);

    resultIndex += jump;
  }

  const outPath = path.join(PUBLIC_DIR, `result.csv`);
  fs.writeFileSync(outPath, csvLines.join("\n"));
  console.log(`Cumulative CSV saved at ${outPath}`);
  return outPath;
}

const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

async function createGraphFromCSV(csvFile, outputFileName) {
  const content = fs.readFileSync(csvFile);
  const records = parse(content, { columns: true });

  const labels = records.map((r) => r.NumExecutedQueries);
  const pgData = records.map((r) => parseFloat(r.PostgreSQL));
  const monetData = records.map((r) => parseFloat(r.MonetDB));

  const configuration = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "PostgreSQL",
          data: pgData,
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          fill: false,
        },
        {
          label: "MonetDB",
          data: monetData,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          fill: false,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Comparaison des performances entre requêtes OLTP/OLAP",
          font: { size: 20 },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Nombre de requêtes exécutées" },
        },
        y: {
          title: { display: true, text: "Durée (ms)" },
          beginAtZero: true,
        },
      },
    },
  };

  const image = await chartJSNodeCanvas.renderToBuffer(configuration);

  const outPath = path.join(PUBLIC_DIR, outputFileName);
  fs.writeFileSync(outPath, image);

  console.log("Graphique généré dans", outPath);
  return outputFileName;
}

module.exports = {
  exportCumulativeGraphData,
  createGraphFromCSV,
  PUBLIC_DIR,
};
