import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from neo4j import GraphDatabase
import boto3

# Neo4j credentials
NEO4J_URI = "neo4j+ssc://54962fce.databases.neo4j.io"
NEO4J_USERNAME = "54962fce"
NEO4J_PASSWORD = "GdGXsAWQEN-ax5a7Ws1SDtyWhsXaZVvVrcP9H50raM0"

# AWS Bedrock config
bedrock = boto3.client(
    service_name='bedrock-runtime',
    region_name='us-east-1'
)

def query_neo4j(cypher_query, params=None):
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
    try:
        with driver.session() as session:
            result = session.run(cypher_query, params or {})
            return [record.data() for record in result]
    except Exception as e:
        return {"error": str(e)}
    finally:
        driver.close()

def search_keyword(keyword):
    # Search for matching nodes
    node_query = """
    MATCH (n)
    WHERE n.id CONTAINS $keyword OR n.description CONTAINS $keyword
    RETURN n.id as id, labels(n)[0] as label, n.description as description
    LIMIT 10
    """
    nodes = query_neo4j(node_query, {"keyword": keyword})
    
    # Search for matching relationships
    rel_query = """
    MATCH (a)-[r]->(b)
    WHERE a.id CONTAINS $keyword OR b.id CONTAINS $keyword OR r.description CONTAINS $keyword
    RETURN a.id as source, type(r) as relationship, b.id as target, r.description as description
    LIMIT 15
    """
    relationships = query_neo4j(rel_query, {"keyword": keyword})
    
    return {
        "query": keyword,
        "nodes": nodes,
        "relationships": relationships
    }

def ask_graph_llm(user_question):
    # 1. Ask Bedrock to generate a Cypher query based on the graph schema
    schema_prompt = """You are a Neo4j Cypher expert. Generate ONLY a Cypher query to answer the user's question.
Do NOT include markdown, backticks, or any explanation. Output ONLY the query.

Database Schema Info:
- Nodes have labels: Section (มาตรา), Law (กฎหมาย), Role (บทบาท), Concept (แนวคิด), Organization (หน่วยงาน), Procedure (ขั้นตอน), Definition (คำนิยาม)
- Nodes have property 'id' which holds their name/identifier.
- Relationships connect them (e.g. DEFINES, APPLIES_TO, HAS_DUTY, GOVERNS, INCLUDES, REFERS_TO).

User Question: {question}

Cypher Query:"""
    
    try:
        response = bedrock.converse(
            modelId='amazon.nova-lite-v1:0',
            messages=[{"role": "user", "content": [{"text": schema_prompt.format(question=user_question)}]}],
            inferenceConfig={"maxTokens": 500, "temperature": 0.0}
        )
        cypher_query = response['output']['message']['content'][0]['text'].strip()
        
        # Clean query if LLM wrapped in backticks
        if cypher_query.startswith("```"):
            lines = cypher_query.split("\n")
            cypher_query = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
        cypher_query = cypher_query.strip()
        
        print(f"Generated Cypher: {cypher_query}")
        
        # 2. Run the Cypher query
        db_results = query_neo4j(cypher_query)
        
        # 3. Format the results as text context
        if isinstance(db_results, dict) and "error" in db_results:
            return f"Error executing query: {db_results['error']}"
            
        return {
            "question": user_question,
            "generated_cypher": cypher_query,
            "facts": db_results
        }
    except Exception as e:
        return {"error": str(e)}

class DifyBridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress default console logs to keep stdout clean
        return

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response_data = {}
        
        if path == "/search":
            q = query_params.get('q', [''])[0]
            if q:
                response_data = search_keyword(q)
            else:
                response_data = {"error": "Missing parameter 'q'"}
                
        elif path == "/ask":
            q = query_params.get('q', [''])[0]
            if q:
                response_data = ask_graph_llm(q)
            else:
                response_data = {"error": "Missing parameter 'q'"}
        else:
            response_data = {
                "message": "Neo4j Dify API Bridge is running!",
                "endpoints": {
                    "/search?q=<keyword>": "Retrieves matching nodes and edges for keyword search",
                    "/ask?q=<question>": "Uses Bedrock to query the Knowledge Graph and return raw facts"
                }
            }
            
        self.wfile.write(json.dumps(response_data, ensure_ascii=False, indent=2).encode('utf-8'))

def run(port=8080):
    server_address = ('', port)
    httpd = HTTPServer(server_address, DifyBridgeHandler)
    print(f"Starting Neo4j Dify Bridge on port {port}...")
    print(f"Test URL: http://localhost:{port}/search?q=ละเมิด")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run(port)
