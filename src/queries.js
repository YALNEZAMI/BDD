const QUERIES_ARRAY = [
  // ---- OLTP ----
  // Requête OLTP "marqueur" ajoutée en premier
  {
    id: "oltp_heavy_update",
    label: "OLTP - Update young clients (+1) intensive",
    sql: `UPDATE clients SET age = age + 1 WHERE age < 25;`,
    type: "oltp",
  },

  // Les autres OLTP existants
  {
    id: "oltp_update_age",
    label: "Update age < 30 (+1)",
    sql: `UPDATE clients SET age = age + 1 WHERE age < 30;`,
    type: "oltp",
  },
  {
    id: "oltp_insert_sample",
    label: "Insert sample client (temp)",
    sql: `INSERT INTO clients (name,email,age) VALUES ('__SAMPLE__','sample@example.com',42); DELETE FROM clients WHERE email = 'sample@example.com';`,
    type: "oltp",
  },
  {
    id: "oltp_delete_old_orders",
    label: "Delete orders older than 5 years",
    sql: `DELETE FROM orders WHERE amount < 50;`,
    type: "oltp",
  },
  {
    id: "oltp_update_email",
    label: "Update email domain",
    sql: `UPDATE clients SET email = REPLACE(email,'@example.com','@test.com');`,
    type: "oltp",
  },
  {
    id: "oltp_insert_orders",
    label: "Insert sample orders",
    sql: `INSERT INTO orders (client_id, product, amount) SELECT id, 'Test Product', 99.99 FROM clients LIMIT 10;`,
    type: "oltp",
  },
  {
    id: "oltp_update_amount",
    label: "Increase high order amounts by 10%",
    sql: `UPDATE orders SET amount = amount * 1.1 WHERE amount > 500;`,
    type: "oltp",
  },
  {
    id: "oltp_delete_temp_clients",
    label: "Delete temporary clients",
    sql: `DELETE FROM clients WHERE email LIKE '%@temp.com';`,
    type: "oltp",
  },
  {
    id: "oltp_reset_age",
    label: "Reset age = 18 for new clients",
    sql: `UPDATE clients SET age = 18 WHERE age IS NULL;`,
    type: "oltp",
  },
  {
    id: "oltp_insert_bulk_clients",
    label: "Insert 5 new clients",
    sql: `INSERT INTO clients (name,email,age) VALUES ('A','a@x.com',25),('B','b@x.com',30),('C','c@x.com',22),('D','d@x.com',28),('E','e@x.com',35);`,
    type: "oltp",
  },
  {
    id: "oltp_update_orders_small",
    label: "Reduce small orders by 5%",
    sql: `UPDATE orders SET amount = amount * 0.95 WHERE amount < 100;`,
    type: "oltp",
  },

  // ---- OLAP ----
  // Requête OLAP "marqueur" ajoutée en premier
  {
    id: "olap_heavy_aggregate",
    label: "OLAP - Aggregate orders per client intensive",
    sql: `
      SELECT c.id, c.name, COUNT(o.id) AS n_orders, SUM(o.amount) AS total_amount
      FROM clients c
      LEFT JOIN orders o ON c.id = o.client_id
      GROUP BY c.id, c.name
      ORDER BY total_amount DESC;
    `,
    type: "olap",
  },

  {
    id: "olap_group_by_age",
    label: "Group by age (count + avg)",
    sql: `
      SELECT c.age AS age, COUNT(*) AS n_clients, AVG(o.amount) AS avg_order
      FROM clients c
      LEFT JOIN orders o ON c.id = o.client_id
      GROUP BY c.age
      ORDER BY age
      LIMIT 1000;
    `,
    type: "olap",
  },
  {
    id: "olap_top_products",
    label: "Top products by sum(amount)",
    sql: `
      SELECT product, SUM(amount) AS total_amount, COUNT(*) AS n_orders
      FROM orders
      GROUP BY product
      ORDER BY total_amount DESC
      LIMIT 50;
    `,
    type: "olap",
  },
  {
    id: "olap_client_order_summary",
    label: "Client order summary",
    sql: `
      SELECT c.id, c.name, COUNT(o.id) AS n_orders, SUM(o.amount) AS total_amount
      FROM clients c
      LEFT JOIN orders o ON c.id = o.client_id
      GROUP BY c.id, c.name
      ORDER BY total_amount DESC
      LIMIT 100;
    `,
    type: "olap",
  },
  {
    id: "olap_avg_amount_per_age",
    label: "Average order amount per age",
    sql: `
      SELECT c.age, AVG(o.amount) AS avg_order
      FROM clients c
      JOIN orders o ON c.id = o.client_id
      GROUP BY c.age
      ORDER BY avg_order DESC;
    `,
    type: "olap",
  },
  {
    id: "olap_orders_per_product",
    label: "Number of orders per product",
    sql: `
      SELECT product, COUNT(*) AS n_orders
      FROM orders
      GROUP BY product
      ORDER BY n_orders DESC;
    `,
    type: "olap",
  },
  {
    id: "olap_high_value_clients",
    label: "Clients with total orders > 1000",
    sql: `
      SELECT c.id, c.name, SUM(o.amount) AS total_amount
      FROM clients c
      JOIN orders o ON c.id = o.client_id
      GROUP BY c.id, c.name
      HAVING SUM(o.amount) > 1000
      ORDER BY total_amount DESC;
    `,
    type: "olap",
  },
  {
    id: "olap_avg_amount_per_product",
    label: "Average amount per product",
    sql: `
      SELECT product, AVG(amount) AS avg_amount
      FROM orders
      GROUP BY product
      ORDER BY avg_amount DESC;
    `,
    type: "olap",
  },
  {
    id: "olap_top_clients",
    label: "Top 10 clients by total orders",
    sql: `
      SELECT c.id, c.name, SUM(o.amount) AS total_amount
      FROM clients c
      JOIN orders o ON c.id = o.client_id
      GROUP BY c.id, c.name
      ORDER BY total_amount DESC
      LIMIT 10;
    `,
    type: "olap",
  },
  {
    id: "olap_order_distribution",
    label: "Order distribution by amount range",
    sql: `
      SELECT 
        CASE 
          WHEN amount < 50 THEN '<50'
          WHEN amount < 200 THEN '50-199'
          WHEN amount < 500 THEN '200-499'
          ELSE '500+' 
        END AS amount_range,
        COUNT(*) AS n_orders
      FROM orders
      GROUP BY amount_range
      ORDER BY amount_range;
    `,
    type: "olap",
  },
  {
    id: "olap_clients_per_age_range",
    label: "Number of clients per age range",
    sql: `
      SELECT 
        CASE 
          WHEN age < 20 THEN '<20'
          WHEN age < 30 THEN '20-29'
          WHEN age < 40 THEN '30-39'
          WHEN age < 50 THEN '40-49'
          ELSE '50+' 
        END AS age_range,
        COUNT(*) AS n_clients
      FROM clients
      GROUP BY age_range
      ORDER BY age_range;
    `,
    type: "olap",
  },
];

const OLTP_QUERIES = QUERIES_ARRAY.filter((q) => q.type === "oltp");
const OLAP_QUERIES = QUERIES_ARRAY.filter((q) => q.type === "olap");

module.exports = {
  QUERIES_ARRAY,
  OLTP_QUERIES,
  OLAP_QUERIES,
};
