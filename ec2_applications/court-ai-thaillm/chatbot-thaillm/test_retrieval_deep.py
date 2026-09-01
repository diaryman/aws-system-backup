#!/usr/bin/env python3
"""Deep test of KB retrieval to diagnose why FAQ is not found."""
from src.services import get_aws_agent

agent = get_aws_agent()

queries = [
    "ศาลปกครองชั้นต้นมีกี่แห่ง",
    "ศาลชั้นต้นมีกี่แห่ง",
    "จำนวนศาลปกครอง 15 แห่ง",
    "ศาลปกครองชั้นต้น 15 แห่ง",
    "FAQ ศาลปกครอง จำนวน",
]

for q in queries:
    print(f"\n{'='*60}")
    print(f"QUERY: {q}")
    print(f"{'='*60}")
    try:
        res = agent.retrieve(
            knowledgeBaseId="UHX3CVMTKL",
            retrievalQuery={"text": q},
            retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 10}}
        )
        results = res.get("retrievalResults", [])
        print(f"Total results: {len(results)}")
        for i, r in enumerate(results):
            score = r.get("score", "N/A")
            uri = r.get("location", {}).get("s3Location", {}).get("uri", "Unknown")
            fname = uri.split("/")[-1]
            text = r["content"]["text"][:200].replace("\n", " ")
            print(f"  [{i+1}] score={score} | file={fname}")
            print(f"      text: {text}")
    except Exception as e:
        print(f"  ERROR: {e}")
