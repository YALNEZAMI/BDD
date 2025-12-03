import path from "path";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { fileURLToPath } from "url";
import csv from "csv-parser";

const width = 600;
const height = 600;
const backgroundColor = "white";

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

// === public A LA RACINE DU PROJET ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, "..", "public", "bin");
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

/**
 * @param {Array} results - tableau de {pg:{durationMs,throughput}, monet:{durationMs,throughput}}
 * @param {type:"OLTP" | "OLAP", jump:number} param -
 */
export const exportCumulativeGraphData_graphTiming = (
  results,
  params,
  fileName
) => {
  const csvLines = ["NumExecutedQueries,PostgreSQL,MonetDB"];
  const jump = params.jump || 1;
  let pgCum = 0;
  let monetCum = 0;

  let resultIndex = 0; // index dans results[]
  for (let count = params.nbrStart; count <= params.nbrEnd; count += jump) {
    if (resultIndex >= results.length) break;
    const r = results[resultIndex];
    pgCum += r.pg.durationMs;
    monetCum += r.monetdb.durationMs;

    csvLines.push(`${count},${pgCum.toFixed(2)},${monetCum.toFixed(2)}`);

    resultIndex += jump;
  }

  const outPath = path.join(PUBLIC_DIR, fileName);
  fs.writeFileSync(outPath, csvLines.join("\n"));
  console.log(`Cumulative CSV saved_timing at ${outPath}`);
  return outPath;
};
/**
 * @param {Array} results - tableau de {pg:{durationMs,throughput}, monet:{durationMs,throughput}}
 * @param {type:"OLTP" | "OLAP" } params
 * @return {path: string, isNull: boolean} path du fichier créé, isNull si toutes les valeur sont nulls
 */
export const exportCumulativeGraphData_graphThroughput = (
  results,
  params,
  fileName
) => {
  const csvLines = ["label,PostgreSQL,MonetDB"];
  let pg_count_olap = 0;
  let pg_sum_olap = 0;
  let monetdb_count_olap = 0;
  let monetdb_sum_olap = 0;
  let pg_count_oltp = 0;
  let pg_sum_oltp = 0;
  let monetdb_count_oltp = 0;
  let monetdb_sum_oltp = 0;
  results.map((r) => {
    if (r.q.type == "OLAP") {
      if (r.pg.throughput) {
        pg_count_olap++;
        pg_sum_olap += r.pg.throughput;
      }
      if (r.monetdb.throughput) {
        monetdb_count_olap++;
        monetdb_sum_olap += r.monetdb.throughput;
      }
    }

    if (r.q.type == "OLTP") {
      if (r.pg.throughput) {
        pg_count_oltp++;
        pg_sum_oltp += r.pg.throughput;
      }
      if (r.monetdb.throughput) {
        monetdb_count_oltp++;
        monetdb_sum_oltp += r.monetdb.throughput;
      }
    }
  });
  let ignoreOlap = true;
  let ignoreOltp = true;
  if (!(pg_count_olap == 0 || monetdb_count_olap == 0)) {
    ignoreOlap = false;
    csvLines.push(
      `OLAP, ${Number((pg_sum_olap / pg_count_olap).toFixed(3))}, ${Number(
        (monetdb_sum_olap / monetdb_count_olap).toFixed(3)
      )}`
    );
  }
  if (!(pg_count_oltp == 0 || monetdb_count_oltp == 0)) {
    ignoreOltp = false;
    csvLines.push(
      `OLTP, ${Number((pg_sum_oltp / pg_count_oltp).toFixed(3))}, ${Number(
        (monetdb_sum_oltp / monetdb_count_oltp).toFixed(3)
      )}`
    );
  }

  const outPath = path.join(PUBLIC_DIR, fileName);
  fs.writeFileSync(outPath, csvLines.join("\n"));
  console.log(`Cumulative CSV_throughput saved at ${outPath}`);
  return {
    path: outPath,
    isNull: ignoreOlap && ignoreOltp,
    ignored: ignoreOlap ? "OLAP" : "OLTP",
  };
};

/**
 * @param {string} csvFile - chemin vers le fichier CSV
 * @param {string} outputFileName - nom du fichier de sortie
 * @param {string} queryMajorType - "OLTP" ou "OLAP"
 * @return créer un graphique à partir du fichier CSV et le sauvegarde dans le dossier public/bin
 */
export const createGraphFromCSV_graphTiming = async (
  csvFile,
  outputFileName,
  queryMajorType
) => {
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
          text:
            "PostgreSQL vs MonetDB: délais de traitement pour requêtes " +
            queryMajorType,
          font: { size: 20 },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Nombre de requêtes exécutées",
            font: { family: "Arial", weight: "bold" },
          },
        },
        y: {
          title: { display: true, text: "Durée (ms)" },
          beginAtZero: true,
          font: { family: "Arial", weight: "bold" },
        },
      },
    },
  };

  const image = await chartJSNodeCanvas.renderToBuffer(configuration);

  const outPath = path.join(PUBLIC_DIR, outputFileName);
  fs.writeFileSync(outPath, image);

  console.log("Graphique généré dans", outPath);
  return outputFileName;
};
/**
 * @param {string} csvFile - chemin vers le fichier CSV
 * @param {string} outputFileName - nom du fichier de sortie
 * @return créer un graphique à partir du fichier CSV et le sauvegarde dans le dossier public/bin
 */
export const createBarChartFromCSV_throughput = async (
  csvPath,
  outputFileName
) => {
  // stockage temporaire des données
  const labels = [];
  const pg_values = [];
  const monetdb_values = [];

  // lecture du CSV - collecte brute
  const rows = await new Promise((resolve, reject) => {
    const out = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => out.push(row))
      .on("end", () => resolve(out))
      .on("error", (err) => reject(err));
  });

  // Détection du format du CSV
  // Format recommandé : columns = label,PostgreSQL,MonetDB
  if (
    rows.length > 0 &&
    "PostgreSQL" in rows[0] &&
    "MonetDB" in rows[0] &&
    "label" in rows[0]
  ) {
    for (const r of rows) {
      labels.push(String(r.label));
      pg_values.push(Number(r.PostgreSQL) || 0);
      monetdb_values.push(Number(r.MonetDB) || 0);
    }
  } else {
    // Format alternatif : lines like { label: "PostgreSQL", value: "92" } or { engine: "PostgreSQL", label: "Query A", value: "92" }
    // We will try to pivot: find unique labels and engines
    const hasEngine = rows.some(
      (r) => "engine" in r || "db" in r || "database" in r
    );
    if (hasEngine) {
      // try to pivot: unique label values, then fill arrays by engine
      const labelSet = new Map(); // label -> { pg?: number, monet?: number }
      for (const r of rows) {
        const engine = r.engine ?? r.db ?? r.database ?? r.label; // fallback
        const lbl =
          r.label && r.PostgreSQL == null && r.MonetDB == null
            ? r.query ?? r.name ?? "unknown"
            : r.label;
        const value =
          Number(r.value ?? r.value_ms ?? r.throughput ?? r.amount ?? 0) || 0;
        if (!labelSet.has(lbl)) labelSet.set(lbl, {});
        const obj = labelSet.get(lbl);
        if (/postgre/i.test(String(engine))) obj.pg = value;
        else if (/monet/i.test(String(engine))) obj.monet = value;
        else {
          // unknown engine -> ignore or try to infer
        }
        labelSet.set(lbl, obj);
      }
      for (const [lbl, obj] of labelSet) {
        labels.push(lbl);
        pg_values.push(Number(obj.pg ?? 0));
        monetdb_values.push(Number(obj.monet ?? 0));
      }
    } else {
      // fallback simple: treat each row as a label with two columns unknown - try to use first two numeric columns
      for (const r of rows) {
        const keys = Object.keys(r);
        if (keys.length >= 2) {
          labels.push(String(r[keys[0]]).slice(0, 30)); // first col -> label
          // try to find numbers in other cols
          const numCols = keys
            .slice(1)
            .map((k) => Number(r[k]))
            .filter((n) => !Number.isNaN(n));
          pg_values.push(numCols[0] ?? 0);
          monetdb_values.push(numCols[1] ?? numCols[0] ?? 0);
        }
      }
    }
  }

  // ensure labels and datasets have same length
  const n = Math.max(labels.length, pg_values.length, monetdb_values.length);
  while (labels.length < n) labels.push("");
  while (pg_values.length < n) pg_values.push(0);
  while (monetdb_values.length < n) monetdb_values.push(0);

  // custom plugin to force white background and draw value labels
  const backgroundPlugin = {
    id: "custom_canvas_background_color",
    beforeDraw: (chart) => {
      const ctx = chart.ctx;
      ctx.save();
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  };

  const valueLabelsPlugin = {
    id: "value_labels_plugin",
    afterDatasetsDraw: (chart) => {
      const ctx = chart.ctx;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((bar, index) => {
          const value = dataset.data[index];
          if (value == null) return;
          const fontSize = 12;
          ctx.save();
          ctx.font = `${fontSize}px Arial`;
          ctx.fillStyle = "#000";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          const x = bar.x;
          // put value slightly above bar
          const y = bar.y - 6;
          ctx.fillText(String(value), x, y);
          ctx.restore();
        });
      });
    },
  };

  // compose config
  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "MonetDB",
          data: monetdb_values,
          backgroundColor: "rgba(30, 144, 255, 0.9)", // blue
          borderColor: "rgba(30, 144, 255, 1)",
          borderWidth: 1,
        },
        {
          label: "PostgreSQL",
          data: pg_values,
          backgroundColor: "rgba(220, 20, 60, 0.9)", // red
          borderColor: "rgba(220, 20, 60, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: false,
      layout: { padding: 24 },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "#000",
            font: { size: 14, family: "Arial" },
          },
        },
        title: {
          display: true,
          text: `MonetDB vs PostgreSQL: débit nbr_lignes/temps(ms) pour requêtes ${queryMajorType}`,
          color: "#000",
          font: { size: 20, family: "Arial", weight: "bold" },
          padding: { top: 10, bottom: 20 },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#000",
            font: { size: 12, family: "Arial" },
          },
          grid: { display: false },
          stacked: false,
        },
        y: {
          title: {
            display: true,
            text: `Débit row/time(ms)`,
            color: "#000",
            font: { size: 20, family: "Arial", weight: "bold" },
            padding: { top: 10, bottom: 20 },
          },
          ticks: {
            color: "#000",
            font: { size: 12, family: "Arial" },
            beginAtZero: true,
          },
          grace: "20%", // ajoute un espace au-dessus des barres
          // suggestedMax: Math.max(...pg_values, ...monetdb_values) * 1.2,
          grid: { color: "rgba(0,0,0,0.08)" },
        },
      },
    },
    plugins: [backgroundPlugin, valueLabelsPlugin],
  };

  // render
  const buffer = await chartJSNodeCanvas.renderToBuffer(config);

  // ensure output dir exists
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const outPath = path.join(PUBLIC_DIR, outputFileName);
  fs.writeFileSync(outPath, buffer);
  console.log("Graph_throughput saved at", outPath);
  return outPath;
};
