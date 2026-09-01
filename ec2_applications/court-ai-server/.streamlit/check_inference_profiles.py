
import boto3
from src.utils import load_secret
from src.config import REGION

try:
    aws_access_key = load_secret("AWS_ACCESS_KEY")
    aws_secret_key = load_secret("AWS_SECRET_KEY")

    if not aws_access_key:
        print("❌ AWS Keys not found")
        exit(1)

    bedrock = boto3.client(
        service_name='bedrock',
        region_name=REGION,
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key
    )

    print(f"🔍 Checking Inference Profiles in {REGION}...")
    response = bedrock.list_inference_profiles()

    for profile in response.get('inferenceProfileSummaries', []):
        name = profile.get('inferenceProfileName')
        p_id = profile.get('inferenceProfileId')
        # ARN might be needed if ID isn't enough, but usually ID or ARN works.
        # Let's print both just in case or just the summary.
        print(f"- {name} (ID: {p_id})")
        # Check models inside if possible (list_inference_profiles usually just gives summaries)

except Exception as e:
    print(f"❌ Error: {e}")
