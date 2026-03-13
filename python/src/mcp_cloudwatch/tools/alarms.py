import json

from ..client import cloudwatch


def list_alarms(
    state: str | None = None,
    prefix: str | None = None,
    limit: int = 50,
) -> str:
    kwargs: dict = {"MaxRecords": limit}
    if state:
        kwargs["StateValue"] = state
    if prefix:
        kwargs["AlarmNamePrefix"] = prefix

    response = cloudwatch.describe_alarms(**kwargs)
    alarms = [
        {
            "name": a["AlarmName"],
            "state": a["StateValue"],
            "reason": a.get("StateReason", ""),
            "metric": a.get("MetricName"),
            "namespace": a.get("Namespace"),
            "dimensions": a.get("Dimensions", []),
            "threshold": a.get("Threshold"),
            "comparisonOperator": a.get("ComparisonOperator"),
            "updatedAt": a["StateUpdatedTimestamp"].isoformat()
            if "StateUpdatedTimestamp" in a
            else None,
        }
        for a in response.get("MetricAlarms", [])
    ]
    return json.dumps(alarms, indent=2)
