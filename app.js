const express = require('express');
const app = express();
const port = 3000;
const { trace, context } = require('@opentelemetry/api');

const sdk = require('./tracing');
const redisClient = require('./redis');
const pgClient = require('./pg');

app.use(express.json());

app.get('/getuser', (req, res) => {
  const tracer = trace.getTracer('app-one-tracer');
  const span = tracer.startSpan('/getuser');

  try {
    const user = {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    span.setAttribute('user.id', user.id);
    span.setAttribute('user.name', user.name);

    res.json(user);
  } catch (error) {
    span.recordException(error);

    res.status(500).send(error.message);
  } finally {
    span.end();
  }
});

app.get('/user', async (req, res) => {
  const tracer = trace.getTracer('app-one-tracer');
  const ctx = context.active();
  const mainSpan = tracer.startSpan('get-single-user', { root: true }, ctx);

  try {
    const userId = req.query.userId || 'defaultUserId';
    let user;

    await context.with(trace.setSpan(ctx, mainSpan), async () => {
      const redisSpan = tracer.startSpan('redis-get', { parent: mainSpan });

      user = await redisClient
        .get(userId)
        .then((result) => {
          if (result) {
            redisSpan.setAttribute('cache.hit', true);
            return JSON.parse(result);
          } else {
            redisSpan.setAttribute('cache.hit', false);
            return null;
          }
        })
        .finally(() => redisSpan.end());

      if (!user) {
        user = { id: userId, name: 'John Doe', email: 'john.doe@example.com' };
        await redisClient.set(userId, JSON.stringify(user));
      }
    });

    res.json(user);
  } catch (error) {
    mainSpan.recordException(error);
    res.status(500).send('Internal Server Error');
  } finally {
    mainSpan.end();
  }
});

app.post('/create-user', async (req, res) => {
  const { name, email } = req.body;
  const tracer = trace.getTracer('app-one-tracer');
  const ctx = context.active();
  const mainSpan = tracer.startSpan('create-user', { root: true }, ctx);

  try {
    let user;

    await context.with(trace.setSpan(ctx, mainSpan), async () => {
      const pgSpan = tracer.startSpan('pg-insert', { parent: mainSpan });

      const queryText =
        'INSERT INTO users(name, email) VALUES($1, $2) RETURNING id';
      const result = await pgClient.query(queryText, [name, email]);
      user = result.rows[0].id;

      pgSpan.end();
    });

    res.json(user);
  } catch (error) {
    mainSpan.recordException(error);
    res.status(500).send('Internal Server Error');
  } finally {
    mainSpan.end();
  }
});

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const gracefulShutdown = () => {
  server.close(() => {
    console.log('Server stopped');
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.error('Error shutting down tracing', error))
      .finally(() => process.exit(0));
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
