const { Kafka } = require("kafkajs");
const { Pool } = require("pg");
require("dotenv").config();
const kafka = new Kafka({
    clientId: "anomaly-processor",
    brokers: [process.env.KAFKA_BROKER]   // e.g. 172.xx.xx.xx:9092
});

const consumer = kafka.consumer({ groupId: "anomaly-group" });

const pool = new Pool({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: 5432
});

/* ===== EMA State Store (In-Memory) ===== */

const emaState = {};   // { metricName: emaValue }

const ALPHA = 0.2;     // smoothing factor

/* ===== Threshold Configuration ===== */

const thresholds = {
    CPUUtilization: 2,
    MemoryUtilization: 2,
    RequestCount: 2,
    ErrorCount: 1
};

function computeEMA(metric, value) {
    if (!emaState[metric]) {
        emaState[metric] = value;
        return value;
    }

    const ema = ALPHA * value + (1 - ALPHA) * emaState[metric];
    emaState[metric] = ema;
    return ema;
}

async function insertAnomaly(event, baseline, deviation) {
    await pool.query(
        `INSERT INTO anomalies 
        (service_name, metric_name, value, baseline, deviation, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            event.service,
            event.metric,
            event.value,
            baseline,
            deviation,
            event.timestamp
        ]
    );
}

async function run() {
    await consumer.connect();
    await consumer.subscribe({ topic: "metrics-topic", fromBeginning: false });

    console.log("✅ Anomaly Processor Started successfully!");

    await consumer.run({
        eachMessage: async ({ message }) => {
            const event = JSON.parse(message.value.toString());

            const baseline = computeEMA(event.metric, event.value);
            const deviation = Math.abs(event.value - baseline);

            const threshold = thresholds[event.metric] || 999999;

            if (deviation > threshold) {
                console.log(`🚨 ANOMALY hai → ${event.metric} | Value=${event.value} | Baseline=${baseline}`);

                await insertAnomaly(event, baseline, deviation);
            } else {
                console.log(`✔ Normal hai → ${event.metric} | Deviation=${deviation.toFixed(2)}`);
            }
        }
    });
}

run().catch(err => {
    console.error("❌ Processor Crash:", err);
    process.exit(1);
});