const { CloudWatchClient, GetMetricStatisticsCommand } = require("@aws-sdk/client-cloudwatch");
const { Kafka } = require("kafkajs");

const cloudwatch = new CloudWatchClient({ region: "ap-south-1" });

const kafka = new Kafka({
    clientId: "metric-fetcher",
    brokers: ["35.154.169.189:9092"]
});

const producer = kafka.producer();

async function fetchMetric({ Namespace, MetricName, Dimensions = [] }) {
    const command = new GetMetricStatisticsCommand({
        Namespace,
        MetricName,
        StartTime: new Date(Date.now() - 10 * 60 * 1000),
        EndTime: new Date(),
        Period: 60,
        Statistics: ["Average"],
        Dimensions
    });

    const data = await cloudwatch.send(command);

    if (!data.Datapoints || data.Datapoints.length === 0) {
        console.log(`No datapoints → ${MetricName}`);
        return null;
    }

    const latest = data.Datapoints.sort(
        (a, b) => new Date(b.Timestamp) - new Date(a.Timestamp)
    )[0];

    return {
        metric: MetricName,
        value: latest.Average,
        timestamp: latest.Timestamp
    };
}

exports.handler = async () => {
    try {
        await producer.connect();

        const cpu = await fetchMetric({
            Namespace: "AWS/ECS",
            MetricName: "CPUUtilization",
            Dimensions: [
                { Name: "ClusterName", Value: "monitoring-cluster" },
                { Name: "ServiceName", Value: "dummy-service-task-service-vvhcigt4" }
            ]
        });

        const memory = await fetchMetric({
            Namespace: "AWS/ECS",
            MetricName: "MemoryUtilization",
            Dimensions: [
                { Name: "ClusterName", Value: "monitoring-cluster" },
                { Name: "ServiceName", Value: "dummy-service-task-service-vvhcigt4" }
            ]
        });

        const requests = await fetchMetric({
            Namespace: "Custom/DummyService",
            MetricName: "RequestCount"
        });

        const errors = await fetchMetric({
            Namespace: "Custom/DummyService",
            MetricName: "ErrorCount"
        });

        const events = [cpu, memory, requests, errors]
            .filter(Boolean)
            .map(sample => ({
                key: sample.metric,
                value: JSON.stringify({
                    service: "dummy-service",
                    metric: sample.metric,
                    value: sample.value,
                    timestamp: sample.timestamp
                })
            }));

        if (events.length > 0) {
            await producer.send({
                topic: "metrics-topic",
                messages: events
            });

            console.log("✅ Events published to Kafka");
        } else {
            console.log("No events to publish");
        }

        await producer.disconnect();

    } catch (err) {
        console.error("❌ Lambda Error:", err);
    }
};