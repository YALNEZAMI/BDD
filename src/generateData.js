import { faker } from "@faker-js/faker";

/**
 *
 * @param {*} nbr  de client à generer à modifier dans config.js
 * @returns tableau de clients générés aléatoirement
 */
function generateClients(nbr) {
  const clients = [];
  for (let i = 0; i < nbr; i++) {
    clients.push({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      age: faker.number.int({ min: 18, max: 80 }),
    });
  }
  return clients;
}
/**
 *
 * @param {*} nbr de commande à modifier dans config.js
 * @param {*} clients les clients auxquels les commandes sont associées
 * @returns  tableau des commandes généré aléatoirement
 */
function generateOrders(nbr, clients) {
  const orders = [];
  for (let i = 0; i < nbr; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    orders.push({
      clientIndex: clients.indexOf(client),
      product: faker.commerce.productName(),
      amount: generateAmount(), // ← ici
    });
  }
  return orders;
}

function generateAmount(max = 100) {
  const raw = faker.number.float({ min: 0, max, precision: 0.01 });
  return Math.floor(raw * 100) / 100;
}

/**
 *
 * @param {*} nbrClients
 * @param {*} nbrOrders
 * @returns un object {clients: tableau de clients générés, orders: tableau de commandes générés}
 */
export const getData = (nbrClients, nbrOrders) => {
  const clients = generateClients(nbrClients);
  const orders = generateOrders(nbrOrders, clients);
  return { clients, orders };
};
