// front.js
//envoyer une requete de setup
function setup() {
  fetch("/setup")
    .then((response) => response.json())
    .then((data) => {
      if (data.ok) {
        console.log("setup reussi");
      } else {
        alert("setup failed");
        console.log("setup failed");
      }
    })
    .catch((error) => {
      console.error("Error during setup:", error);
      alert("setup failed");
    });
}
setup();

function isSingleSQLQuery(sql) {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  let semicolonCount = 0;

  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    const next = sql[i + 1];

    // Manage exiting comments
    if (inLineComment) {
      if (c === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (c === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    // Detect entering comments
    if (!inSingleQuote && !inDoubleQuote) {
      if (c === "-" && next === "-") {
        inLineComment = true;
        i++;
        continue;
      }
      if (c === "/" && next === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
    }

    // Manage string quotes
    if (!inDoubleQuote && c === "'" && sql[i - 1] !== "\\") {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (!inSingleQuote && c === '"' && sql[i - 1] !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    // Count semicolons only when not in quotes/comments
    if (!inSingleQuote && !inDoubleQuote && c === ";") {
      semicolonCount++;
    }
  }

  // Strip whitespace to check if the query is empty
  const trimmed = sql.trim();
  if (!trimmed) return false;

  // Valid only if 0 or 1 semicolon at the END
  if (semicolonCount === 0) return true;

  if (semicolonCount === 1) {
    // Only acceptable if last non-space character is ;
    const lastChar = trimmed[trimmed.length - 1];
    return lastChar === ";";
  }

  return false;
}

// UI logic pour index.html

// === Pré-sets (copie de tes queries) ===
const PRESET_QUERIES = [
  {
    id: "oltp_heavy_update",
    label: "OLTP heavy update",
    sql: "UPDATE clients SET age = age + 1 WHERE age < 25;",
    type: "oltp",
  },
  {
    id: "olap_heavy_aggregate",
    label: "OLAP heavy aggregate",
    sql: "SELECT c.id, c.name, COUNT(o.id) AS n_orders, SUM(o.amount) AS total_amount FROM clients c LEFT JOIN orders o ON c.id = o.client_id GROUP BY c.id, c.name ORDER BY total_amount DESC;",
    type: "olap",
  },
  {
    id: "oltp_update_age",
    label: "Update age < 30 (+1)",
    sql: "UPDATE clients SET age = age + 1 WHERE age < 30;",
    type: "oltp",
  },
  {
    id: "olap_group_by_age",
    label: "Group by age (count + avg)",
    sql: "SELECT c.age AS age, COUNT(*) AS n_clients, AVG(o.amount) AS avg_order FROM clients c LEFT JOIN orders o ON c.id = o.client_id GROUP BY c.age ORDER BY age LIMIT 1000;",
    type: "olap",
  },
  {
    id: "oltp_insert_sample",
    label: "Insert sample client (temp)",
    sql: "INSERT INTO clients (name,email,age) VALUES ('__SAMPLE__','sample@example.com',42); ",
    type: "oltp",
  },
  {
    id: "olap_top_products",
    label: "Top products by sum(amount)",
    sql: "SELECT product, SUM(amount) AS total_amount, COUNT(*) AS n_orders FROM orders GROUP BY product ORDER BY total_amount DESC LIMIT 50;",
    type: "olap",
  },
  {
    id: "oltp_delete_old_orders",
    label: "Delete small orders",
    sql: "DELETE FROM orders WHERE amount < 50;",
    type: "oltp",
  },
  {
    id: "oltp_update_email",
    label: "Update email domain",
    sql: "UPDATE clients SET email = REPLACE(email,'@example.com','@test.com');",
    type: "oltp",
  },

  {
    id: "olap_client_order_summary",
    label: "Client order summary",
    sql: "SELECT c.id, c.name, COUNT(o.id) AS n_orders, SUM(o.amount) AS total_amount FROM clients c LEFT JOIN orders o ON c.id = o.client_id GROUP BY c.id, c.name ORDER BY total_amount DESC LIMIT 100;",
    type: "olap",
  },
];

// === DOM refs ===
const presetContainer = document.getElementById("presetQueries");
const selectedList = document.getElementById("selectedList");
const addCustomBtn = document.getElementById("addCustomBtn");
const customLabel = document.getElementById("customLabel");
const customSql = document.getElementById("customSql");
const runBtn = document.getElementById("runBtn");
const statusEl = document.getElementById("status");
const resultImage = document.getElementById("resultImage");
const downloadingsContainer = document.getElementById("downloadingsContainer");
const csvLink = document.getElementById("csvLink");
const pngLink = document.getElementById("pngLink");

const nbrStartEl = document.getElementById("nbrStart");
const nbrEndEl = document.getElementById("nbrEnd");
const jumpEl = document.getElementById("jump");

const clearSelectionBtn = document.getElementById("clearSelection");
const fillAllOLTP = document.getElementById("fillAllOLTP");
const fillAllOLAP = document.getElementById("fillAllOLAP");
const onlyOLTP = document.getElementById("onlyOLTP");
const onlyOLAP = document.getElementById("onlyOLAP");

const loaderEl = document.getElementById("loader");
const type_requete_courrant = document.getElementById("type_requete_courrant");

function showLoader() {
  loaderEl.classList.remove("hidden");
}

function hideLoader() {
  loaderEl.classList.add("hidden");
}

// === State ===
let selected = []; // array of query objects

// Helper: render a preset card
function makeCard(q) {
  const el = document.createElement("button");
  el.type = "button";
  el.className =
    "border rounded p-3 text-left hover:shadow-sm transition flex flex-col";
  el.innerHTML = `<div class="flex items-center justify-between"><div class="font-medium">${escapeHtml(
    q.label
  )}</div><div class="text-xs text-slate-500">${q.type.toUpperCase()}</div></div><pre class="text-xs text-slate-600 mt-2 whitespace-pre-wrap">${escapeHtml(
    q.sql
  )}</pre>`;
  el.addEventListener("click", () => addPresetQuery(q));
  return el;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// render presets
function renderPresets() {
  PRESET_QUERIES.forEach((q) => {
    const card = makeCard(q);
    presetContainer.appendChild(card);
  });
}
renderPresets();

// toggle selection
function addPresetQuery(q) {
  const idx = selected.findIndex((s) => s.id === q.id && s.sql === q.sql);
  if (idx >= 0) select({ ...q, id: q.id + Date.now() });
  else select(q);
  renderSelected();
}

function select(q) {
  selected.push(q);
  setCurrentParameteres();
}

function renderSelected() {
  selectedList.innerHTML = "";
  if (selected.length === 0) {
    selectedList.innerHTML = `<div class="text-sm text-slate-500">Aucune requête sélectionnée</div>`;
    return;
  }
  selected.forEach((q, i) => {
    const row = document.createElement("div");
    row.className = "flex items-start gap-3 p-2 border rounded";
    row.innerHTML = `
        <div class="flex-1">
          <div class="font-medium">${escapeHtml(q.label)}</div>
          <div class="text-xs text-slate-600 whitespace-pre-wrap">${escapeHtml(
            q.sql
          )}</div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-xs text-slate-500">${q.type.toUpperCase()}</div>
          <button data-idx="${i}" class="removeBtn text-red-600 text-sm">Retirer</button>
        </div>
      `;
    selectedList.appendChild(row);
  });

  // attach remove handlers
  selectedList.querySelectorAll(".removeBtn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const i = Number(btn.dataset.idx);
      selected.splice(i, 1);
      setCurrentParameteres();
      renderSelected();
    });
  });
}
//set current type
function setCurrentParameteres() {
  let countOLTP = 0;
  let countOLAP = 0;
  selected.forEach((q) => {
    if (q.type.toUpperCase() === "OLTP") {
      countOLTP++;
    } else if (q.type.toUpperCase() === "OLAP") {
      countOLAP++;
    }
  });
  type_requete_courrant.innerHTML = `Aperçu pour: ${
    countOLTP > 0 ? countOLTP + " OLTP " : ""
  } ${countOLTP > 0 && countOLAP > 0 ? "," : ""} ${
    countOLAP > 0 ? countOLAP + " OLAP " : ""
  }   <br />${
    selected.length > 0
      ? "Total queries: " + selected.length * Number(nbrEndEl.value)
      : ""
  }`;
}
// add custom query
addCustomBtn.addEventListener("click", (ev) => {
  const label = customLabel.value.trim();
  const sql = customSql.value.trim();
  if (!isSingleSQLQuery(sql)) {
    alert("La requête SQL doit être une seule instruction.");
    return;
  }
  const type =
    document.querySelector('input[name="customType"]:checked')?.value || "oltp";
  if (!label || !sql) {
    alert("Remplis un label et la requête SQL.");
    return;
  }
  const id = "custom_" + Date.now();
  const q = { id, label, sql, type };
  select(q);
  PRESET_QUERIES.push(q);
  customLabel.value = "";
  customSql.value = "";
  renderPresets();
  renderSelected();
});

clearSelectionBtn.addEventListener("click", () => {
  selected.length = 0;
  renderSelected();
});

fillAllOLTP.addEventListener("click", () => {
  PRESET_QUERIES.filter((q) => q.type === "oltp").forEach((q) => {
    if (!selected.find((s) => s.id === q.id)) select(q);
  });
  renderSelected();
});

fillAllOLAP.addEventListener("click", () => {
  PRESET_QUERIES.filter((q) => q.type === "olap").forEach((q) => {
    if (!selected.find((s) => s.id === q.id)) select(q);
  });
  renderSelected();
});

onlyOLAP.addEventListener("click", () => {
  selected = selected.filter((q) => q.type === "olap");
  renderSelected();
});
onlyOLTP.addEventListener("click", () => {
  selected = selected.filter((q) => q.type === "oltp");
  renderSelected();
});

//s'assurer de la conformité des nombres
nbrStartEl.addEventListener("input", () => {
  nbrEndEl.min = Number(nbrStartEl.value) + 2;
  jumpEl.max = Number(nbrEndEl.value) - Number(nbrStartEl.value) - 1;
  setCurrentParameteres();
});
nbrEndEl.addEventListener("input", () => {
  nbrStartEl.max = Number(nbrEndEl.value) - 2;
  jumpEl.max = Number(nbrEndEl.value) - Number(nbrStartEl.value) - 1;
  setCurrentParameteres();
});
jumpEl.addEventListener("input", () => {
  jumpEl.max = Number(nbrEndEl.value) - Number(nbrStartEl.value);
  setCurrentParameteres();
});
// run handler
runBtn.addEventListener("click", async () => {
  if (selected.length === 0) {
    alert("Sélectionne au moins une requête.");
    return;
  }
  //hide previous result
  resultImage.src = "";
  resultImage.classList.add("hidden");
  downloadingsContainer.classList.add("hidden");

  const nbrStart = Number(nbrStartEl.value) || 1;
  const jump = Number(jumpEl.value) || 1;
  const nbrEnd = Number(nbrEndEl.value) + jump || 3;
  if (nbrStart > nbrEnd - 2) {
    alert("L'intervalle entre fin et debut doit être au moins 2.");
    return;
  }

  if (nbrStart < 1) {
    alert("Le nombre de requêtes doit être supérieur à 1.");
    return;
  }
  if (nbrEnd < 3) {
    alert("Le nombre de requêtes doit être supérieur à 3.");
    return;
  }
  if (jump < 1 || jump >= nbrEnd - nbrStart) {
    alert(
      "Le pas(jump) doit être compris entre 1 inclu et l'interval (end-start)."
    );
    return;
  }

  const object = {
    nbrStart,
    nbrEnd,
    jump,
    queries: selected.map((q) => ({
      id: q.id,
      label: q.label,
      sql: q.sql,
      type: q.type.toUpperCase(),
    })),
  };
  //hide previous result
  try {
    setStatus("Envoi du job au serveur...");
    showLoader(); // <-- start loader

    const resp = await fetch("/traiter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(object),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error("Erreur serveur: " + resp.status + " " + text);
    }

    const body = await resp.json();

    if (!body.ok) throw new Error(body.message || "Erreur inconnue");

    setStatus("Traitement terminé.");
    let url = body.url || body.path || body.file || null;
    if (!url) {
      setStatus("Réponse OK mais pas d'URL reçue.");
      return;
    }

    if (url.startsWith("file://")) url = url.replace("file://", "");
    const m = url.match(/.*\/public\/(.+)$/);
    if (m) url = "/" + m[1];

    if (body.csvPath) {
      let csvUrl = body.csvPath;
      const m = csvUrl.match(/.*\/public\/(.+)$/);
      if (m) csvUrl = "/" + m[1];

      // Ajouter un timestamp pour forcer le téléchargement
      const timestamp = Date.now();
      csvLink.href = csvUrl + "?t=" + timestamp;
      pngLink.href = url + "?t=" + timestamp;
      downloadingsContainer.classList.remove("hidden");
    } else {
      downloadingsContainer.classList.add("hidden");
    }
    // Après avoir récupéré `url` du serveur
    const timestamp = Date.now();
    resultImage.src = url + "?t=" + timestamp;
    resultImage.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    setStatus("Erreur: " + (err.message || err));
  } finally {
    hideLoader(); // <-- stop loader
  }
});

function setStatus(s) {
  statusEl.textContent = s;
}

// render initially
renderSelected();
//lancer un exemple pertinant pour OLTP
async function runRemarkableValues(type) {
  const query =
    type.toUpperCase() == "OLTP"
      ? PRESET_QUERIES.find((q) => q.id == "oltp_heavy_update")
      : PRESET_QUERIES.find((q) => q.id == "olap_client_order_summary");
  nbrStartEl.value = 400;
  nbrEndEl.value = 1500;
  jumpEl.value = 2;
  selected = [query];
  renderSelected();
  setCurrentParameteres();
  runBtn.click();
}
