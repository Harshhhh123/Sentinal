Sentinal – Real-Time Infrastructure Monitoring & Anomaly Detection

Sentinal is a real-time monitoring and anomaly detection system built using a streaming architecture. It collects infrastructure metrics, processes them through multiple data processors, detects anomalies, predicts potential issues, and visualizes system behavior.

The goal of this project is to simulate how modern observability platforms detect abnormal behavior in distributed systems.

Architecture Overview
CloudWatch Metrics
        │
        ▼
Lambda Metric Collector
        │
        ▼
Kafka Stream (metrics-topic)
        │
        ├── Processor A – Aggregation (EMA)
        │
        ├── Processor B – Anomaly Detection
        │
        └── Processor C – Prediction Engine
        │
        ▼
PostgreSQL Database
        │
        ▼
Grafana Dashboard
System Components
Metric Source

A dummy service generates traffic and error metrics which are published to AWS CloudWatch.

Metrics collected:

CPUUtilization

MemoryUtilization

RequestCount

ErrorCount

Lambda Metric Collector

A scheduled AWS Lambda function retrieves metrics from CloudWatch and pushes them into a Kafka topic.

Responsibilities:

Fetch latest infrastructure metrics

Format events

Publish to Kafka (metrics-topic)

Processor A – Aggregation Processor

Consumes raw metrics from Kafka and calculates Exponential Moving Average (EMA) to smooth noisy data.

Stores results in:

aggregated_metrics

Purpose:

Remove noise from raw telemetry

Create stable baseline metrics

Processor B – Anomaly Detection Processor

Detects abnormal system behavior using deviation from EMA baseline.

If deviation crosses threshold:

anomaly event is generated

Stored in:

anomalies
Processor C – Prediction Processor

Analyzes trends to identify potential future failures or spikes.

Example:

Rapidly increasing error rate

Sudden traffic growth

Stored in:

predictions
Database Schema
raw_metrics

Stores every incoming metric event.

service
metric
value
timestamp
aggregated_metrics

Stores latest smoothed metric values.

service
metric
ema
last_ts
anomalies

Stores detected anomalies.

service
metric
deviation
timestamp
predictions

Stores predicted risks or trends.

service
metric
trend
timestamp
Infrastructure

The system is deployed using AWS services.

EC2
Kafka
PostgreSQL
Grafana

Processors run as containerized services on ECS.

Images are built and pushed using CI/CD pipelines via GitHub Actions.

Technology Stack

Backend & Streaming

Node.js

Kafka (KafkaJS)

Cloud

AWS Lambda

AWS CloudWatch

AWS ECS

AWS ECR

EC2

Data

PostgreSQL

Visualization

Grafana

CI/CD

GitHub Actions

Docker

Key Features

Real-time metric ingestion
Streaming architecture using Kafka
EMA-based metric smoothing
Automated anomaly detection
Trend-based prediction system
Containerized processors deployed on ECS
Infrastructure monitoring dashboard via Grafana

Demo Flow

Start system in normal mode

Dummy service produces stable traffic

Metrics flow through Kafka pipeline

Aggregation processor updates EMA baseline

Switch service to test mode

Traffic spike occurs

Anomaly processor detects deviation

Prediction processor warns about trend

Events appear in dashboard and database

Learning Outcomes

This project demonstrates:

Event-driven architecture

Streaming data processing

Real-time anomaly detection

Microservice-based processors

Cloud-native deployment

Observability pipeline design
