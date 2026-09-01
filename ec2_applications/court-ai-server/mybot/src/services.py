import boto3
from openai import OpenAI
import google.generativeai as genai
import sqlite3
import json
import time
import pandas as pd
import os
import re
import concurrent.futures
from datetime import datetime
import streamlit as st

from src.config import REGION, MODELS, SYSTEM_PROMPT, THB_RATE, MODEL_PRICING, SHEET_NAME
from src.court_contact import enforce_answer_safety
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

# ==========================================
# 🗄️ DATABASE CONNECTION
# ==========================================

DB_PATH = "data/logs.db"

def init_db():
    """Initializes the SQLite database and creates the logs table if it doesn't exist."""
    if not os.path.exists("data"):
        os.makedirs("data")
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            username TEXT,
            question TEXT,
            kb_left TEXT,
            model_left TEXT,
            answer_left TEXT,
            feedback_left TEXT,
            cost_left REAL,
            time_left REAL,
            kb_right TEXT,
            model_right TEXT,
            answer_right TEXT,
            feedback_right TEXT,
            cost_right REAL,
            time_right REAL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback_evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            log_id INTEGER NOT NULL,
            response_side TEXT NOT NULL CHECK(response_side IN ('left', 'right')),
            model_name TEXT,
            score_accuracy INTEGER,
            score_completeness INTEGER,
            score_detail INTEGER,
            score_usefulness INTEGER,
            score_satisfaction INTEGER,
            comment TEXT,
            rubric_version TEXT DEFAULT 'five-dimension-v1',
            created_at TEXT NOT NULL,
            UNIQUE(log_id, response_side),
            FOREIGN KEY(log_id) REFERENCES logs(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_feedback_eval_log_side
        ON feedback_evaluations(log_id, response_side)
    """)
    # Backfill legacy serialized feedback once, preserving historical ratings.
    cursor.execute("""
        SELECT id, model_left, feedback_left, model_right, feedback_right
        FROM logs
        WHERE COALESCE(feedback_left, '') <> '' OR COALESCE(feedback_right, '') <> ''
    """)
    for log_id, model_left, feedback_left, model_right, feedback_right in cursor.fetchall():
        for side, model_name, legacy in (
            ('left', model_left, feedback_left),
            ('right', model_right, feedback_right),
        ):
            if not legacy:
                continue
            values = dict(re.findall(r"(Acc|Comp|Det|Use|Sat):(\d+)", legacy))
            comment = legacy.split(" Suggestion: ", 1)[1] if " Suggestion: " in legacy else ""
            cursor.execute("""
                INSERT OR IGNORE INTO feedback_evaluations (
                    log_id, response_side, model_name,
                    score_accuracy, score_completeness, score_detail,
                    score_usefulness, score_satisfaction, comment, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log_id, side, model_name,
                int(values.get('Acc', 0)), int(values.get('Comp', 0)),
                int(values.get('Det', 0)), int(values.get('Use', 0)),
                int(values.get('Sat', 0)), comment,
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ))
    conn.commit()
    conn.close()

# Run initialization
init_db()

def get_db_connection():
    return sqlite3.connect(DB_PATH)

# ==========================================
# 🧠 LOGIC FUNCTIONS
# ==========================================

THAI_PROVINCES = (
    "กรุงเทพมหานคร", "นครปฐม", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ", "สมุทรสาคร",
    "นครนายก", "สระบุรี", "เชียงใหม่", "เชียงราย", "แม่ฮ่องสอน", "ลำปาง", "ลำพูน",
    "น่าน", "พะเยา", "แพร่", "สงขลา", "ตรัง", "พัทลุง", "สตูล", "นครราชสีมา",
    "ชัยภูมิ", "บุรีรัมย์", "สุรินทร์", "ขอนแก่น", "กาฬสินธุ์", "มหาสารคาม",
    "มุกดาหาร", "พิษณุโลก", "กำแพงเพชร", "ตาก", "พิจิตร", "สุโขทัย", "อุตรดิตถ์",
    "ระยอง", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ตราด", "ปราจีนบุรี", "สระแก้ว",
    "นครศรีธรรมราช", "สุราษฎร์ธานี", "ชุมพร", "อุดรธานี", "เลย", "หนองคาย",
    "หนองบัวลำภู", "นครพนม", "บึงกาฬ", "สกลนคร", "อุบลราชธานี", "ยโสธร",
    "ร้อยเอ็ด", "ศรีสะเกษ", "อำนาจเจริญ", "เพชรบุรี", "ประจวบคีรีขันธ์", "ราชบุรี",
    "สมุทรสงคราม", "นครสวรรค์", "ชัยนาท", "เพชรบูรณ์", "อุทัยธานี", "ลพบุรี",
    "สุพรรณบุรี", "กาญจนบุรี", "พระนครศรีอยุธยา", "สิงห์บุรี", "อ่างทอง", "ภูเก็ต",
    "กระบี่", "พังงา", "ระนอง", "ยะลา", "ปัตตานี", "นราธิวาส"
)

def retrieve_context(query, kb_id):
    """Retrieves relevant context from AWS Bedrock Knowledge Base."""
    if not kb_id: 
        return "", {}
    
    agent = get_aws_agent()
    if not agent: 
        return "", {}

    # Do not inject court names or counts into the user's query. Those facts must
    # come from retrieved official documents, otherwise the model may treat the
    # query expansion itself as evidence.

    try:
        res = agent.retrieve(
            knowledgeBaseId=kb_id, 
            retrievalQuery={'text': query}, 
            retrievalConfiguration={'vectorSearchConfiguration': {'numberOfResults': 10}}
        )
        ctx = ""
        citation_details = {}
        
        if 'retrievalResults' in res:
            results = res['retrievalResults']
            court_lookup = any(term in query for term in [
                "ศาลปกครอง", "เขตอำนาจ", "ศาลไหน", "ฟ้องที่ไหน",
                "จังหวัด", "ที่ตั้งศาล", "เบอร์โทรศาล"
            ])

            mentioned_provinces = [p for p in THAI_PROVINCES if p in query][:3]
            exact_official_results = []
            for province in mentioned_provinces:
                try:
                    official_uri = (
                        "s3://my-company-knowledge-2025/official/"
                        f"province_jurisdiction/{province}.txt"
                    )
                    official_res = agent.retrieve(
                        knowledgeBaseId=kb_id,
                        retrievalQuery={'text': query},
                        retrievalConfiguration={
                            'vectorSearchConfiguration': {
                                'numberOfResults': 3,
                                'filter': {
                                    'equals': {
                                        'key': 'x-amz-bedrock-kb-source-uri',
                                        'value': official_uri
                                    }
                                }
                            }
                        }
                    )
                    exact_official_results.extend(
                        official_res.get('retrievalResults', [])
                    )
                except Exception as e:
                    print(f"Official province retrieval error ({province}): {e}")

            if exact_official_results:
                seen = set()
                results = [
                    item for item in exact_official_results + results
                    if not (
                        item['content']['text'] in seen
                        or seen.add(item['content']['text'])
                    )
                ]

            if court_lookup:
                results = sorted(
                    results,
                    key=lambda item: (
                        1 if '/official/province_jurisdiction/' in item.get('location', {}).get('s3Location', {}).get('uri', '') else 0,
                        1 if '/official/' in item.get('location', {}).get('s3Location', {}).get('uri', '') else 0,
                        item.get('score', 0.0)
                    ),
                    reverse=True
                )

            for r in results:
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

def call_single_model(model_name, prompt, context, citations_dict, temperature=0.5, placeholder=None, system_instruction=None, q=None):
    """Invokes a single AI model, optionally streaming output to a placeholder or queue."""
    cfg = MODELS[model_name]
    
    # Use custom system instruction if provided, else default
    sys_prompt = system_instruction if system_instruction else SYSTEM_PROMPT
    full_input = f"{sys_prompt}\n\nContext:\n{context}\n\nUser Question: {prompt}"
    
    answer = ""
    start_time = time.time()
    
    try:
        # --- BEDROCK ---
        if cfg["type"] == "bedrock":
            runtime = get_aws_runtime()
            if not runtime: raise ValueError("AWS Credentials missing")
            
            messages = [{"role": "user", "content": [{"text": full_input}]}]
            inf_config = {"maxTokens": 2048, "temperature": temperature}
            
            if placeholder or q:
                response = runtime.converse_stream(
                    modelId=cfg["id"],
                    messages=messages,
                    inferenceConfig=inf_config
                )
                stream = response.get('stream')
                if stream:
                    for event in stream:
                        if 'contentBlockDelta' in event:
                            text_chunk = event['contentBlockDelta']['delta']['text']
                            answer += text_chunk
                            if placeholder: placeholder.markdown(answer + "▌")
                            if q: q.put(text_chunk)
                if placeholder: placeholder.markdown(answer)
            else:
                response = runtime.converse(
                    modelId=cfg["id"],
                    messages=messages,
                    inferenceConfig=inf_config
                )
                answer = response['output']['message']['content'][0]['text']

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
                        text_chunk = chunk.choices[0].delta.content
                        answer += text_chunk
                        if placeholder: placeholder.markdown(answer + "▌")
                        if q: q.put(text_chunk)
                if placeholder: placeholder.markdown(answer)
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
            
            if placeholder or q:
                response = model.generate_content(full_input, generation_config=gen_cfg, stream=True)
                for chunk in response:
                    text_chunk = chunk.text
                    answer += text_chunk
                    if placeholder: placeholder.markdown(answer + "▌")
                    if q: q.put(text_chunk)
                if placeholder: placeholder.markdown(answer)
            else:
                answer = model.generate_content(full_input, generation_config=gen_cfg).text
            
    except Exception as e:
        answer = f"⚠️ Error: {str(e)}"
        if placeholder: placeholder.error(answer)
        if q: q.put(answer)
        
    finally:
        if q: q.put(None)

    answer = enforce_answer_safety(prompt, answer, context)
    if placeholder:
        placeholder.markdown(answer)
    
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
        conn = get_db_connection()
        cursor = conn.cursor()
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        cursor.execute("""
            INSERT INTO logs (
                timestamp, username, question, 
                kb_left, model_left, answer_left, feedback_left, cost_left, time_left,
                kb_right, model_right, answer_right, feedback_right, cost_right, time_right
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            timestamp, username, q,
            kb_left, r_left['model'], r_left['answer'], "", r_left['cost'], r_left['time'],
            kb_right, r_right['model'], r_right['answer'], "", r_right['cost'], r_right['time']
        ))
        
        conn.commit()
        conn.close()
    except Exception as e: 
        print(f"❌ Error saving to DB: {e}")

def save_feedback(username, prompt, model, feedback_data, answer_text=""):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if isinstance(feedback_data, dict):
            scores_str = (
                f"[Acc:{feedback_data.get('accuracy', 0)} "
                f"Comp:{feedback_data.get('completeness', 0)} "
                f"Det:{feedback_data.get('details', 0)} "
                f"Use:{feedback_data.get('usefulness', 0)} "
                f"Sat:{feedback_data.get('satisfaction', 0)}]"
            )
            suggestion = feedback_data.get('suggestion', '').replace('\n', ' ').strip()
            feedback_val = f"{scores_str} Suggestion: {suggestion}" if suggestion else scores_str
        else:
            feedback_val = str(feedback_data)

        cursor.execute("""
            SELECT id,
                   CASE WHEN answer_left = ? THEN 'left' ELSE 'right' END AS response_side
            FROM logs
            WHERE username = ? AND question = ?
              AND (answer_left = ? OR answer_right = ?)
            ORDER BY id DESC LIMIT 1
        """, (answer_text, username, prompt, answer_text, answer_text))
        matched = cursor.fetchone()
        if not matched:
            raise ValueError("ไม่พบคำตอบที่ตรงกับผลประเมิน")

        log_id, response_side = matched
        feedback_column = "feedback_left" if response_side == "left" else "feedback_right"
        cursor.execute(
            f"UPDATE logs SET {feedback_column} = ? WHERE id = ?",
            (feedback_val, log_id)
        )

        if isinstance(feedback_data, dict):
            cursor.execute("""
                INSERT INTO feedback_evaluations (
                    log_id, response_side, model_name,
                    score_accuracy, score_completeness, score_detail,
                    score_usefulness, score_satisfaction, comment, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(log_id, response_side) DO UPDATE SET
                    model_name=excluded.model_name,
                    score_accuracy=excluded.score_accuracy,
                    score_completeness=excluded.score_completeness,
                    score_detail=excluded.score_detail,
                    score_usefulness=excluded.score_usefulness,
                    score_satisfaction=excluded.score_satisfaction,
                    comment=excluded.comment,
                    created_at=excluded.created_at
            """, (
                log_id, response_side, model,
                feedback_data.get('accuracy', 0),
                feedback_data.get('completeness', 0),
                feedback_data.get('details', 0),
                feedback_data.get('usefulness', 0),
                feedback_data.get('satisfaction', 0),
                feedback_data.get('suggestion', '').strip(),
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ))
            
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"❌ Error saving feedback to DB: {e}")

def load_history_from_sheet(target_username):
    try:
        conn = get_db_connection()
        if target_username:
            query = "SELECT * FROM logs WHERE username = ?"
            df = pd.read_sql_query(query, conn, params=(target_username,))
        else:
            query = "SELECT * FROM logs"
            df = pd.read_sql_query(query, conn)
        conn.close()
        
        # Rename columns to match existing main.py expectations if necessary
        # Existing Main expectations (from Sheet): 
        # [Timestamp, Username, Question, KB_Left, Model_Left, Answer_Left, Feedback_Left, Cost_Left, KB_Right, Model_Right, Answer_Right, Feedback_Right, Cost_Right]
        
        mapping = {
            'timestamp': 'Timestamp',
            'username': 'Username',
            'question': 'Question',
            'kb_left': 'KB_Left',
            'model_left': 'Model_Left',
            'answer_left': 'Answer_Left',
            'feedback_left': 'Feedback_Left',
            'cost_left': 'Cost_Model_Left',
            'time_left': 'Time_Left',
            'kb_right': 'KB_Right',
            'model_right': 'Model_Right',
            'answer_right': 'Answer_Right',
            'feedback_right': 'Feedback_Right',
            'cost_right': 'Cost_Model_Right',
            'time_right': 'Time_Right'
        }
        df = df.rename(columns=mapping)
        return df
    except Exception as e: 
        print(f"Error loading history from DB: {e}")
        return pd.DataFrame()

def generate_dashboard_insight(logs_df, model_name="Claude 4.6 Sonnet"):
    """
    Sends recent logs to an AI model to generate strategic insights.
    """
    if logs_df.empty:
        return "ไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์"
    
    # Prioritize every low-score case, then add recent cases. Full answers and
    # per-model comments are preserved so the analyst can cite the actual defect.
    work = logs_df.copy()
    sat_l = pd.to_numeric(work.get('Sat_Left', 0), errors='coerce').fillna(0)
    sat_r = pd.to_numeric(work.get('Sat_Right', 0), errors='coerce').fillna(0)
    low = work[((sat_l > 0) & (sat_l <= 2)) | ((sat_r > 0) & (sat_r <= 2))]
    # Keep the interactive report fast: prioritize up to 20 low-score cases and
    # combine them with 20 recent cases. Every selected answer remains complete.
    selected = pd.concat([low.tail(20), work.tail(20)]).drop_duplicates().tail(40)

    records = []
    for _, row in selected.iterrows():
        records.append(
            "CASE\n"
            f"เวลา: {row.get('Timestamp', '')}\n"
            f"ผู้ใช้: {row.get('Username', '')}\n"
            f"คำถาม: {row.get('Question', '')}\n"
            f"ฝั่งซ้าย ({row.get('Model_Left', '')}) คะแนน "
            f"Acc={row.get('Acc_Left', 0)}, Comp={row.get('Comp_Left', 0)}, "
            f"Det={row.get('Det_Left', 0)}, Use={row.get('Use_Left', 0)}, Sat={row.get('Sat_Left', 0)}\n"
            f"คำตอบซ้าย:\n{row.get('Answer_Left', '')}\n"
            f"ความคิดเห็นซ้าย: {row.get('Suggestion_Left', '')}\n"
            f"ฝั่งขวา ({row.get('Model_Right', '')}) คะแนน "
            f"Acc={row.get('Acc_Right', 0)}, Comp={row.get('Comp_Right', 0)}, "
            f"Det={row.get('Det_Right', 0)}, Use={row.get('Use_Right', 0)}, Sat={row.get('Sat_Right', 0)}\n"
            f"คำตอบขวา:\n{row.get('Answer_Right', '')}\n"
            f"ความคิดเห็นขวา: {row.get('Suggestion_Right', '')}\n"
        )

    # Analyze in bounded batches; no answer is shortened inside a selected case.
    batches, current, current_len = [], [], 0
    for record in records:
        if current and current_len + len(record) > 24000:
            batches.append("\n".join(current))
            current, current_len = [], 0
        current.append(record)
        current_len += len(record)
    if current:
        batches.append("\n".join(current))
    
    # Specialized Insight Prompt
    batch_reports = []
    analysis_sys_prompt = "You are a professional Data Analyst for a Thai administrative-court chatbot. Base every finding only on the supplied records."
    def analyze_batch(batch_args):
        batch_no, batch_text = batch_args
        prompt = f"""
    คุณคือผู้เชี่ยวชาญด้านการวิเคราะห์ข้อมูลและกลยุทธ์ (AI Strategic Consultant)
    ภารกิจ: วิเคราะห์คำถาม คำตอบเต็ม คะแนน 5 มิติ และความคิดเห็นของระบบ Smart Court AI
    นี่คือชุดข้อมูลที่ {batch_no} จาก {len(batches)}
    
    ข้อมูล Logs:
    {batch_text}
    
    ระบุหัวข้อคำถาม ปัญหารายโมเดล ข้อความหรือข้ออ้างที่เป็นปัญหา สาเหตุที่เป็นไปได้
    และสิ่งที่ควรแก้ใน Knowledge Base หรือ Prompt ห้ามแต่งข้อเท็จจริงที่ไม่มีในข้อมูล
    """
        try:
            res = call_single_model(model_name, prompt, context="", citations_dict={}, temperature=0.2, system_instruction=analysis_sys_prompt)
            return batch_no, res['answer']
        except Exception as e:
            return batch_no, f"ชุดที่ {batch_no} วิเคราะห์ไม่สำเร็จ: {e}"

    # Independent batches can be analyzed concurrently instead of waiting for
    # each model request in sequence.
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(4, len(batches))) as executor:
        batch_reports = [
            report for _, report in sorted(
                executor.map(analyze_batch, enumerate(batches, 1)),
                key=lambda item: item[0]
            )
        ]

    synthesis_prompt = f"""
สังเคราะห์รายงานย่อยต่อไปนี้เป็นรายงานภาษาไทยฉบับสมบูรณ์ โดยต้องมีครบ:
1) Executive Summary ไม่เกิน 10 บรรทัด 2) ขอบเขตและจำนวนข้อมูล (วิเคราะห์ {len(selected)} เคส)
3) แนวโน้มการใช้งาน 4) ปัญหาคะแนนต่ำพร้อมข้อความหลักฐาน
5) เปรียบเทียบโมเดลทั้ง 5 มิติ รวมเวลาและต้นทุน 6) ความเสี่ยงและผลกระทบ
7) ประสิทธิผลของ Knowledge Base 8) สาเหตุราก 9) ข้อเสนอแนะ KB/Prompt
10) Action Plan ระบุความสำคัญ เจ้าของงานที่เหมาะสม และตัวชี้วัดหลังแก้
ห้ามตัดจบกลางประโยคและห้ามแต่งข้อมูล หากข้อมูลด้านใดไม่มีให้ระบุว่า “ยังไม่มีข้อมูล”

{chr(10).join(batch_reports)}
"""
    try:
        return call_single_model(model_name, synthesis_prompt, context="", citations_dict={}, temperature=0.2, system_instruction=analysis_sys_prompt)['answer']
    except Exception as e:
        return "\n\n".join(batch_reports) + f"\n\n⚠️ รวมรายงานไม่สำเร็จ: {e}"
