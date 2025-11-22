// check-ports.js

const { checkConnections } = require("./connexion.js");
const { populateMonet } = require("./populateMonetdb.js");
const { populatePostgre } = require("./populatePostgre.js");
const { compare } = require("./compare");
// Programme principal
async function main() {
  try {
    console.log("____CHECK CONNECTIONS_____");

    const bothConnected = await checkConnections();
    if (!bothConnected) {
      console.error(
        "Un ou les deux sgbd ne sont pas connecté (démarrez les serveur et assurez vous de la conformité des ports)"
      );
      return;
    }
    console.log("_____POSTGRE: CREATE BD,TABLES,POPULATING_____");

    // Crée le pool **après** s'assurer que la base existe
    const populatePostgreResult = await populatePostgre();
    if (populatePostgreResult.ok) {
      console.log(populatePostgreResult.message);
    } else {
      console.error("Error: " + populatePostgreResult.message);
    }
    console.log("____MONETDB: CREATE TABLES,POPULATING_____");

    const populateMonetResult = await populateMonet();
    if (populateMonetResult.ok) {
      console.log(populateMonetResult.message);
    } else {
      console.error("Error: " + populateMonetResult.message);
    }
    console.log("____PERFORMING QUERIES_____");
    await compare();
  } catch (err) {
    console.error("Erreur :", err);
  }
}

main();
