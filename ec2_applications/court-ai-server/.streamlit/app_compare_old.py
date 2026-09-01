import streamlit as st
import boto3
from openai import OpenAI
import google.generativeai as genai
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import pandas as pd
import json
import concurrent.futures
import time

# ==========================================
# ⚙️ 1. CONFIG & SECRETS SETUP
# ==========================================
st.set_page_config(page_title="Smart Court AI", page_icon="⚖️", layout="wide")

if "messages" not in st.session_state:
    st.session_state.messages = []

def load_secret(key_name, default=""):
    try:
        return st.secrets[key_name]
    except (FileNotFoundError, KeyError):
        return default

AWS_ACCESS_KEY = load_secret("AWS_ACCESS_KEY")
AWS_SECRET_KEY = load_secret("AWS_SECRET_KEY")
DEEPSEEK_API_KEY = load_secret("DEEPSEEK_API_KEY")
GEMINI_API_KEY = load_secret("GEMINI_API_KEY")

REGION = "us-east-1"
SHEET_NAME = "Court_AI_Logs"
THB_RATE = 35.0 

# ---------------------------------------------------------
# 📚 KNOWLEDGE BASE CONFIG (เปลี่ยนชื่อเป็น "คลังข้อมูล")
# ---------------------------------------------------------
KNOWLEDGE_BASES = {
    "🗂️ คลังข้อมูลหลัก (ปรับปรุงใหม่)": "UHX3CVMTKL",        # 🟢 ใส่ ID เดิมของคุณ
    "📂 คลังข้อมูลทดสอบ (ฺBDI)": "X0TFMCZC7X",   # 🔴 ใส่ ID อันใหม่ (ถ้ามี)
    "❌ ไม่ใช้คลังข้อมูล (Pure Model)": None            # ⚪ เลือกอันนี้ถ้าไม่อยากเปิดตำรา
}

# 🛠️ MODEL CONFIG
MODELS = {
    "Claude 3.5 Sonnet": {"type": "bedrock", "id": "anthropic.claude-3-5-sonnet-20240620-v1:0", "icon": "🔶", "color": "#d97757"},
    "DeepSeek R1 (Private EC2)": {"type": "deepseek_self_hosted", "id": "deepseek-r1:8b", "icon": "🏰", "color": "#2ecc71"},
    "Gemini 2.0 Flash": {"type": "gemini", "id": "gemini-2.0-flash", "icon": "✨", "color": "#4285F4"},
    "Gemini 2.5 Pro": {"type": "gemini", "id": "gemini-2.5-pro", "icon": "💎", "color": "#8E44AD"},
}

MODEL_PRICING = {
    "anthropic.claude-3-5-sonnet-20240620-v1:0": [3.00, 15.00],
    "deepseek-chat": [0.14, 0.28],
    "deepseek-r1:8b": [0.0, 0.0], 
    "gemini-2.0-flash": [0.10, 0.40],
    "gemini-2.5-pro": [3.50, 10.50],
}

SYSTEM_PROMPT = """
บทบาท: คุณคือ "AI ผู้ช่วยอัจฉริยะประจำศาลปกครอง"
หน้าที่หลัก: สืบค้น วิเคราะห์ และสรุปข้อมูลจากเอกสารอ้างอิง (Context) เพื่อตอบคำถามประชาชนด้วยภาษาที่เข้าใจง่าย กระชับ และถูกต้องตามหลักการ

กฎเหล็กและข้อห้าม (Strict Rules):
1. **ห้ามฟันธงผลคดี:** ห้ามระบุว่าฝ่ายใดจะชนะหรือแพ้ และห้ามวินิจฉัยว่าคดีนั้น "ศาลจะมีผลของการพิจารณาแบบไหน" (ให้ตอบเพียงหลักเกณฑ์ทั่วไป)
2. **ห้ามแนะนำการดำเนินการ:** ห้ามชี้แนะให้ผู้ถามกระทำการทางคดี เช่น "คุณควรไปฟ้องทันที" หรือ "คุณต้องยื่นเอกสารนี้" (ให้บอกเพียงว่าระเบียบ/ขั้นตอนกำหนดไว้อย่างไร)
3. **เรื่องอายุความ:** หากผู้ถามถามเรื่องระยะเวลาฟ้องคดี ให้ตอบเพียง "หลักเกณฑ์ที่กฎหมายกำหนด" ตามข้อมูลที่มี **ห้ามคำนวณวันหมดอายุความแบบเจาะจง** ให้ผู้ถามเด็ดขาด
4. **กรณีข้อมูลไม่เพียงพอ:** หากข้อมูลใน Context ไม่สามารถตอบคำถามได้ชัดเจน หรือไม่มี Context ให้ตอบตามความรู้ทั่วไปแต่ต้องระบุว่า "ข้อมูลนี้มาจากความรู้ทั่วไป ไม่ได้มาจากฐานข้อมูลศาล
5. **การอ้างอิงเอกสาร:** หากมีการใช้ข้อมูลจาก Context ในการตอบคำถาม ให้ระบุแหล่งที่มาของข้อมูลนั้นอย่างชัดเจน (เช่น ชื่อเอกสาร หรือส่วนที่เกี่ยวข้อง)
6. **ภาษาและโทน:** ใช้ภาษาที่สุภาพ เป็นมิตร และเข้าใจง่าย หลีกเลี่ยงศัพท์เทคนิคทางกฎหมายที่ซับซ้อน
7. **ความถูกต้อง:** ตรวจสอบให้แน่ใจว่าข้อมูลที่ให้มีความถูกต้องและเป็นปัจจุบันตามที่มีใน Context
8. **การจัดรูปแบบคำตอบ:** หากคำตอบมีหลายประเด็น ให้จัดลำดับเป็นข้อๆ หรือย่อหน้า เพื่อความชัดเจน
9. **การจัดการกับคำถามที่ไม่เกี่ยวข้อง:** หากคำถามไม่เกี่ยวข้องกับกฎหมายปกครองหรือศาลปกครอง ให้ตอบว่า "ขออภัย ฉันถูกออกแบบมาเพื่อช่วยเหลือในเรื่องที่เกี่ยวกับกฎหมายปกครองเท่านั้น"
10. **การปฏิเสธคำถามที่ไม่เหมาะสม:** หากคำถามมีลักษณะไม่เหมาะสม เช่น คำถามที่ละเมิดสิทธิ์ส่วนบุคคล หรือคำถามที่มีเจตนาไม่ดี ให้ปฏิเสธที่จะตอบคำถามนั้นอย่างสุภาพ
11. **การอัปเดตข้อมูล:** หากมีการเปลี่ยนแปลงกฎหมายหรือระเบียบข้อบังคับ ให้แจ้งให้ผู้ถามทราบว่าข้อมูลอาจไม่เป็นปัจจุบันและแนะนำให้ตรวจสอบกับแหล่งข้อมูลทางการเพิ่มเติม
12. **การให้คำแนะนำทั่วไป:** หากผู้ถามต้องการคำแนะนำ ให้เน้นว่าคำแนะนำดังกล่าวเป็นเพียงแนวทางทั่วไป และไม่ใช่คำปรึกษาทางกฎหมายที่เฉพาะเจาะจง แต่สามารถบอกเขตอำนาจของศาลปกครองว่าศาลปกครองไหน มีเขตอำนาจครอบคลุมจังหวัดไหนบ้าง
"""

# ==========================================
# 🔌 2. BACKEND SERVICES
# ==========================================
@st.cache_resource
def get_aws_runtime(): 
    if not AWS_ACCESS_KEY: return None
    return boto3.client('bedrock-runtime', region_name=REGION, aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY)

@st.cache_resource
def get_aws_agent(): 
    if not AWS_ACCESS_KEY: return None
    return boto3.client('bedrock-agent-runtime', region_name=REGION, aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY)

@st.cache_resource
def get_deepseek_client(): 
    if not DEEPSEEK_API_KEY: return None
    return OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")

if GEMINI_API_KEY: genai.configure(api_key=GEMINI_API_KEY)

def get_sheet_client():
    try:
        scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
        creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
        client = gspread.authorize(creds)
        return client.open(SHEET_NAME).sheet1
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return None

def save_to_sheet(username, q, r_left, r_right):
    try:
        sheet = get_sheet_client()
        if sheet is None: return
        row = [
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"), username, q,
            r_left['model'], r_left['answer'], f"{r_left['cost']:.4f}",
            r_right['model'], r_right['answer'], f"{r_right['cost']:.4f}"
        ]
        sheet.append_row(row)
    except Exception as e: print(f"❌ Error saving: {e}")

def load_history_from_sheet(target_username):
    try:
        sheet = get_sheet_client()
        if sheet is None: return pd.DataFrame()
        data = sheet.get_all_values()
        if not data: return pd.DataFrame()
        headers = data[0]; rows = data[1:]
        df = pd.DataFrame(rows, columns=headers)
        df.columns = df.columns.astype(str).str.strip()
        user_col = next((c for c in df.columns if 'username' in c.lower()), None)
        if user_col and target_username:
            target = str(target_username).strip().lower()
            df[user_col] = df[user_col].astype(str).str.strip()
            return df[df[user_col].str.lower() == target]
        return df
    except Exception as e: return pd.DataFrame()

# --- RAG Logic ---
def retrieve_context(query, kb_id):
    # ถ้า user เลือก "ไม่ใช้คลังข้อมูล"
    if not kb_id: return "", {}
    
    agent = get_aws_agent()
    if not agent: return "", {}
    try:
        res = agent.retrieve(
            knowledgeBaseId=kb_id, 
            retrievalQuery={'text': query}, 
            retrievalConfiguration={'vectorSearchConfiguration': {'numberOfResults': 5}}
        )
        ctx = ""; citation_details = {}
        if 'retrievalResults' in res:
            for r in res['retrievalResults']:
                text_chunk = r['content']['text']
                ctx += f"- {text_chunk}\n"
                fname = r['location']['s3Location']['uri'].split('/')[-1]
                if fname not in citation_details:
                    citation_details[fname] = text_chunk[:200].replace('\n', ' ') + "..."
        return ctx, citation_details
    except Exception as e: 
        print(f"KB Error ({kb_id}): {e}")
        return "", {}

def calculate_cost(model_id, full_text_in, full_text_out):
    pricing = MODEL_PRICING.get(model_id, [0, 0])
    in_tokens = len(full_text_in) / 3.0 
    out_tokens = len(full_text_out) / 3.0
    cost = (in_tokens/1e6 * pricing[0]) + (out_tokens/1e6 * pricing[1])
    return cost * THB_RATE

def call_single_model(model_name, prompt, context, citations_dict, temperature=0.5):
    cfg = MODELS[model_name]
    full_input = f"{SYSTEM_PROMPT}\n\nContext:\n{context}\n\nUser Question: {prompt}"
    answer = ""
    start_time = time.time()
    
    try:
        if cfg["type"] == "bedrock":
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31", 
                "max_tokens": 2048, "temperature": temperature,
                "messages": [{"role": "user", "content": full_input}]
            })
            res = get_aws_runtime().invoke_model(modelId=cfg["id"], body=body)
            answer = json.loads(res.get('body').read())['content'][0]['text']

        elif cfg["type"] == "deepseek":
            res = get_deepseek_client().chat.completions.create(
                model=cfg["id"], temperature=temperature,
                messages=[{"role": "user", "content": full_input}]
            )
            answer = res.choices[0].message.content

        elif cfg["type"] == "deepseek_self_hosted":
            custom_client = OpenAI(
                base_url="http://3.235.65.4:11434/v1",  # 👈 IP เครื่อง EC2
                api_key="ollama", timeout=120.0
            )
            res = custom_client.chat.completions.create(
                model=cfg["id"], temperature=temperature,
                messages=[{"role": "user", "content": full_input}]
            )
            answer = res.choices[0].message.content

        elif cfg["type"] == "gemini":
            gen_cfg = genai.GenerationConfig(temperature=temperature)
            answer = genai.GenerativeModel(cfg["id"]).generate_content(full_input, generation_config=gen_cfg).text
            
    except Exception as e:
        answer = f"⚠️ Error: {str(e)}"
    
    elapsed = time.time() - start_time
    return {"model": model_name, "answer": answer, "citations": citations_dict, 
            "cost": calculate_cost(cfg["id"], full_input, answer), "config": cfg, "time": elapsed}

# ==========================================
# 🎨 3. THEME & UI MANAGER
# ==========================================
with st.sidebar:
    st.markdown("""<div style="text-align: center; margin-bottom: 10px;"><div class="court-icon">⚖️</div></div>""", unsafe_allow_html=True)
    st.title("Smart Court AI")
    st.markdown("---")
    st.subheader("⚙️ ตั้งค่า")
    
    theme_choice = st.radio("🎨 เลือกธีม", ["🌙 Modern Dark", "☀️ Official Light"])
    st.markdown("---")
    username = st.text_input("👤 ชื่อผู้ใช้งาน", value="Officer")
    st.markdown("---")

    # ---------------------------------------------------------
    # ⚔️ Config: เปรียบเทียบ คลังข้อมูล (KB)
    # ---------------------------------------------------------
    st.markdown("⚔️ **การเปรียบเทียบ (Double Compare)**")
    
    # Left Side
    st.caption("👈 ฝั่งซ้าย (Left Side)")
    kb_left_name = st.selectbox("🗂️ คลังข้อมูลฝั่งซ้าย", list(KNOWLEDGE_BASES.keys()), index=0, key="kb_l")
    m_left = st.selectbox("🤖 Model ฝั่งซ้าย", list(MODELS.keys()), index=0, key="md_l")
    
    st.markdown("---")
    
    # Right Side
    st.caption("👉 ฝั่งขวา (Right Side)")
    kb_right_name = st.selectbox("🗂️ คลังข้อมูลฝั่งขวา", list(KNOWLEDGE_BASES.keys()), index=0, key="kb_r")
    m_right = st.selectbox("🦁 Model ฝั่งขวา", list(MODELS.keys()), index=2, key="md_r")
    
    # Get IDs
    kb_left_id = KNOWLEDGE_BASES[kb_left_name]
    kb_right_id = KNOWLEDGE_BASES[kb_right_name]

    temp_val = st.slider("🌡️ ความสร้างสรรค์", 0.0, 1.0, 0.3)
    st.markdown("---")
    
    c1, c2 = st.columns(2)
    if c1.button("🗑️ ล้างแชท", use_container_width=True):
        st.session_state.messages = []
        st.rerun()
    if st.session_state.get("messages"):
        chat_str = "\n".join([f"{m['role']}: {m['content']}" if m['role']=='user' else "AI Reponse" for m in st.session_state.messages])
        c2.download_button("📥 Save", chat_str, "chat_history.txt", use_container_width=True)

# Theme CSS
if "Light" in theme_choice:
    bg_color = "#f8f9fa"; card_bg = "#ffffff"; text_color = "#212529"; header_gradient = "linear-gradient(135deg, #0f3460 0%, #16213e 100%)" 
    citation_bg = "#e3f2fd"; citation_text = "#0d47a1"; user_bubble_bg = "#e3f2fd"; user_bubble_text = "#212529"
    border_color = "#dee2e6"; input_bg = "#ffffff"; sidebar_bg = "#ffffff"; sidebar_text = "#212529"; btn_color = "#0f3460"; btn_text = "#ffffff"
else:
    bg_color = "#0e1117"; card_bg = "#1e1e1e"; text_color = "#ffffff"; header_gradient = "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)" 
    citation_bg = "#2d2d2d"; citation_text = "#e0e0e0"; user_bubble_bg = "#343a40"; user_bubble_text = "#ffffff"
    border_color = "#444444"; input_bg = "#262730"; sidebar_bg = "#161b22"; sidebar_text = "#e0e0e0"; btn_color = "#343a40"; btn_text = "#e0e0e0"

st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&display=swap');
    .stApp {{ background-color: {bg_color}; }}
    html, body, [class*="css"], .stMarkdown, .stText, p {{ font-family: 'Sarabun', sans-serif !important; color: {text_color} !important; }}
    h1, h2, h3, h4, h5, h6 {{ color: {text_color} !important; }}
    .court-header {{ background: {header_gradient}; padding: 1.5rem; border-radius: 12px; color: white !important; text-align: center; margin-bottom: 25px; }}
    .court-header h2, .court-header p {{ color: white !important; }}
    .court-icon {{ font-size: 80px; line-height: 1; cursor: default; color: #FFD700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.6); transition: transform 0.3s ease; display: inline-block; }}
    .court-icon:hover {{ transform: scale(1.1); }}
    .response-card {{ background-color: {card_bg}; padding: 0; border-radius: 12px; border: 1px solid {border_color}; margin-bottom: 15px; color: {text_color}; overflow: hidden; }}
    .card-content {{ padding: 20px; }}
    .card-header {{ background-color: {input_bg}; padding: 12px 20px; border-bottom: 1px solid {border_color}; display: flex; justify-content: space-between; align-items: center; }}
    .model-badge {{ display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: white !important; }}
    .user-bubble {{ background-color: {user_bubble_bg}; color: {user_bubble_text} !important; padding: 12px 18px; border-radius: 18px 18px 4px 18px; margin-left: auto; width: fit-content; max-width: 80%; text-align: right; }}
    .stChatInput textarea {{ background-color: {input_bg} !important; color: {text_color} !important; border: 1px solid {border_color} !important; }}
    [data-testid="stSidebar"] {{ background-color: {sidebar_bg}; border-right: 1px solid {border_color}; }}
    [data-testid="stSidebar"] * {{ color: {sidebar_text} !important; }}
    .stSelectbox div[data-baseweb="select"] > div, .stTextInput input {{ background-color: {input_bg}; color: {text_color}; border-color: {border_color}; }}
    .stButton > button {{ background-color: {btn_color}; color: {btn_text}; border: 1px solid {border_color}; width: 100%; border-radius: 8px; }}
    [data-testid="stDataFrame"] {{ background-color: {card_bg} !important; }}
    [data-testid="stExpander"] {{ border: 1px solid {border_color}; border-radius: 8px; background-color: {input_bg}; }}
</style>
""", unsafe_allow_html=True)

# ==========================================
# 🖥️ 4. MAIN LAYOUT
# ==========================================
st.markdown("""<div class="court-header"><h2 style='margin:0;'>⚖️ Smart Court AI Assistant</h2><p style='margin:5px 0 0 0; opacity:0.9; font-size:1rem;'>ระบบทดสอบการถาม-ตอบคำถามทั่วไปคดีปกครองด้วย AI</p></div>""", unsafe_allow_html=True)
tab_chat, tab_hist = st.tabs(["💬 สนทนา (Chat)", "📜 ประวัติการใช้งาน (History)"])

def display_result_box(res_data, kb_name):
    icon = res_data['config']['icon']
    color = res_data['config']['color']
    
    # 1. แสดงผลคำตอบ
    st.markdown(f"""
    <div class="response-card">
        <div class="card-header">
            <span class="model-badge" style="background-color:{color};">{icon} {res_data['model']}</span>
            <span style="font-size:0.75rem; font-weight:600; opacity:0.8; margin-left:10px;">📂 {kb_name}</span>
            <span style="font-size:0.8rem; font-weight:600; opacity:0.7; margin-left:auto;">⏱️ {res_data['time']:.2f}s</span>
        </div>
        <div class="card-content"><div style="margin-top:0px; line-height:1.7; font-size:1rem;">{res_data['answer']}</div>
    """, unsafe_allow_html=True)
    st.markdown("</div></div>", unsafe_allow_html=True) 
    
    # 2. แสดงเอกสารอ้างอิง (Citations)
    # ฟังก์ชันนี้ใช้ร่วมกันทั้งซ้ายและขวา ดังนั้นถ้าข้อมูลมี citations มันจะแสดงผลอัตโนมัติ
    if res_data.get("citations"):
        st.markdown(f"<div style='margin-top: 10px; margin-bottom: 5px; font-size: 0.85rem; opacity: 0.8;'>📚 <b>เอกสารอ้างอิง ({kb_name}):</b></div>", unsafe_allow_html=True)
        for fname, snippet in res_data['citations'].items():
            with st.expander(f"📄 {fname}", expanded=False):
                st.info(f'"{snippet}"')
                
    st.markdown(f"""<div style="margin-top:5px; font-size:0.85rem; color:#2ecc71 !important; text-align:right;">💸 Cost: <b>{res_data['cost']:.4f} THB</b></div>""", unsafe_allow_html=True)

with tab_chat:
    chat_container = st.container()
    with chat_container:
        for msg in st.session_state.messages:
            if msg["role"] == "user":
                with st.chat_message("user", avatar="🧑‍💼"): st.markdown(f"""<div class="user-bubble">{msg['content']}</div>""", unsafe_allow_html=True)
            else:
                with st.chat_message("assistant", avatar="⚖️"):
                    c1, c2 = st.columns(2)
                    # แสดงผลทั้งซ้ายและขวา (พร้อมเอกสารอ้างอิง)
                    with c1: display_result_box(msg["left"], msg["kb_l_name"])
                    with c2: display_result_box(msg["right"], msg["kb_r_name"])

    if prompt := st.chat_input("พิมพ์คำถามเพื่อสืบค้นข้อมูล..."):
        with chat_container:
            with st.chat_message("user", avatar="🧑‍💼"): st.markdown(f"""<div class="user-bubble">{prompt}</div>""", unsafe_allow_html=True)
            st.session_state.messages.append({"role": "user", "content": prompt})

            with st.chat_message("assistant", avatar="⚖️"):
                status = st.status("🔍 กำลังค้นหาข้อมูลจากคลังข้อมูล...", expanded=True)
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    # 1. Retrieve ข้อมูลจาก 2 คลังข้อมูลพร้อมกัน
                    status.write("📚 Searching Knowledge Repositories...")
                    f_ctx_l = executor.submit(retrieve_context, prompt, kb_left_id)
                    f_ctx_r = executor.submit(retrieve_context, prompt, kb_right_id)
                    ctx_l, cite_l = f_ctx_l.result()
                    ctx_r, cite_r = f_ctx_r.result()
                    
                    # 2. ให้โมเดล 2 ตัวประมวลผลพร้อมกัน
                    status.write("⚡ Generating Responses...")
                    f1 = executor.submit(call_single_model, m_left, prompt, ctx_l, cite_l, temp_val)
                    f2 = executor.submit(call_single_model, m_right, prompt, ctx_r, cite_r, temp_val)
                    res_l, res_r = f1.result(), f2.result()
                
                status.update(label="✅ เสร็จสิ้น", state="complete", expanded=False)
                c1, c2 = st.columns(2)
                # เรียกฟังก์ชันแสดงผล (ซึ่งมีโค้ดแสดง citation อยู่แล้ว)
                with c1: display_result_box(res_l, kb_left_name)
                with c2: display_result_box(res_r, kb_right_name)

                st.session_state.messages.append({
                    "role": "assistant", 
                    "left": res_l, 
                    "right": res_r, 
                    "kb_l_name": kb_left_name, 
                    "kb_r_name": kb_right_name
                })
                if username: save_to_sheet(username, prompt, res_l, res_r)

with tab_hist:
    st.subheader(f"📜 ประวัติการใช้งาน: {username}")
    if st.button("🔄 รีเฟรชข้อมูล"): st.cache_data.clear(); st.rerun()
    df = load_history_from_sheet(username)
    if not df.empty:
        st.dataframe(df, use_container_width=True, hide_index=True)
        if 'Cost A (THB)' in df.columns or df.shape[1] > 5:
            try:
                df.iloc[:, 5] = pd.to_numeric(df.iloc[:, 5], errors='coerce')
                df.iloc[:, 8] = pd.to_numeric(df.iloc[:, 8], errors='coerce')
                st.line_chart(df.iloc[:, [5, 8]])
            except: pass
    else: st.info("ไม่พบประวัติการใช้งาน")