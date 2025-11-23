const { faker } = require("@faker-js/faker");

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

function getData(nbrClients, nbrOrders) {
  const clients = generateClients(nbrClients);
  const orders = generateOrders(nbrOrders, clients);
  return { clients, orders };
}

module.exports = { getData };
