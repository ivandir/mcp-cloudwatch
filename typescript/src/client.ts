import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";

const region = process.env.AWS_REGION ?? "us-east-1";

export const cloudwatchClient = new CloudWatchClient({ region });
export const logsClient = new CloudWatchLogsClient({ region });
