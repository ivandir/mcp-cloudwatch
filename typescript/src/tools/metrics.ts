import {
  GetMetricDataCommand,
  ListMetricsCommand,
  type MetricDataQuery,
} from "@aws-sdk/client-cloudwatch";
import { cloudwatchClient } from "../client.js";

export const metricsTools = [
  {
    name: "cloudwatch_get_metric",
    description:
      "Fetch a CloudWatch metric time series. Returns timestamped data points for a given namespace, metric, and dimensions. Useful for graphing error rates, latency, throughput, or any numeric AWS metric.",
    inputSchema: {
      type: "object",
      properties: {
        namespace: {
          type: "string",
          description: "CloudWatch namespace (e.g. 'AWS/Lambda', 'AWS/ECS', 'AWS/ApplicationELB')",
        },
        metric_name: {
          type: "string",
          description: "Metric name (e.g. 'Errors', 'Duration', 'RequestCount')",
        },
        dimensions: {
          type: "object",
          description:
            "Dimension key-value pairs (e.g. {\"FunctionName\": \"my-fn\"}). Omit for aggregate across all.",
          additionalProperties: { type: "string" },
        },
        stat: {
          type: "string",
          description: "Statistic: Sum, Average, Maximum, Minimum, SampleCount (default: Sum)",
        },
        period: {
          type: "number",
          description: "Aggregation period in seconds (default: 300). Must be a multiple of 60.",
        },
        start_time: {
          type: "string",
          description: "Start time as ISO 8601 or relative shorthand (e.g. '-1h', '-6h')",
        },
        end_time: {
          type: "string",
          description: "End time as ISO 8601. Defaults to now.",
        },
      },
      required: ["namespace", "metric_name", "start_time"],
    },
  },
  {
    name: "cloudwatch_list_metrics",
    description:
      "List available CloudWatch metrics for a namespace. Use to discover what metrics exist before fetching data.",
    inputSchema: {
      type: "object",
      properties: {
        namespace: {
          type: "string",
          description: "CloudWatch namespace (e.g. 'AWS/Lambda')",
        },
        metric_name: {
          type: "string",
          description: "Optional metric name filter",
        },
      },
      required: ["namespace"],
    },
  },
];

function parseTime(t: string): Date {
  if (t.startsWith("-")) {
    const val = parseInt(t.slice(1, -1));
    const unit = t.slice(-1);
    const ms =
      unit === "h" ? val * 3_600_000 : unit === "m" ? val * 60_000 : val * 1_000;
    return new Date(Date.now() - ms);
  }
  return new Date(t);
}

export async function handleMetricsTool(
  name: string,
  args: Record<string, unknown>
) {
  if (name === "cloudwatch_get_metric") {
    const {
      namespace,
      metric_name,
      dimensions = {},
      stat = "Sum",
      period = 300,
      start_time,
      end_time,
    } = args as {
      namespace: string;
      metric_name: string;
      dimensions?: Record<string, string>;
      stat?: string;
      period?: number;
      start_time: string;
      end_time?: string;
    };

    const query: MetricDataQuery = {
      Id: "m1",
      MetricStat: {
        Metric: {
          Namespace: namespace,
          MetricName: metric_name,
          Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({
            Name,
            Value,
          })),
        },
        Period: period,
        Stat: stat,
      },
    };

    const res = await cloudwatchClient.send(
      new GetMetricDataCommand({
        MetricDataQueries: [query],
        StartTime: parseTime(start_time),
        EndTime: end_time ? parseTime(end_time) : new Date(),
      })
    );

    const result = res.MetricDataResults?.[0];
    const points = (result?.Timestamps ?? [])
      .map((ts, i) => ({
        timestamp: ts.toISOString(),
        value: result?.Values?.[i] ?? 0,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const output = {
      metric: `${namespace}/${metric_name}`,
      stat,
      periodSeconds: period,
      points,
    };

    return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }] };
  }

  if (name === "cloudwatch_list_metrics") {
    const { namespace, metric_name } = args as {
      namespace: string;
      metric_name?: string;
    };

    const res = await cloudwatchClient.send(
      new ListMetricsCommand({ Namespace: namespace, MetricName: metric_name })
    );

    const metrics = (res.Metrics ?? []).map((m) => ({
      name: m.MetricName,
      dimensions: Object.fromEntries(
        (m.Dimensions ?? []).map((d) => [d.Name, d.Value])
      ),
    }));

    return { content: [{ type: "text", text: JSON.stringify(metrics, null, 2) }] };
  }

  throw new Error(`Unknown metrics tool: ${name}`);
}
