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
import time # เพิ่มสำหรับการจับเวลา

# ==========================================
# ⚙️ 1. CONFIG & SECRETS
# ==========================================
st.set_page_config(page_title="Smart Court AI", page_icon="⚖️", layout="wide")

if "user_credit" not in st.session_state:
    st.session_state.user_credit = 100

# API Keys Setup
try:
    AWS_ACCESS_KEY = st.secrets["AWS_ACCESS_KEY"]
    AWS_SECRET_KEY = st.secrets["AWS_SECRET_KEY"]
    DEEPSEEK_API_KEY = st.secrets["DEEPSEEK_API_KEY"]
    GEMINI_API_KEY = st.secrets["GEMINI_API_KEY"]
except (FileNotFoundError, KeyError):
    AWS_ACCESS_KEY, AWS_SECRET_KEY, DEEPSEEK_API_KEY, GEMINI_API_KEY = "", "", "", ""

REGION = "us-east-1"
KB_ID = "UHX3CVMTKL"
SHEET_NAME = "Court_AI_Logs"
THB_RATE = 35.0 

# --- MODELS CONFIG ---
MODELS = {
    "Claude 3.5 Sonnet": {"type": "bedrock", "id": "anthropic.claude-3-5-sonnet-20240620-v1:0", "icon": "🔶", "color": "#d97757"},
    "Claude 3 Opus": {"type": "bedrock", "id": "anthropic.claude-3-opus-20240229-v1:0", "icon": "🎓", "color": "#8d4f39"},
    "Claude 3 Haiku": {"type": "bedrock", "id": "anthropic.claude-3-haiku-20240307-v1:0", "icon": "⚡", "color": "#e09f87"},
    "DeepSeek V3": {"type": "deepseek", "id": "deepseek-chat", "icon": "🐳", "color": "#4d6bfe"},
    "Gemini 2.0 Flash": {"type": "gemini", "id": "gemini-2.0-flash", "icon": "✨", "color": "#4285F4"},
    "Gemini 1.5 Pro": {"type": "gemini", "id": "gemini-1.5-pro", "icon": "💎", "color": "#8E44AD"},
    "Gemini 1.5 Flash": {"type": "gemini", "id": "gemini-1.5-flash", "icon": "⚡", "color": "#34A853"}
}

MODEL_PRICING = {
    "anthropic.claude-3-5-sonnet-20240620-v1:0": [3.00, 15.00],
    "anthropic.claude-3-opus-20240229-v1:0": [15.00, 75.00],
    "anthropic.claude-3-haiku-20240307-v1:0": [0.25, 1.25],
    "deepseek-chat": [0.14, 0.28],
    "gemini-2.0-flash": [0.10, 0.40],
    "gemini-1.5-pro": [3.50, 10.50],
    "gemini-1.5-flash": [0.075, 0.30]
}

# --- SYSTEM PROMPT ---
SYSTEM_PROMPT = """
บทบาท: คุณคือ "AI ผู้ช่วยอัจฉริยะประจำศาลปกครอง"
หน้าที่หลัก: สืบค้น วิเคราะห์ และสรุปข้อมูลจากเอกสารอ้างอิง (Context) เพื่อตอบคำถามประชาชนด้วยภาษาที่เข้าใจง่าย กระชับ และถูกต้องตามหลักการ

แนวทางการตอบคำถาม:
1. **วิเคราะห์และเรียบเรียง:** นำข้อมูลจาก Context มาสรุปใหม่โดยหลีกเลี่ยงศัพท์กฎหมายที่ซับซ้อน เพื่อให้ประชาชนทั่วไปเข้าใจได้ง่ายที่สุด
2. **ยึดข้อมูลเป็นหลัก:** ให้ข้อมูลตามที่มีปรากฏในเอกสารอ้างอิงเท่านั้น ห้ามจินตนาการหรือยกข้อกฎหมายภายนอกมาตอบเอง

กฎเหล็กและข้อห้าม (Strict Rules):
1. **ห้ามฟันธงผลคดี:** ห้ามระบุว่าฝ่ายใดจะชนะหรือแพ้ และห้ามวินิจฉัยว่าคดีนั้น "อยู่ในอำนาจศาล" หรือไม่ (ให้ตอบเพียงหลักเกณฑ์ทั่วไป)
2. **ห้ามแนะนำการดำเนินการ:** ห้ามชี้แนะให้ผู้ถามกระทำการทางคดี เช่น "คุณควรไปฟ้องทันที" หรือ "คุณต้องยื่นเอกสารนี้" (ให้บอกเพียงว่าระเบียบ/ขั้นตอนกำหนดไว้อย่างไร)
3. **เรื่องอายุความ:** หากผู้ถามถามเรื่องระยะเวลาฟ้องคดี ให้ตอบเพียง "หลักเกณฑ์ที่กฎหมายกำหนด" ตามข้อมูลที่มี **ห้ามคำนวณวันหมดอายุความแบบเจาะจง** ให้ผู้ถามเด็ดขาด
4. **กรณีข้อมูลไม่เพียงพอ:** หากข้อมูลใน Context ไม่สามารถตอบคำถามได้ชัดเจน, ข้อมูลไม่ครบถ้วน, หรือ AI ไม่แน่ใจ ให้ตอบข้อความนี้ทันที:
   "ขออภัย ข้อมูลที่ท่านถามไม่อยู่ในขอบเขตที่สามารถตอบได้ เพื่อให้ได้ข้อมูลที่ชัดเจน ถูกต้อง โปรดติดต่อสอบถามเจ้าหน้าที่ ทาง 1355"
"""

# ==========================================
# 🔌 2. BACKEND SERVICES
# ==========================================
@st.cache_resource
def get_aws_runtime(): 
    return boto3.client('bedrock-runtime', region_name=REGION, aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY)

@st.cache_resource
def get_aws_agent(): 
    return boto3.client('bedrock-agent-runtime', region_name=REGION, aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY)

@st.cache_resource
def get_deepseek_client(): 
    return OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")

if GEMINI_API_KEY: genai.configure(api_key=GEMINI_API_KEY)

def get_sheet_client():
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
    return gspread.authorize(creds).open(SHEET_NAME).sheet1

def save_to_sheet(username, q, r_left, r_right):
    try:
        sheet = get_sheet_client()
        row = [
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"), username, q,
            r_left['model'], r_left['answer'], f"{r_left['cost']:.4f}",
            r_right['model'], r_right['answer'], f"{r_right['cost']:.4f}"
        ]
        sheet.append_row(row)
    except Exception as e:
        print(f"Sheet Error: {e}")

def load_history_from_sheet(target_username):
    try:
        sheet = get_sheet_client()
        data = sheet.get_all_values()
        if not data: return pd.DataFrame()
        headers = data[0]; rows = data[1:]
        df = pd.DataFrame(rows, columns=headers)
        user_col = next((c for c in df.columns if 'username' in c.lower()), None)
        if user_col and target_username:
            return df[df[user_col].astype(str).str.contains(target_username, case=False, na=False)]
        return df
    except Exception as e:
        return pd.DataFrame()

# --- RAG & AI Logic ---
def retrieve_context(query):
    try:
        agent = get_aws_agent()
        res = agent.retrieve(
            knowledgeBaseId=KB_ID, 
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
                    clean_text = text_chunk.replace('"', "'").replace('\n', ' ')
                    citation_details[fname] = clean_text[:300] + "..."
        return ctx, citation_details
    except: return "", {}

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
                "max_tokens": 2048, 
                "temperature": temperature,
                "messages": [{"role": "user", "content": full_input}]
            })
            res = get_aws_runtime().invoke_model(modelId=cfg["id"], body=body)
            answer = json.loads(res.get('body').read())['content'][0]['text']
        elif cfg["type"] == "deepseek":
            res = get_deepseek_client().chat.completions.create(
                model=cfg["id"], 
                temperature=temperature,
                messages=[{"role": "user", "content": full_input}]
            )
            answer = res.choices[0].message.content
        elif cfg["type"] == "gemini":
            gen_cfg = genai.GenerationConfig(temperature=temperature)
            answer = genai.GenerativeModel(cfg["id"]).generate_content(full_input, generation_config=gen_cfg).text
            
    except Exception as e:
        error_msg = str(e)
        if "402" in error_msg or "Insufficient Balance" in error_msg:
            answer = "⚠️ ยอดเงินเครดิต API หมด (Insufficient Balance) กรุณาเติมเงิน"
        else:
            answer = f"⚠️ เกิดข้อผิดพลาด: {error_msg}"
    
    elapsed = time.time() - start_time
    return {"model": model_name, "answer": answer, "citations": citations_dict, 
            "cost": calculate_cost(cfg["id"], full_input, answer), "config": cfg, "time": elapsed}

# ==========================================
# 🎨 3. THEME & UI MANAGER
# ==========================================

# Sidebar: Controls & Settings
with st.sidebar:
    st.image("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Emblem_of_the_Administrative_Court_of_Thailand.svg/1200px-Emblem_of_the_Administrative_Court_of_Thailand.svg.png", width=80)
    st.title("Smart Court AI")
    st.markdown("ระบบผู้ช่วยอัจฉริยะศาลปกครอง")
    
    st.markdown("---")
    st.subheader("⚙️ ตั้งค่าการประมวลผล")
    
    # Theme
    theme_choice = st.selectbox("🎨 ธีม (Theme)", ["🌙 Modern Dark", "☀️ Official Light"])
    
    # Model Selection (ย้ายมาไว้ข้างล่างเพื่อให้ Chat Area โล่ง)
    st.markdown("⚔️ **คู่เทียบโมเดล (Model Matchup)**")
    model_keys = list(MODELS.keys())
    m_left = st.selectbox("🤖 ฝั่งซ้าย (Model A)", model_keys, index=0)
    default_right_index = model_keys.index("Gemini 2.0 Flash") if "Gemini 2.0 Flash" in model_keys else 1
    m_right = st.selectbox("🦁 ฝั่งขวา (Model B)", model_keys, index=default_right_index)
    
    # Temperature Slider (New Feature)
    temp_val = st.slider("🌡️ ระดับความสร้างสรรค์ (Temperature)", 0.0, 1.0, 0.3, help="ค่าน้อย = แม่นยำตามข้อมูล, ค่ามาก = ภาษาลื่นไหลแต่อาจฟุ้งซ่าน")
    
    st.markdown("---")
    username = st.text_input("👤 ชื่อผู้ใช้งาน", value="Officer")
    
    c1, c2 = st.columns(2)
    if c1.button("🗑️ ล้างแชท", use_container_width=True):
        st.session_state.messages = []
        st.rerun()
    
    # Export Button (New Feature)
    if st.session_state.get("messages"):
        chat_str = "\n".join([f"{m['role']}: {m['content']}" if m['role']=='user' else "AI Reponse" for m in st.session_state.messages])
        c2.download_button("📥 Save", chat_str, "chat_history.txt", use_container_width=True)


# CSS Injection
if "Light" in theme_choice:
    bg_color, card_bg, text_color = "#F8F9FA", "#FFFFFF", "#212529"
    header_gradient = "linear-gradient(135deg, #003366 0%, #0056b3 100%)"
    citation_bg, tooltip_bg, tooltip_text = "rgba(0, 51, 102, 0.1)", "#333", "#fff"
else:
    bg_color, card_bg, text_color = "#0E1117", "#1E1E1E", "#E0E0E0"
    header_gradient = "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)"
    citation_bg, tooltip_bg, tooltip_text = "rgba(255, 255, 255, 0.1)", "#fff", "#000"

st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600&display=swap');
    .stApp {{ background-color: {bg_color}; }}
    html, body, [class*="css"] {{ font-family: 'Sarabun', sans-serif; color: {text_color}; }}
    
    .court-header {{
        background: {header_gradient}; padding: 1.5rem; border-radius: 12px; color: white;
        text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 20px;
    }}
    
    /* Modern Card Style for Responses */
    .response-card {{
        background-color: {card_bg};
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid {citation_bg};
        margin-bottom: 15px;
        transition: transform 0.2s;
    }}
    .response-card:hover {{ transform: translateY(-2px); }}
    
    /* Custom Badge for Model Name */
    .model-badge {{
        display: inline-block; padding: 4px 10px; border-radius: 15px;
        font-size: 0.85rem; font-weight: 600; margin-bottom: 10px;
        color: white; background: {text_color}; opacity: 0.8;
    }}

    /* Tooltip & Citations */
    .citation-container {{ position: relative; display: inline-block; margin: 2px; cursor: pointer; }}
    .citation-tag {{
        background: {citation_bg}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;
        border: 1px solid {text_color}; opacity: 0.7; color: {text_color};
    }}
    .citation-container .tooltip-text {{
        visibility: hidden; width: 280px; background-color: {tooltip_bg}; color: {tooltip_text};
        text-align: left; border-radius: 6px; padding: 10px; font-size: 0.8rem;
        position: absolute; z-index: 10; bottom: 130%; left: 50%; margin-left: -140px;
        opacity: 0; transition: opacity 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }}
    .citation-container:hover .tooltip-text {{ visibility: visible; opacity: 1; }}
    
    .main > .block-container {{ padding-bottom: 6rem; }}
</style>
""", unsafe_allow_html=True)

# ==========================================
# 🖥️ 4. MAIN LAYOUT
# ==========================================

st.markdown("""
<div class="court-header">
    <h2 style='margin:0;'>⚖️ Smart Court AI Knowledge Base</h2>
    <p style='margin:5px 0 0 0; opacity:0.85; font-size:0.9rem;'>ระบบสืบค้นและวิเคราะห์ข้อมูลคดีปกครองด้วย AI</p>
</div>
""", unsafe_allow_html=True)

tab_chat, tab_hist = st.tabs(["💬 สนทนา (Chat)", "📜 ประวัติการใช้งาน (History)"])

def display_result_box(res_data):
    # Model Badge
    icon = res_data['config']['icon']
    color = res_data['config']['color']
    
    st.markdown(f"""
    <div class="response-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="model-badge" style="background-color:{color};">{icon} {res_data['model']}</span>
            <span style="font-size:0.8rem; opacity:0.6;">⏱️ {res_data['time']:.2f}s</span>
        </div>
        <div style="margin-top:10px; line-height:1.6;">{res_data['answer']}</div>
    """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Citations
    if res_data.get("citations"):
        st.markdown("**📚 เอกสารอ้างอิง:**")
        citations_html = ""
        for fname, snippet in res_data['citations'].items():
            citations_html += f"""
            <div class="citation-container">
                <span class="citation-tag">📄 {fname}</span>
                <div class="tooltip-text"><b>{fname}</b><hr style="margin:5px 0; border-color:grey;">{snippet}</div>
            </div>
            """
        st.markdown(citations_html, unsafe_allow_html=True)
    
    # Cost & Stats
    c1, c2 = st.columns([2, 1])
    with c1:
        st.markdown(f"**💸 ค่าใช้จ่าย:** `{res_data['cost']:.4f} บาท`")
    with c2:
        # Mini visual bar for cost
        st.progress(min(res_data['cost'] * 10, 1.0)) # สมมติ max 0.1 บาท เต็มหลอด
    
    st.markdown("</div>", unsafe_allow_html=True)

# --- TAB 1: CHAT ---
with tab_chat:
    
    # Container สำหรับ Chat History + New Response
    chat_container = st.container()

    with chat_container:
        if "messages" not in st.session_state: st.session_state.messages = []
        for msg in st.session_state.messages:
            if msg["role"] == "user":
                with st.chat_message("user", avatar="🧑‍💼"):
                    st.markdown(f"<div style='background:{citation_bg}; padding:10px; border-radius:10px;'>{msg['content']}</div>", unsafe_allow_html=True)
            else:
                with st.chat_message("assistant", avatar="⚖️"):
                    c1, c2 = st.columns(2)
                    with c1: display_result_box(msg["left"])
                    with c2: display_result_box(msg["right"])

    # Fixed Input
    if prompt := st.chat_input("พิมพ์คำถามเพื่อสืบค้นข้อมูล..."):
        with chat_container:
            with st.chat_message("user", avatar="🧑‍💼"):
                st.markdown(f"<div style='background:{citation_bg}; padding:10px; border-radius:10px;'>{prompt}</div>", unsafe_allow_html=True)
            
            st.session_state.messages.append({"role": "user", "content": prompt})

            with st.chat_message("assistant", avatar="⚖️"):
                status = st.status("🔍 กำลังค้นหาและวิเคราะห์ข้อมูล...", expanded=True)
                ctx, cite_details = retrieve_context(prompt)
                
                if not ctx:
                    status.update(label="❌ ไม่พบข้อมูล", state="error")
                    st.error("ไม่พบข้อมูลในฐานข้อมูล Knowledge Base")
                else:
                    status.write("⚡ AI กำลังประมวลผล (Parallel Mode)...")
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        f1 = executor.submit(call_single_model, m_left, prompt, ctx, cite_details, temp_val)
                        f2 = executor.submit(call_single_model, m_right, prompt, ctx, cite_details, temp_val)
                        res_l, res_r = f1.result(), f2.result()
                    
                    status.update(label="✅ เสร็จสิ้น", state="complete", expanded=False)
                    
                    c1, c2 = st.columns(2)
                    with c1: display_result_box(res_l)
                    with c2: display_result_box(res_r)

                    st.session_state.messages.append({"role": "assistant", "left": res_l, "right": res_r})
                    if username: save_to_sheet(username, prompt, res_l, res_r)

# --- TAB 2: HISTORY ---
with tab_hist:
    st.subheader(f"📜 ประวัติการใช้งาน: {username}")
    if st.button("🔄 รีเฟรชข้อมูล"):
        st.cache_data.clear()
        st.rerun()
    
    df = load_history_from_sheet(username)
    if not df.empty:
        st.dataframe(df, use_container_width=True, hide_index=True)
        # Gimmick: Show cost summary chart
        if 'Cost A (THB)' in df.columns or df.shape[1] > 5: # Check valid columns
            try:
                # แปลงข้อมูลเป็นตัวเลขเพื่อพลอตกราฟ (สมมติ column index 5 และ 8 คือ cost)
                df.iloc[:, 5] = pd.to_numeric(df.iloc[:, 5], errors='coerce')
                df.iloc[:, 8] = pd.to_numeric(df.iloc[:, 8], errors='coerce')
                st.caption("📊 กราฟค่าใช้จ่ายล่าสุด")
                st.line_chart(df.iloc[:, [5, 8]])
            except: pass
    else:
        st.info("ไม่พบประวัติการใช้งาน")