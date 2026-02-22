const AWS = require("aws-sdk");

const cloudwatch = new AWS.CloudWatch({ region: "ap-south-1" });

let requestCount = 0;
let errorCount = 0;

function simulateTraffic() {
    const requests = Math.floor(Math.random() * 3);
    const errors = Math.random() > 0.9 ? 1 : 0;

    requestCount += requests;
    errorCount += errors;

    console.log(`Simulated → Requests +${requests}, Errors +${errors}`);
}

async function publishMetrics() {
    const params = {
        Namespace: "Custom/DummyService",
        MetricData: [
            {
                MetricName: "RequestCount",
                Value: requestCount,
                Unit: "Count"
            },
            {
                MetricName: "ErrorCount",
                Value: errorCount,
                Unit: "Count"
            }
        ]
    };

    try {
        await cloudwatch.putMetricData(params).promise();
        console.log("✅ Metrics published to CloudWatch");

        requestCount = 0;
        errorCount = 0;

    } catch (err) {
        console.error("❌ Metric publish error:", err);
    }
}

console.log("Dummy service started (safe metrics mode)...");

setInterval(simulateTraffic, 1000);

/* Publish VERY INFREQUENTLY → cost safe */
setInterval(publishMetrics, 60000);