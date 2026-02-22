import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";

const client = new CloudWatchClient({ region: "ap-south-1" });

export const handler = async () => {
    const command = new GetMetricStatisticsCommand({
        Namespace: "AWS/ECS",
        MetricName: "CPUUtilization",
        StartTime: new Date(Date.now() - 5 * 60 * 1000),
        EndTime: new Date(),
        Period: 60,
        Statistics: ["Average"],
        Dimensions: [
            { Name: "ClusterName", Value: "monitoring-cluster" },
            { Name: "ServiceName", Value: "dummy-service" }
        ]
    });

    try {
        const data = await client.send(command);

        console.log("Metric Data:", JSON.stringify(data, null, 2));

        if (!data.Datapoints || data.Datapoints.length === 0) {
            console.log("No datapoints yet.");
            return;
        }

        const latest = data.Datapoints.sort(
            (a, b) => new Date(b.Timestamp) - new Date(a.Timestamp)
        )[0];

        console.log("Latest CPU Average:", latest.Average);

    } catch (err) {
        console.error("CloudWatch Error:", err);
    }
};