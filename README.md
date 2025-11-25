# Prerequis:

avoir nodejs et npm d'installé

verifier que le serveur postgres est démarré sur le port 5432
verifier que le serveur monetdb est démarré sur le port 50000

docker: si docker installer --> lancer les serveurs dessu en lançant : docker compose up -d
verifier leur lancement en lançant : docker ps

une bd de créée à mettre dans config de monetdb(pas de creation automatique si db n'exist pas)

monetdb client dans PATH(ptet pas finalement)

set passwords dans config.js

# Demarrage

aller à la racine du projet avec un terminal

lancer "npm i"
lancer "node server.js"
ouvrir "http://localhost:3000/" avec un navigateur
