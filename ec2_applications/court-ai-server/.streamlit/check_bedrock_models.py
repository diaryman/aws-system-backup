
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

    print(f"🔍 Checking Bedrock Models in {REGION}...")
    response = bedrock.list_foundation_models(byProvider='anthropic')

    for model in response.get('modelSummaries', []):
        model_id = model['modelId']
        model_name = model['modelName']
        print(f"- {model_name} (ID: {model_id})")

except Exception as e:
    print(f"❌ Error: {e}")
