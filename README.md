# Function

Comparaison entre les performance des deux SGBDs MonetDB et PostgreSQL en fonction du type de requêtes (OLTP/OLAP).

# Prerequis:

avoir (nodejs et npm) ou (Docker)

verifier que le serveur postgres est démarré sur le port 5432
verifier que le serveur monetdb est démarré sur le port 50000 (sinon aller à C://programmes/Monetdb/ et lancer m5server.bat )

# Configuration

Aller éditer le fichier /src/config.js en vérifiant pour chaque SGBD:

- username
- password
- bdname

Vérifier l'existance d'une base de donnée Monetdb, appelée demo (ou changer selon votre db dans config.js )

# Demarrage avec nodeJs

- Mettre APP_DOCKERIZED à false

- aller à la racine du projet avec un terminal et lancer:
  "npm i"
  "npm run start"

- ouvrir "http://localhost:3000/" avec un navigateur

Faire un test en cliquant sur une des deux options de "Traitement pertinants"

# Demmarage Docker

- Mettre APP_DOCKERIZED à true

- Se mettre à la racine du projet(au niveau de Dockerfile) et lancer:
  "docker build -t benchmark-image . "
  puis
  "docker run --name benchmark-container -p 3000:3000 benchmark-image"

Si un container/image a déjà le nom " benchmark-container/benchamrk-image" alors il faudra le supprimer ou renommer dans la commande docker

Verifier le lancement en :

- ouvrant "http://localhost:3000/" avec un navigateur
  Faire un test en cliquant sur une des deux options de "Traitement pertinants"

# Arret du Docker

Pour arreter le container:
docker stop benchmark-container
