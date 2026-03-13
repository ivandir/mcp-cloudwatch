import os
import boto3

region = os.environ.get("AWS_REGION", "us-east-1")
profile = os.environ.get("AWS_PROFILE")

session = boto3.Session(profile_name=profile, region_name=region)
cloudwatch = session.client("cloudwatch")
logs = session.client("logs")
