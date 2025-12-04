# Function

Comparaison entre les performance des deux SGBDs MonetDB et PostgreSQL en fonction du type de requêtes (OLTP/OLAP).

# Prerequis:

avoir nodejs et npm d'installé(sinon partie docker à la fin)

verifier que le serveur postgres est démarré sur le port 5432
verifier que le serveur monetdb est démarré sur le port 50000 (sinon aller à C://programmes/Monetdb/ et lancer m5server.bat )

une bd de créée à mettre dans config de monetdb(pas de creation automatique si db n'exist pas)

set username/passwords/bdname/ dans config.js
mettre APP_DOCKERIZED à false sauf si utilisation de docker(true)

# Demarrage

aller à la racine du projet avec un terminal

lancer "npm i"
lancer "npm run start"
ouvrir "http://localhost:3000/" avec un navigateur

Faire un test en cliquant sur une des deux options de "Traitement pertinants ""

# si vous voulez lancer le projet avec docker(sans node requis)

mettre APP_DOCKERIZED à true

Docker du benchmark:
Se mettre à la racine du projet(au niveau de Dockerfile) et lancer:
"docker build -t benchmark-image ."
puis
"docker run --name benchmark-container -p 3000:3000 benchmark-image"
Si un container a déjà le nom " benchmark-container " alors il faudra le supprimer ou renommer dans la commande docker

Verifier le lancement en :

-ouvrant "http://localhost:3000/" avec un navigateur

- lançant : docker ps
  vous devez voir benchmark dans la list

Pour arreter le container:
docker stop benchmark-container
