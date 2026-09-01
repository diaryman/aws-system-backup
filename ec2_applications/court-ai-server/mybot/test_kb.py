import os
import sys

# Change working directory to /app or mybot
os.chdir('/home/ubuntu/mybot')
sys.path.insert(0, os.getcwd())

# Load secrets.toml and set environment variables
secrets = {}
with open('.streamlit/secrets.toml', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            secrets[k.strip()] = v.strip().strip('"').strip('\'')

for k, v in secrets.items():
    os.environ[k] = v

from src.services import retrieve_context, call_single_model

prompt = 'ศาลปกครองชั้นต้น มีกี่แห่ง'
kb_id = 'UHX3CVMTKL'

print('--- Retrieving Context ---')
ctx, citations = retrieve_context(prompt, kb_id)
print('Retrieved Chunks:')
print(ctx)
print('Citations:')
print(citations)

print('--- Calling Model ---')
# Let's call Gemini Pro (Nova Pro)
res = call_single_model('Gemini Pro', prompt, ctx, citations, temperature=0.2)
print('Answer:')
print(res['answer'])
