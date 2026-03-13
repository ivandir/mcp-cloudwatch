#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logsTools, handleLogsTool } from "./tools/logs.js";
import { metricsTools, handleMetricsTool } from "./tools/metrics.js";
import { alarmsTools, handleAlarmsTool } from "./tools/alarms.js";

const server = new Server(
  { name: "mcp-cloudwatch", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const allTools = [...logsTools, ...metricsTools, ...alarmsTools];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  if (logsTools.some((t) => t.name === name))
    return handleLogsTool(name, args as Record<string, unknown>);

  if (metricsTools.some((t) => t.name === name))
    return handleMetricsTool(name, args as Record<string, unknown>);

  if (alarmsTools.some((t) => t.name === name))
    return handleAlarmsTool(name, args as Record<string, unknown>);

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
