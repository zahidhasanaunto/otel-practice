const { Client } = require('pg');

const pgClient = new Client({
  connectionString: 'postgresql://auuntoo:auuntoo@localhost:5432/otel_db',
});

pgClient.connect();

module.exports = pgClient;
