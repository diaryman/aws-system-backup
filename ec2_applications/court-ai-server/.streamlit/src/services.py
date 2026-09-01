# src/services.py
import boto3
import json
import time
import pandas as pd
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from openai import OpenAI
import google.generativeai as genai
import os
from datetime import datetime
import streamlit as st

from src.config import REGION, MODELS, SYSTEM_PROMPT, THB_RATE, MODEL_PRICING, SHEET_NAME
from src.utils import load_secret

# Initialize Secrets
AWS_ACCESS_KEY = load_secret("AWS_ACCESS_KEY")
AWS_SECRET_KEY = load_secret("AWS_SECRET_KEY")
DEEPSEEK_API_KEY = load_secret("DEEPSEEK_API_KEY")
GEMINI_API_KEY = load_secret("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ==========================================
# 🔌 CLIENT FACTORIES
# ==========================================

@st.cache_resource
def get_aws_runtime():
    if not AWS_ACCESS_KEY: return None
    return boto3.client(
        'bedrock-runtime', 
        region_name=REGION, 
        aws_access_key_id=AWS_ACCESS_KEY, 
        aws_secret_access_key=AWS_SECRET_KEY
    )

@st.cache_resource
def get_aws_agent():
    if not AWS_ACCESS_KEY: return None
    return boto3.client(
        'bedrock-agent-runtime', 
        region_name=REGION, 
        aws_access_key_id=AWS_ACCESS_KEY, 
        aws_secret_access_key=AWS_SECRET_KEY
    )

@st.cache_resource
def get_deepseek_client():
    if not DEEPSEEK_API_KEY: return None
    return OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")

def get_sheet_client():
    try:
        # Check if credentials file exists
        if not os.path.exists('credentials.json'):
            st.error("❌ File 'credentials.json' not found.")
            return None
            
        scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
        creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
        client = gspread.authorize(creds)
        return client.open(SHEET_NAME).sheet1
    except Exception as e:
        print(f"❌ Connection Error: {e}") # Log to console for debugging
        return None

# ==========================================
# 🧠 LOGIC FUNCTIONS
# ==========================================

def retrieve_context(query, kb_id):
    """Retrieves relevant context from AWS Bedrock Knowledge Base."""
    if not kb_id: 
        return "", {}
    
    agent = get_aws_agent()
    if not agent: 
        return "", {}

    try:
        res = agent.retrieve(
            knowledgeBaseId=kb_id, 
            retrievalQuery={'text': query}, 
            retrievalConfiguration={'vectorSearchConfiguration': {'numberOfResults': 5}}
        )
        ctx = ""
        citation_details = {}
        
        if 'retrievalResults' in res:
            for r in res['retrievalResults']:
                text_chunk = r['content']['text']
                ctx += f"- {text_chunk}\n"
                
                # Extract filename safely
                uri = r.get('location', {}).get('s3Location', {}).get('uri', 'Unknown')
                fname = uri.split('/')[-1]
                
                if fname not in citation_details:
                    citation_details[fname] = text_chunk[:200].replace('\n', ' ') + "..."
                    
        return ctx, citation_details
    except Exception as e: 
        print(f"KB Error ({kb_id}): {e}")
        return "", {}

def calculate_cost(model_id, full_text_in, full_text_out):
    """Estimates cost in THB."""
    pricing = MODEL_PRICING.get(model_id, [0, 0])
    in_tokens = len(full_text_in) / 3.0 
    out_tokens = len(full_text_out) / 3.0
    cost = (in_tokens/1e6 * pricing[0]) + (out_tokens/1e6 * pricing[1])
    return cost * THB_RATE

def call_single_model(model_name, prompt, context, citations_dict, temperature=0.5, placeholder=None):
    """Invokes a single AI model, optionally streaming output to a placeholder."""
    cfg = MODELS[model_name]
    full_input = f"{SYSTEM_PROMPT}\n\nContext:\n{context}\n\nUser Question: {prompt}"
    answer = ""
    start_time = time.time()
    
    try:
        # --- BEDROCK ---
        if cfg["type"] == "bedrock":
            runtime = get_aws_runtime()
            if not runtime: raise ValueError("AWS Credentials missing")
            
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31", 
                "max_tokens": 2048, "temperature": temperature,
                "messages": [{"role": "user", "content": full_input}]
            })
            
            if placeholder:
                response = runtime.invoke_model_with_response_stream(modelId=cfg["id"], body=body)
                stream = response.get('body')
                if stream:
                    for event in stream:
                        chunk = event.get('chunk')
                        if chunk:
                            chunk_json = json.loads(chunk.get('bytes').decode())
                            if 'delta' in chunk_json and 'text' in chunk_json['delta']:
                                text_chunk = chunk_json['delta']['text']
                                answer += text_chunk
                                placeholder.markdown(answer + "▌")
                    placeholder.markdown(answer)
            else:
                res = runtime.invoke_model(modelId=cfg["id"], body=body)
                answer = json.loads(res.get('body').read())['content'][0]['text']

        # --- DEEPSEEK & SELF-HOSTED ---
        elif cfg["type"] in ["deepseek", "deepseek_self_hosted"]:
            if cfg["type"] == "deepseek":
                client = get_deepseek_client()
            else:
                 # Hardcoded IP needs to be verified or moved to config if dynamic
                client = OpenAI(base_url="http://3.235.65.4:11434/v1", api_key="ollama", timeout=120.0)
            
            if not client: raise ValueError("Client not initialized")
            
            if placeholder:
                stream = client.chat.completions.create(
                    model=cfg["id"], temperature=temperature,
                    messages=[{"role": "user", "content": full_input}],
                    stream=True
                )
                for chunk in stream:
                    if chunk.choices[0].delta.content is not None:
                        answer += chunk.choices[0].delta.content
                        placeholder.markdown(answer + "▌")
                placeholder.markdown(answer)
            else:
                res = client.chat.completions.create(
                    model=cfg["id"], temperature=temperature,
                    messages=[{"role": "user", "content": full_input}]
                )
                answer = res.choices[0].message.content

        # --- GEMINI ---
        elif cfg["type"] == "gemini":
            if not GEMINI_API_KEY: raise ValueError("Gemini Key missing")
            gen_cfg = genai.GenerationConfig(temperature=temperature)
            model = genai.GenerativeModel(cfg["id"])
            
            if placeholder:
                response = model.generate_content(full_input, generation_config=gen_cfg, stream=True)
                for chunk in response:
                    answer += chunk.text
                    placeholder.markdown(answer + "▌")
                placeholder.markdown(answer)
            else:
                answer = model.generate_content(full_input, generation_config=gen_cfg).text
            
    except Exception as e:
        answer = f"⚠️ Error: {str(e)}"
        if placeholder: placeholder.error(answer)
    
    elapsed = time.time() - start_time
    
    return {
        "model": model_name, 
        "answer": answer, 
        "citations": citations_dict, 
        "cost": calculate_cost(cfg["id"], full_input, answer), 
        "config": cfg, 
        "time": elapsed
    }

def save_to_sheet(username, q, r_left, r_right, kb_left="", kb_right=""):
    try:
        sheet = get_sheet_client()
        if sheet is None: return
        
        # Check and add headers if needed (for safe schema evolution)
        headers = sheet.row_values(1)
        row = [
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 
            username, 
            q,
            kb_left,                 # KB_Left
            r_left['model'],         # Model_Left
            r_left['answer'],        # Answer_Left
            "",                      # Feedback_Left
            f"{r_left['cost']:.4f}", # Cost_Model_Left
            kb_right,                # KB_Right
            r_right['model'],        # Model_Right
            r_right['answer'],       # Answer_Right
            "",                      # Feedback_Right
            f"{r_right['cost']:.4f}" # Cost_Model_Right
        ]
        sheet.append_row(row)
    except Exception as e: 
        print(f"❌ Error saving: {e}")

def save_feedback(username, prompt, model, score, answer_text=""):
    try:
        sheet = get_sheet_client() # Gets the main sheet
        if sheet is None: return
        
        # Valid score is 1-5, already passed as arg
        feedback_val = str(score)
        
        # Fetch all data to find the row
        # Warning: get_all_values() can be expensive if data is huge. 
        # Ideally, we might limit this, but for now it's functional.
        data = sheet.get_all_values()
        
        # Iterate backwards to find the latest matching conversation
        # Data structure: [Timestamp, User, Q, KB_L, Mod_L, Ans_L, FB_L, Cost_L, KB_R, Mod_R, Ans_R, FB_R, Cost_R]
        # Indices (0-based list):
        # User=1, Question=2
        # Ans_L=5, FB_L=6 (Col 7)
        # Ans_R=10, FB_R=11 (Col 12)
        
        target_row_index = -1
        target_col_index = -1
        
        # Search from bottom up
        for i in range(len(data) - 1, -1, -1):
            row = data[i]
            
            # Basic verification (length check)
            if len(row) < 13: continue
            
            # Match User and Prompt
            # Using simple string match. In production, might need fuzzy matching or ID.
            if row[1] == username and row[2] == prompt:
                
                # Check Left Side
                # We check compatibility of answer (sometimes exact match might fail due to formatting, so we compare first 50 chars or contain check)
                # row[5] is Answer_Left
                if row[5] == answer_text:
                    target_row_index = i + 1 # Sheet is 1-based
                    target_col_index = 7     # Feedback_Left Column
                    break
                
                # Check Right Side
                # row[10] is Answer_Right
                if row[10] == answer_text:
                    target_row_index = i + 1 # Sheet is 1-based
                    target_col_index = 12    # Feedback_Right Column
                    break
        
        if target_row_index != -1:
            print(f"✅ Found matching row {target_row_index}, updating col {target_col_index}")
            sheet.update_cell(target_row_index, target_col_index, feedback_val)
        else:
            print("⚠️ Match not found for feedback update.")
            
    except Exception as e:
        print(f"❌ Error saving feedback: {e}")

def load_history_from_sheet(target_username):
    try:
        sheet = get_sheet_client()
        if sheet is None: return pd.DataFrame()
        data = sheet.get_all_values()
        if not data: return pd.DataFrame()
        
        headers = data[0]
        rows = data[1:]
        df = pd.DataFrame(rows, columns=headers)
        
        # Cleanup column names
        df.columns = df.columns.astype(str).str.strip()
        
        # Filter by username
        user_col = next((c for c in df.columns if 'username' in c.lower()), None)
        if user_col and target_username:
            target = str(target_username).strip().lower()
            df[user_col] = df[user_col].astype(str).str.strip()
            return df[df[user_col].str.lower() == target]
        return df
    except Exception as e: 
        print(f"Error loading history: {e}")
        return pd.DataFrame()
