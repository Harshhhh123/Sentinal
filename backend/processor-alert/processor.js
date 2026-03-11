const { Kafka } = require("kafkajs");
const { Pool } = require("pg");
require("dotenv").config();

const kafka = new Kafka({
    clientId: "prediction-processor",
    brokers: [process.env.KAFKA_BROKER]   // e.g. 172.xx.xx.xx:9092
});

const consumer = kafka.consumer({ groupId: "prediction-group" });

const pool = new Pool({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: 5432
});

const thresholds = {
    CPUUtilization: 10,
    MemoryUtilization: 10,
    RequestCount: 40,
    ErrorCount: 5
};

const previousValues = {};

async function processEvent(event) {

    const prev = previousValues[event.metric];

    if (prev === undefined) {
        previousValues[event.metric] = event.value;
        return;
    }

    const trend = event.value - prev;

    previousValues[event.metric] = event.value;

    if (trend > thresholds[event.metric]) {

        await pool.query(
            `INSERT INTO predictions(service, metric, current_value, trend, ts)
             VALUES ($1,$2,$3,$4,$5)`,
            [event.service, event.metric, event.value, trend, event.timestamp]
        );

        console.log(`Prediction and alerts detected → ${event.metric} rising fast (${trend})`);
    }
}

async function run() {

    await consumer.connect();
    await consumer.subscribe({ topic: "metrics-topic" });

    console.log("Prediction Processor Started");

    await consumer.run({
        eachMessage: async ({ message }) => {

            const event = JSON.parse(message.value.toString());
            await processEvent(event);

        }
    });
}

run();