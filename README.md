# Function

Comparaison entre les performance des deux SGBDs MonetDB et PostgreSQL en fonction du type de requêtes (OLTP/OLAP).

# Prerequis:

avoir nodejs et npm d'installé

verifier que le serveur postgres est démarré sur le port 5432
verifier que le serveur monetdb est démarré sur le port 50000

une bd de créée à mettre dans config de monetdb(pas de creation automatique si db n'exist pas)

monetdb client dans PATH(ptet pas finalement)

set passwords dans config.js

# Demarrage

aller à la racine du projet avec un terminal

lancer "npm i"
lancer "node server.js"
ouvrir "http://localhost:3000/" avec un navigateur

faire un test en cliquant sur une des deux options de "Traitement pertinants ""

# en developpement(ne marche pas pour le moment)

docker du benchmark:
se mettre à la racine du projet(au niveau de Dockerfile) et lancer:
"
docker build -t benchmark-image .
docker run --name benchmark-container -p 3000:3000 benchmark-image
"

verifier leur lancement en lançant : docker ps
vous devez voir benchmark dans la list

pour arreter le container:
docker stop benchmark-container
