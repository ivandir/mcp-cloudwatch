import json
import sys

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent, CallToolResult

from .tools.logs import query_logs, get_log_events, list_log_groups
from .tools.metrics import get_metric, list_metrics
from .tools.alarms import list_alarms

app = Server("mcp-cloudwatch")

TOOLS: list[Tool] = [
    Tool(
        name="cloudwatch_query_logs",
        description="Run a CloudWatch Logs Insights query across one or more log groups.",
        inputSchema={
            "type": "object",
            "required": ["log_group_names", "query"],
            "properties": {
                "log_group_names": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Log group names to query (supports wildcards on some regions)",
                },
                "query": {
                    "type": "string",
                    "description": "CloudWatch Logs Insights query string",
                },
                "start_time": {
                    "type": "string",
                    "description": "ISO 8601 timestamp or relative like -1h, -30m, -2d (default: -1h)",
                },
                "end_time": {
                    "type": "string",
                    "description": "ISO 8601 timestamp or relative time (default: now)",
                },
            },
        },
    ),
    Tool(
        name="cloudwatch_get_log_events",
        description="Fetch or tail log events from a log group, optionally filtered by stream or pattern.",
        inputSchema={
            "type": "object",
            "required": ["log_group_name"],
            "properties": {
                "log_group_name": {"type": "string"},
                "log_stream_name": {"type": "string"},
                "filter_pattern": {
                    "type": "string",
                    "description": "CloudWatch filter pattern (e.g. ERROR, [ip, id, status_code=5*])",
                },
                "start_time": {
                    "type": "string",
                    "description": "ISO 8601 or relative like -1h (default: -1h)",
                },
                "limit": {"type": "integer", "default": 50},
            },
        },
    ),
    Tool(
        name="cloudwatch_list_log_groups",
        description="Discover available CloudWatch log groups, optionally filtered by prefix.",
        inputSchema={
            "type": "object",
            "properties": {
                "prefix": {"type": "string"},
                "limit": {"type": "integer", "default": 20},
            },
        },
    ),
    Tool(
        name="cloudwatch_get_metric",
        description="Fetch a CloudWatch metric time series (errors, latency, throughput, etc.).",
        inputSchema={
            "type": "object",
            "required": ["namespace", "metric_name"],
            "properties": {
                "namespace": {"type": "string", "description": "e.g. AWS/Lambda, AWS/ApiGateway"},
                "metric_name": {"type": "string", "description": "e.g. Errors, Duration, Invocations"},
                "dimensions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "Name": {"type": "string"},
                            "Value": {"type": "string"},
                        },
                    },
                },
                "stat": {
                    "type": "string",
                    "default": "Sum",
                    "description": "Sum, Average, Maximum, Minimum, SampleCount, or p99 etc.",
                },
                "period": {"type": "integer", "default": 300, "description": "Aggregation window in seconds"},
                "start_time": {"type": "string"},
                "end_time": {"type": "string"},
            },
        },
    ),
    Tool(
        name="cloudwatch_list_metrics",
        description="List metrics available in a CloudWatch namespace.",
        inputSchema={
            "type": "object",
            "required": ["namespace"],
            "properties": {
                "namespace": {"type": "string"},
                "metric_name": {"type": "string", "description": "Optional filter by metric name"},
            },
        },
    ),
    Tool(
        name="cloudwatch_list_alarms",
        description="List CloudWatch alarm states. Filter to state=ALARM during incident triage.",
        inputSchema={
            "type": "object",
            "properties": {
                "state": {
                    "type": "string",
                    "enum": ["OK", "ALARM", "INSUFFICIENT_DATA"],
                },
                "prefix": {"type": "string"},
                "limit": {"type": "integer", "default": 50},
            },
        },
    ),
]


@app.list_tools()
async def list_tools() -> list[Tool]:
    return TOOLS


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:
        if name == "cloudwatch_query_logs":
            text = query_logs(**arguments)
        elif name == "cloudwatch_get_log_events":
            text = get_log_events(**arguments)
        elif name == "cloudwatch_list_log_groups":
            text = list_log_groups(**arguments)
        elif name == "cloudwatch_get_metric":
            text = get_metric(**arguments)
        elif name == "cloudwatch_list_metrics":
            text = list_metrics(**arguments)
        elif name == "cloudwatch_list_alarms":
            text = list_alarms(**arguments)
        else:
            text = json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as exc:
        text = json.dumps({"error": str(exc)})

    return [TextContent(type="text", text=text)]


async def _run() -> None:
    async with stdio_server() as (read, write):
        await app.run(read, write, app.create_initialization_options())


def main() -> None:
    import asyncio
    asyncio.run(_run())
