# mcp-cloudwatch

MCP server for AWS CloudWatch — query metrics, logs, and alarms from Claude Code.

Two implementations, same tools:

| | TypeScript | Python |
| --- | --- | --- |
| Directory | [`typescript/`](typescript/) | [`python/`](python/) |
| Runtime | Node.js ≥18 | Python ≥3.11 |
| AWS SDK | `@aws-sdk/client-cloudwatch` | `boto3` |
| MCP SDK | `@modelcontextprotocol/sdk` | `mcp[cli]` |

## Tools

| Tool | What it does |
| --- | --- |
| `cloudwatch_query_logs` | Run a Logs Insights query across one or more log groups |
| `cloudwatch_get_log_events` | Tail or filter events from a log group/stream |
| `cloudwatch_list_log_groups` | Discover available log groups by prefix |
| `cloudwatch_get_metric` | Fetch a metric time series (errors, latency, throughput, etc.) |
| `cloudwatch_list_metrics` | List metrics available in a namespace |
| `cloudwatch_list_alarms` | List alarm states — filter to `ALARM` during incident triage |

## Setup

Each implementation supports Claude Desktop, Claude Code CLI, and VS Code (`mcp.json`). See the implementation README for full install and config steps:

- [typescript/README.md](typescript/README.md)
- [python/README.md](python/README.md)
