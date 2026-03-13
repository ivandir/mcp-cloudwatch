import {
  DescribeAlarmsCommand,
  type StateValue,
} from "@aws-sdk/client-cloudwatch";
import { cloudwatchClient } from "../client.js";

export const alarmsTools = [
  {
    name: "cloudwatch_list_alarms",
    description:
      "List CloudWatch alarms with their current state, reason, and associated metric. Filter by state to quickly surface what is firing during an incident.",
    inputSchema: {
      type: "object",
      properties: {
        state: {
          type: "string",
          enum: ["OK", "ALARM", "INSUFFICIENT_DATA"],
          description:
            "Filter by alarm state. Omit to return all alarms. Use 'ALARM' during incident triage.",
        },
        prefix: {
          type: "string",
          description: "Filter alarms whose names start with this prefix",
        },
        limit: {
          type: "number",
          description: "Max alarms to return (default 50)",
        },
      },
    },
  },
];

export async function handleAlarmsTool(
  name: string,
  args: Record<string, unknown>
) {
  if (name === "cloudwatch_list_alarms") {
    const { state, prefix, limit = 50 } = args as {
      state?: string;
      prefix?: string;
      limit?: number;
    };

    const res = await cloudwatchClient.send(
      new DescribeAlarmsCommand({
        StateValue: state as StateValue | undefined,
        AlarmNamePrefix: prefix,
        MaxRecords: limit,
      })
    );

    const alarms = (res.MetricAlarms ?? []).map((a) => ({
      name: a.AlarmName,
      state: a.StateValue,
      reason: a.StateReason,
      metric: a.MetricName ? `${a.Namespace}/${a.MetricName}` : undefined,
      dimensions: Object.fromEntries(
        (a.Dimensions ?? []).map((d) => [d.Name, d.Value])
      ),
      threshold: a.Threshold,
      comparisonOperator: a.ComparisonOperator,
      updatedAt: a.StateUpdatedTimestamp?.toISOString(),
    }));

    return { content: [{ type: "text", text: JSON.stringify(alarms, null, 2) }] };
  }

  throw new Error(`Unknown alarms tool: ${name}`);
}
