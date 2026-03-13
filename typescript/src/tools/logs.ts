import {
  StartQueryCommand,
  GetQueryResultsCommand,
  FilterLogEventsCommand,
  DescribeLogGroupsCommand,
  QueryStatus,
} from "@aws-sdk/client-cloudwatch-logs";
import { logsClient } from "../client.js";

export const logsTools = [
  {
    name: "cloudwatch_query_logs",
    description:
      "Run a CloudWatch Logs Insights query and return results. Use for searching across log groups by pattern and time range. Polls until the query completes.",
    inputSchema: {
      type: "object",
      properties: {
        log_group_names: {
          type: "array",
          items: { type: "string" },
          description: "Log group names to query (e.g. [\"/aws/lambda/my-fn\"])",
        },
        query: {
          type: "string",
          description:
            "Logs Insights query string (e.g. 'fields @timestamp, @message | filter @message like /ERROR/ | limit 20')",
        },
        start_time: {
          type: "string",
          description:
            "Start time as ISO 8601 (e.g. '2024-01-01T00:00:00Z') or relative shorthand (e.g. '-1h', '-30m')",
        },
        end_time: {
          type: "string",
          description: "End time as ISO 8601. Defaults to now.",
        },
      },
      required: ["log_group_names", "query", "start_time"],
    },
  },
  {
    name: "cloudwatch_get_log_events",
    description:
      "Fetch recent log events from a log group, optionally scoped to a stream and filtered by pattern. Use for tailing or spot-checking logs during debugging.",
    inputSchema: {
      type: "object",
      properties: {
        log_group_name: {
          type: "string",
          description: "Log group name",
        },
        log_stream_name: {
          type: "string",
          description: "Log stream name (omit to search across all streams)",
        },
        filter_pattern: {
          type: "string",
          description: "CloudWatch filter pattern (e.g. 'ERROR', '[timestamp, level=ERROR, ...]')",
        },
        limit: {
          type: "number",
          description: "Max events to return (default 50, max 10000)",
        },
      },
      required: ["log_group_name"],
    },
  },
  {
    name: "cloudwatch_list_log_groups",
    description: "List available CloudWatch log groups, optionally filtered by name prefix.",
    inputSchema: {
      type: "object",
      properties: {
        prefix: {
          type: "string",
          description: "Log group name prefix filter (e.g. '/aws/lambda')",
        },
        limit: {
          type: "number",
          description: "Max groups to return (default 20)",
        },
      },
    },
  },
];

function parseTimeToEpochSeconds(t: string): number {
  if (t.startsWith("-")) {
    const val = parseInt(t.slice(1, -1));
    const unit = t.slice(-1);
    const ms =
      unit === "h" ? val * 3_600_000 : unit === "m" ? val * 60_000 : val * 1_000;
    return Math.floor((Date.now() - ms) / 1000);
  }
  return Math.floor(new Date(t).getTime() / 1000);
}

export async function handleLogsTool(
  name: string,
  args: Record<string, unknown>
) {
  if (name === "cloudwatch_query_logs") {
    const { log_group_names, query, start_time, end_time } = args as {
      log_group_names: string[];
      query: string;
      start_time: string;
      end_time?: string;
    };

    const startSec = parseTimeToEpochSeconds(start_time);
    const endSec = end_time ? parseTimeToEpochSeconds(end_time) : Math.floor(Date.now() / 1000);

    const { queryId } = await logsClient.send(
      new StartQueryCommand({
        logGroupNames: log_group_names,
        queryString: query,
        startTime: startSec,
        endTime: endSec,
      })
    );

    // Poll until complete (max 30s)
    let results;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const res = await logsClient.send(new GetQueryResultsCommand({ queryId }));
      if (
        res.status === QueryStatus.Complete ||
        res.status === QueryStatus.Failed ||
        res.status === QueryStatus.Cancelled
      ) {
        results = res.results ?? [];
        break;
      }
    }

    const rows = (results ?? []).map((row) =>
      Object.fromEntries(row.map((f) => [f.field ?? "", f.value ?? ""]))
    );

    return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
  }

  if (name === "cloudwatch_get_log_events") {
    const { log_group_name, log_stream_name, filter_pattern, limit = 50 } = args as {
      log_group_name: string;
      log_stream_name?: string;
      filter_pattern?: string;
      limit?: number;
    };

    const res = await logsClient.send(
      new FilterLogEventsCommand({
        logGroupName: log_group_name,
        logStreamNames: log_stream_name ? [log_stream_name] : undefined,
        filterPattern: filter_pattern,
        limit,
      })
    );

    const events = (res.events ?? []).map((e) => ({
      timestamp: new Date(e.timestamp!).toISOString(),
      stream: e.logStreamName,
      message: e.message?.trim(),
    }));

    return { content: [{ type: "text", text: JSON.stringify(events, null, 2) }] };
  }

  if (name === "cloudwatch_list_log_groups") {
    const { prefix, limit = 20 } = args as { prefix?: string; limit?: number };

    const res = await logsClient.send(
      new DescribeLogGroupsCommand({ logGroupNamePrefix: prefix, limit })
    );

    const groups = (res.logGroups ?? []).map((g) => ({
      name: g.logGroupName,
      retentionDays: g.retentionInDays ?? "never expires",
      storedMB: g.storedBytes ? Math.round(g.storedBytes / 1_048_576) : 0,
    }));

    return { content: [{ type: "text", text: JSON.stringify(groups, null, 2) }] };
  }

  throw new Error(`Unknown logs tool: ${name}`);
}
