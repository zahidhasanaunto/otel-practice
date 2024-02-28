const { NodeSDK } = require('@opentelemetry/sdk-node');
const {
  getNodeAutoInstrumentations,
} = require('@opentelemetry/auto-instrumentations-node');
const {
  OTLPTraceExporter,
} = require('@opentelemetry/exporter-trace-otlp-http');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const { Resource } = require('@opentelemetry/resources');
const {
  SemanticResourceAttributes,
} = require('@opentelemetry/semantic-conventions');
const {
  RedisInstrumentation,
} = require('@opentelemetry/instrumentation-redis');
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');

const traceExporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces',
  serviceName: 'app-one',
});

const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
    new RedisInstrumentation(),
    new PgInstrumentation(),
  ],
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'app-one',
  }),
});

try {
  sdk.start();
  console.log('Tracing initialized');
} catch (error) {
  console.log('Error initializing tracing', error);
}

module.exports = sdk;
