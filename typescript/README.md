# mcp-cloudwatch

MCP server for AWS CloudWatch — query metrics, logs, and alarms directly from Claude Code.

Gives Claude read-only access to your production observability data. Designed for incident response, performance debugging, and log investigation without leaving your editor.

## Tools

| Tool | What it does |
| --- | --- |
| `cloudwatch_query_logs` | Run a Logs Insights query across one or more log groups |
| `cloudwatch_get_log_events` | Tail or filter events from a log group/stream |
| `cloudwatch_list_log_groups` | Discover available log groups by prefix |
| `cloudwatch_get_metric` | Fetch a metric time series (errors, latency, throughput, etc.) |
| `cloudwatch_list_metrics` | List metrics available in a namespace |
| `cloudwatch_list_alarms` | List alarm states — filter to `ALARM` during incident triage |

## Install

```bash
npm install
npm run build
```

## Usage

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cloudwatch": {
      "command": "node",
      "args": ["/path/to/mcp-cloudwatch/dist/index.js"],
      "env": {
        "AWS_REGION": "us-east-1",
        "AWS_PROFILE": "my-profile"
      }
    }
  }
}
```

### Claude Code CLI

Claude Code reads from `~/.claude/claude_desktop_config.json` (global) or a `.mcp.json` file at your project root (per-project). The `/mcp` slash command will only show servers registered in one of these — **not** from `.vscode/mcp.json`.

Register globally:

```bash
claude mcp add cloudwatch node /path/to/mcp-cloudwatch/typescript/dist/index.js
```

Or add a `.mcp.json` at your project root for a per-repo setup:

```json
{
  "mcpServers": {
    "cloudwatch": {
      "command": "node",
      "args": ["./repos/mcp-cloudwatch/typescript/dist/index.js"],
      "env": {
        "AWS_REGION": "us-east-1",
        "AWS_PROFILE": "my-profile"
      }
    }
  }
}
```

### VS Code

VS Code reads from `.vscode/mcp.json` in your workspace. This is separate from the Claude Code CLI config — servers added here will not appear in `/mcp`.

Create `.vscode/mcp.json`:

```json
{
  "servers": {
    "cloudwatch": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/mcp-cloudwatch/typescript/dist/index.js"],
      "env": {
        "AWS_REGION": "us-east-1",
        "AWS_PROFILE": "my-profile"
      }
    }
  }
}
```

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **MCP: List Servers** to confirm it is connected.

## Authentication

Uses the standard AWS credential chain — no config required if you already have:

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` env vars, or
- An AWS profile (`~/.aws/credentials`), or
- An IAM instance role (EC2/ECS/Lambda)

Set `AWS_REGION` to target the correct region (default: `us-east-1`).

## Required IAM Permissions

Minimum read-only policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricData",
        "cloudwatch:ListMetrics",
        "cloudwatch:DescribeAlarms",
        "logs:StartQuery",
        "logs:GetQueryResults",
        "logs:FilterLogEvents",
        "logs:DescribeLogGroups"
      ],
      "Resource": "*"
    }
  ]
}
```

## Example prompts

```text
Which Lambda functions had errors in the last hour?
→ cloudwatch_query_logs on /aws/lambda/* with filter @message like /ERROR/

Show me the p99 latency for my API Gateway over the last 6 hours
→ cloudwatch_get_metric AWS/ApiGateway IntegrationLatency p99

What alarms are currently firing?
→ cloudwatch_list_alarms state=ALARM
```

## Development

```bash
npm run dev     # run with tsx (no build step)
npm run build   # compile to dist/
npm run typecheck
```
