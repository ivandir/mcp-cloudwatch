import json

from ..client import cloudwatch
from ..util import parse_time


def get_metric(
    namespace: str,
    metric_name: str,
    dimensions: list[dict] | None = None,
    stat: str = "Sum",
    period: int = 300,
    start_time: str | None = None,
    end_time: str | None = None,
) -> str:
    start = parse_time(start_time, default_offset_hours=-1)
    end = parse_time(end_time, default_offset_hours=0)

    metric_stat: dict = {
        "Metric": {
            "Namespace": namespace,
            "MetricName": metric_name,
        },
        "Period": period,
        "Stat": stat,
    }
    if dimensions:
        metric_stat["Metric"]["Dimensions"] = dimensions

    response = cloudwatch.get_metric_data(
        MetricDataQueries=[
            {
                "Id": "m1",
                "MetricStat": metric_stat,
            }
        ],
        StartTime=start,
        EndTime=end,
    )

    result = response["MetricDataResults"][0]
    points = sorted(
        [
            {"timestamp": t.isoformat(), "value": v}
            for t, v in zip(result["Timestamps"], result["Values"])
        ],
        key=lambda x: x["timestamp"],
    )
    return json.dumps({"label": result.get("Label", metric_name), "points": points}, indent=2)


def list_metrics(namespace: str, metric_name: str | None = None) -> str:
    kwargs: dict = {"Namespace": namespace}
    if metric_name:
        kwargs["MetricName"] = metric_name

    response = cloudwatch.list_metrics(**kwargs)
    metrics = [
        {
            "metricName": m["MetricName"],
            "namespace": m["Namespace"],
            "dimensions": m.get("Dimensions", []),
        }
        for m in response.get("Metrics", [])
    ]
    return json.dumps(metrics, indent=2)
