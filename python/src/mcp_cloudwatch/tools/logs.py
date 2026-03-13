import json
import time
from datetime import timezone

from ..client import logs
from ..util import parse_time


def query_logs(
    log_group_names: list[str],
    query: str,
    start_time: str | None = None,
    end_time: str | None = None,
) -> str:
    start = int(parse_time(start_time, default_offset_hours=-1).timestamp())
    end = int(parse_time(end_time, default_offset_hours=0).timestamp())

    response = logs.start_query(
        logGroupNames=log_group_names,
        startTime=start,
        endTime=end,
        queryString=query,
    )
    query_id = response["queryId"]

    # Poll until complete (max 30s)
    for _ in range(30):
        result = logs.get_query_results(queryId=query_id)
        status = result["status"]
        if status == "Complete":
            rows = [
                {field["field"]: field["value"] for field in row}
                for row in result["results"]
            ]
            return json.dumps(rows, indent=2)
        if status in ("Failed", "Cancelled", "Timeout"):
            return json.dumps({"error": f"Query ended with status: {status}"})
        time.sleep(1)

    return json.dumps({"error": "Query timed out after 30 seconds"})


def get_log_events(
    log_group_name: str,
    log_stream_name: str | None = None,
    filter_pattern: str | None = None,
    start_time: str | None = None,
    limit: int = 50,
) -> str:
    start = int(parse_time(start_time, default_offset_hours=-1).timestamp() * 1000)

    kwargs: dict = {
        "logGroupName": log_group_name,
        "startTime": start,
        "limit": limit,
    }
    if log_stream_name:
        kwargs["logStreamNames"] = [log_stream_name]
    if filter_pattern:
        kwargs["filterPattern"] = filter_pattern

    response = logs.filter_log_events(**kwargs)
    events = [
        {
            "timestamp": e["timestamp"],
            "logStreamName": e["logStreamName"],
            "message": e["message"].rstrip(),
        }
        for e in response.get("events", [])
    ]
    return json.dumps(events, indent=2)


def list_log_groups(prefix: str | None = None, limit: int = 20) -> str:
    kwargs: dict = {"limit": limit}
    if prefix:
        kwargs["logGroupNamePrefix"] = prefix

    response = logs.describe_log_groups(**kwargs)
    groups = [
        {
            "logGroupName": g["logGroupName"],
            "retentionInDays": g.get("retentionInDays"),
            "storedBytes": g.get("storedBytes", 0),
        }
        for g in response.get("logGroups", [])
    ]
    return json.dumps(groups, indent=2)
