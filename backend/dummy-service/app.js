const AWS = require("aws-sdk");

const cloudwatch = new AWS.CloudWatch({ region: "ap-south-1" });

let requestCount = 30;
let errorCount = 1;

let tick = 0;

const MODE = process.env.MODE || "normal";

function simulateTraffic() {

    tick++;

    if (MODE === "normal") {

        requestCount = 25 + Math.random() * 10;
        errorCount = Math.random() * 2;

    }

    if (MODE === "test") {

        // Phase 1 → Normal baseline
        if (tick < 4) {

            requestCount = 30 + Math.random() * 5;
            errorCount = 1;

        }

        // Phase 2 → Spike → ANOMALY
        else if (tick === 4) {

            requestCount = 350;
            errorCount = 40;

            console.log("🔥 SPIKE GENERATED (Anomaly)");

        }

        // Phase 3 → Rising trend → PREDICTION
        else {

            requestCount += 25;
            errorCount += 3;

            console.log("📈 TREND INCREASING");

        }

    }

    console.log(`MODE=${MODE}`);
    console.log(`Requests=${requestCount} Errors=${errorCount}`);

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
        console.log("Metrics published");

    } catch (err) {

        console.error("Metric publish error:", err);

    }

}

console.log("Dummy service started");

setInterval(simulateTraffic, 5000);
setInterval(publishMetrics, 60000);