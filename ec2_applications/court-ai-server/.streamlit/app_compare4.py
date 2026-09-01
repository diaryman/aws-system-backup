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

# --- 🚀 UPDATE: MODELS ---
MODELS = {
    "Claude 3.5 Sonnet": {"type": "bedrock", "id": "anthropic.claude-3-5-sonnet-20240620-v1:0", "icon": "🔶", "color": "#d97757"},
    "Claude 3 Opus": {"type": "bedrock", "id": "anthropic.claude-3-opus-20240229-v1:0", "icon": "🎓", "color": "#8d4f39"},
    "Claude 3 Haiku": {"type": "bedrock", "id": "anthropic.claude-3-haiku-20240307-v1:0", "icon": "⚡", "color": "#e09f87"},
    "DeepSeek V3": {"type": "deepseek", "id": "deepseek-chat", "icon": "🐳", "color": "#4d6bfe"},
    "Gemini 2.0 Flash": {"type": "gemini", "id": "gemini-2.0-flash", "icon": "✨", "color": "#4285F4"},
    "Gemini 1.5 Pro": {"type": "gemini", "id": "gemini-1.5-pro", "icon": "💎", "color": "#8E44AD"},
    "Gemini 1.5 Flash": {"type": "gemini", "id": "gemini-1.5-flash", "icon": "⚡", "color": "#34A853"}
}

# --- 💰 PRICING ---
MODEL_PRICING = {
    "anthropic.claude-3-5-sonnet-20240620-v1:0": [3.00, 15.00],
    "anthropic.claude-3-opus-20240229-v1:0": [15.00, 75.00],
    "anthropic.claude-3-haiku-20240307-v1:0": [0.25, 1.25],
    "deepseek-chat": [0.14, 0.28],
    "gemini-2.0-flash": [0.10, 0.40],
    "gemini-1.5-pro": [3.50, 10.50],
    "gemini-1.5-flash": [0.075, 0.30]
}

# --- 🔥 SYSTEM PROMPT ---
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

# --- Google Sheets Helper ---
def get_sheet_client():
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
    return gspread.authorize(creds).open(SHEET_NAME).sheet1

def save_to_sheet(username, q, r_left, r_right):
    try:
        sheet = get_sheet_client()
        row = [
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            username,
            q,
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
        ctx = ""
        citation_details = {} 

        if 'retrievalResults' in res:
            for r in res['retrievalResults']:
                text_chunk = r['content']['text']
                ctx += f"- {text_chunk}\n"
                
                # ดึงชื่อไฟล์และ Snippet
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

def call_single_model(model_name, prompt, context, citations_dict):
    cfg = MODELS[model_name]
    full_input = f"{SYSTEM_PROMPT}\n\nContext (เอกสารอ้างอิง):\n{context}\n\nคำถามจากประชาชน: {prompt}"
    answer = ""
    
    try:
        if cfg["type"] == "bedrock":
            body = json.dumps({"anthropic_version": "bedrock-2023-05-31", "max_tokens": 2048, "messages": [{"role": "user", "content": full_input}]})
            res = get_aws_runtime().invoke_model(modelId=cfg["id"], body=body)
            answer = json.loads(res.get('body').read())['content'][0]['text']
        elif cfg["type"] == "deepseek":
            res = get_deepseek_client().chat.completions.create(model=cfg["id"], messages=[{"role": "user", "content": full_input}])
            answer = res.choices[0].message.content
        elif cfg["type"] == "gemini":
            answer = genai.GenerativeModel(cfg["id"]).generate_content(full_input).text
            
    except Exception as e:
        error_msg = str(e)
        if "402" in error_msg or "Insufficient Balance" in error_msg:
            answer = "⚠️ ยอดเงินเครดิต API หมด (Insufficient Balance) กรุณาเติมเงินในบัญชี DeepSeek"
        else:
            answer = f"⚠️ เกิดข้อผิดพลาด: {error_msg}"
    
    return {"model": model_name, "answer": answer, "citations": citations_dict, "cost": calculate_cost(cfg["id"], full_input, answer), "config": cfg}

# ==========================================
# 🎨 3. THEME & UI MANAGER
# ==========================================

with st.sidebar:
    st.title("⚖️ การตั้งค่า")
    st.subheader("🎨 รูปแบบการแสดงผล")
    theme_choice = st.radio("เลือกธีม:", ["🌙 Modern Dark", "☀️ Official Light"], index=0)
    st.markdown("---")
    username = st.text_input("👤 ผู้ใช้งาน", value="Officer")
    if st.button("🗑️ ล้างแชท"):
        st.session_state.messages = []
        st.rerun()

# Dynamic CSS Injection
if "Light" in theme_choice:
    bg_color = "#F4F6F9"
    card_bg = "#FFFFFF"
    text_color = "#1F2937"
    header_gradient = "linear-gradient(135deg, #002D62 0%, #0056b3 100%)"
    citation_bg = "rgba(0, 45, 98, 0.1)"
    vs_bg = "#E5E7EB"
    vs_border = "#D1D5DB"
    tooltip_bg = "#333"
    tooltip_text = "#fff"
else:
    bg_color = "#0E1117"
    card_bg = "#1E1E1E"
    text_color = "#E0E0E0"
    header_gradient = "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)"
    citation_bg = "rgba(255, 255, 255, 0.1)"
    vs_bg = "#262730"
    vs_border = "#444444"
    tooltip_bg = "#fff"
    tooltip_text = "#000"

st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600&display=swap');
    .stApp {{ background-color: {bg_color}; }}
    html, body, [class*="css"] {{ font-family: 'Sarabun', sans-serif; color: {text_color}; }}
    
    .court-header {{
        background: {header_gradient};
        padding: 2rem; border-radius: 15px; color: white;
        text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.15); margin-bottom: 20px;
    }}
    .vs-container {{
        background-color: {vs_bg};
        border: 1px solid {vs_border};
        border-radius: 10px; padding: 15px; margin-bottom: 20px; text-align: center;
    }}
    
    /* Ensure padding at bottom so fixed input doesn't overlap content */
    .main > .block-container {{
        padding-bottom: 6rem; /* เพิ่มพื้นที่ด้านล่างให้มากขึ้น */
    }}

    /* --- TOOLTIP CSS --- */
    .citation-container {{
        position: relative; display: inline-block; margin: 3px; cursor: pointer;
    }}
    .citation-tag {{
        background: {citation_bg}; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;
        border: 1px solid {text_color}; opacity: 0.8;
    }}
    .citation-container .tooltip-text {{
        visibility: hidden; width: 300px; background-color: {tooltip_bg}; color: {tooltip_text};
        text-align: left; border-radius: 6px; padding: 10px; font-size: 0.8rem;
        position: absolute; z-index: 1; bottom: 125%; left: 50%; margin-left: -150px; 
        opacity: 0; transition: opacity 0.3s; box-shadow: 0px 4px 10px rgba(0,0,0,0.3);
        border: 1px solid {text_color};
    }}
    .citation-container:hover .tooltip-text {{ visibility: visible; opacity: 1; }}

    .stTabs [data-baseweb="tab-list"] {{ gap: 24px; }}
    .stTabs [data-baseweb="tab"] {{ height: 50px; white-space: pre-wrap; background-color: {card_bg}; border-radius: 5px; color: {text_color}; }}
    .stTabs [aria-selected="true"] {{ background-color: {citation_bg}; border-bottom: 2px solid #FFD700; }}
</style>
""", unsafe_allow_html=True)

# ==========================================
# 🖥️ 4. MAIN LAYOUT
# ==========================================

st.markdown("""
<div class="court-header">
    <h1 style='margin:0; font-size: 2rem;'>⚖️ Smart Court AI Knowledge Base</h1>
    <p style='margin-top:5px; opacity:0.9;'>ระบบสนับสนุนการค้นหาและเปรียบเทียบข้อมูลคดีปกครอง</p>
</div>
""", unsafe_allow_html=True)

tab_chat, tab_hist = st.tabs(["💬 สนทนา (Chat)", "📜 ประวัติการใช้งาน (History)"])

# Helper Function
def display_result_box(res_data):
    st.markdown(res_data["answer"])
    st.markdown("---")
    if res_data.get("citations"):
        st.markdown("**📚 แหล่งข้อมูลอ้างอิง (ชี้เพื่อดูเนื้อหา):**")
        citations_html = ""
        for fname, snippet in res_data['citations'].items():
            citations_html += f"""
            <div class="citation-container">
                <span class="citation-tag">📄 {fname}</span>
                <div class="tooltip-text"><b>{fname}</b><hr style="margin:5px 0">{snippet}</div>
            </div>
            """
        st.markdown(citations_html, unsafe_allow_html=True)
    st.markdown(f"**💸 ค่าใช้จ่าย:** `{res_data['cost']:.4f} บาท`")

# --- TAB 1: CHAT ---
with tab_chat:
    
    # 🟢 1. MODEL SELECTOR (Top)
    model_keys = list(MODELS.keys())
    
    with st.container():
        st.markdown(f"""
        <div class="vs-container">
            <h4 style="margin:0; opacity:0.8;">⚔️ กำหนดคู่เทียบโมเดล (Model Matchup)</h4>
        </div>
        """, unsafe_allow_html=True)
        
        c_m1, c_sep, c_m2 = st.columns([10, 1, 10])
        with c_m1:
            st.markdown("##### 🤖 ฝั่งซ้าย (Model A)")
            m_left = st.selectbox("เลือกโมเดล A", model_keys, index=0, label_visibility="collapsed", key="m_left")
        with c_sep:
            st.markdown(f"""<div style="height: 60px; border-left: 2px dashed {text_color}; opacity: 0.3; margin: auto; width: 1px;"></div>""", unsafe_allow_html=True)
        with c_m2:
            st.markdown("##### 🦁 ฝั่งขวา (Model B)")
            default_right_index = model_keys.index("Gemini 2.0 Flash") if "Gemini 2.0 Flash" in model_keys else 1
            m_right = st.selectbox("เลือกโมเดล B", model_keys, index=default_right_index, label_visibility="collapsed", key="m_right")
    
    st.divider()

    # 🟢 2. CHAT CONTAINER (Middle - Grows Upwards)
    # ⚠️ สำคัญ: สร้าง Container เพื่อมัดรวมประวัติ + ข้อความใหม่ไว้ด้วยกัน
    chat_container = st.container()

    # แสดงประวัติการแชทเดิมใน Container
    with chat_container:
        if "messages" not in st.session_state: st.session_state.messages = []
        for msg in st.session_state.messages:
            if msg["role"] == "user":
                st.chat_message("user", avatar="🧑‍💼").markdown(msg["content"])
            else:
                with st.chat_message("assistant", avatar="⚖️"):
                    c1, c2 = st.columns(2)
                    with c1:
                        d = msg["left"]
                        st.markdown(f"**{d['config']['icon']} {d['model']}**")
                        with st.container(border=True):
                            display_result_box(d)
                    with c2:
                        d = msg["right"]
                        st.markdown(f"**{d['config']['icon']} {d['model']}**")
                        with st.container(border=True):
                            display_result_box(d)

    # 🟢 3. INPUT AREA & PROCESSING (Bottom - Fixed)
    # st.chat_input อยู่นอก chat_container จะถูกตรึงที่ด้านล่างสุดโดยอัตโนมัติ
    if prompt := st.chat_input("พิมพ์คำถามเพื่อสืบค้นข้อมูล..."):
        
        # ⚠️ สำคัญ: สั่งให้แสดงผล "ใน" chat_container เพื่อให้ข้อความใหม่อยู่ต่อจากข้อความเก่าเสมอ (และอยู่เหนือ Input box)
        with chat_container:
            # 3.1 แสดงข้อความผู้ใช้ทันที
            st.chat_message("user", avatar="🧑‍💼").markdown(prompt)
            st.session_state.messages.append({"role": "user", "content": prompt})

            # 3.2 แสดงสถานะและคำตอบ
            with st.chat_message("assistant", avatar="⚖️"):
                status = st.status("🔍 กำลังค้นหาข้อมูล...", expanded=True)
                ctx, cite_details = retrieve_context(prompt)
                
                if not ctx:
                    status.update(label="❌ ไม่พบข้อมูล", state="error")
                    st.error("ไม่พบข้อมูลในฐานข้อมูล")
                else:
                    status.write("⚡ กำลังประมวลผลคำตอบ (Parallel Mode)...")
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        f1 = executor.submit(call_single_model, m_left, prompt, ctx, cite_details)
                        f2 = executor.submit(call_single_model, m_right, prompt, ctx, cite_details)
                        res_l, res_r = f1.result(), f2.result()
                    
                    status.update(label="✅ เสร็จสิ้น", state="complete", expanded=False)
                    
                    # แสดงผลลัพธ์
                    c1, c2 = st.columns(2)
                    with c1:
                        st.markdown(f"##### {MODELS[m_left]['icon']} {m_left}")
                        with st.container(border=True):
                            display_result_box(res_l)
                    with c2:
                        st.markdown(f"##### {MODELS[m_right]['icon']} {m_right}")
                        with st.container(border=True):
                            display_result_box(res_r)

                    # บันทึกลง Session State
                    st.session_state.messages.append({"role": "assistant", "left": res_l, "right": res_r})
                    if username: save_to_sheet(username, prompt, res_l, res_r)

# --- TAB 2: HISTORY ---
with tab_hist:
    st.subheader(f"📜 ประวัติการใช้งานของ: {username}")
    col_h1, col_h2 = st.columns([1, 4])
    if col_h1.button("🔄 รีเฟรชข้อมูล"):
        st.cache_data.clear()
        st.rerun()
    
    with st.spinner("กำลังดึงข้อมูลจาก Google Sheets..."):
        df = load_history_from_sheet(username)
    
    if not df.empty:
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.info("ไม่พบประวัติการใช้งาน หรือยังไม่มีการเชื่อมต่อ Google Sheets")