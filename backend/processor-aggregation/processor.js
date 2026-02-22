const { Kafka } = require("kafkajs");
const { Pool } = require("pg");
require("dotenv").config();
const kafka = new Kafka({
    clientId: "aggregation-processor",
    brokers: ["35.154.169.189:9092"]
});

const consumer = kafka.consumer({ groupId: "aggregation-group" });

const pool = new Pool({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: 5432
});

const ALPHA = 0.2;

async function processMessage(event) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `INSERT INTO raw_metrics(service, metric, value, ts)
             VALUES ($1, $2, $3, $4)`,
            [event.service, event.metric, event.value, event.timestamp]
        );

        const res = await client.query(
            `SELECT ema FROM aggregated_metrics
             WHERE service=$1 AND metric=$2`,
            [event.service, event.metric]
        );

        let newEma;

        if (res.rows.length === 0) {
            newEma = event.value;
        } else {
            const prev = res.rows[0].ema;
            newEma = (event.value * ALPHA) + (prev * (1 - ALPHA));
        }

        await client.query(
            `INSERT INTO aggregated_metrics(service, metric, ema, last_ts)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (service, metric)
             DO UPDATE SET ema=$3, last_ts=$4`,
            [event.service, event.metric, newEma, event.timestamp]
        );

        await client.query("COMMIT");

        console.log(` ${event.metric} → EMA ${newEma}`);

    } catch (err) {
        await client.query("ROLLBACK");
        console.error(" Processing error:", err);
    } finally {
        client.release();
    }
}

async function run() {
    await consumer.connect();
    await consumer.subscribe({ topic: "metrics-topic" });

    await consumer.run({
        eachMessage: async ({ message }) => {
            const event = JSON.parse(message.value.toString());
            await processMessage(event);
        }
    });
}

run();