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
KB_ID = "UHX3CVMTKL"
SHEET_NAME = "Court_AI_Logs"
THB_RATE = 35.0 

# 🛠️ FIXED: อัปเดตรายชื่อโมเดลให้ตรงกับสิทธิ์ที่คุณมี (จากลิสต์ที่คุณส่งมา)
MODELS = {
    "Claude 3.5 Sonnet": {"type": "bedrock", "id": "anthropic.claude-3-5-sonnet-20240620-v1:0", "icon": "🔶", "color": "#d97757"},
    "Claude 3 Opus": {"type": "bedrock", "id": "anthropic.claude-3-opus-20240229-v1:0", "icon": "🎓", "color": "#8d4f39"},
    "Claude 3 Haiku": {"type": "bedrock", "id": "anthropic.claude-3-haiku-20240307-v1:0", "icon": "⚡", "color": "#e09f87"},
    "DeepSeek V3": {"type": "deepseek", "id": "deepseek-chat", "icon": "🐳", "color": "#4d6bfe"},
    
    # ✅ เปลี่ยนมาใช้รุ่นที่มีในลิสต์ของคุณ
    "Gemini 2.0 Flash": {"type": "gemini", "id": "gemini-2.0-flash", "icon": "✨", "color": "#4285F4"},
    "Gemini 2.5 Pro": {"type": "gemini", "id": "gemini-2.5-pro", "icon": "💎", "color": "#8E44AD"},
}

MODEL_PRICING = {
    "anthropic.claude-3-5-sonnet-20240620-v1:0": [3.00, 15.00],
    "anthropic.claude-3-opus-20240229-v1:0": [15.00, 75.00],
    "anthropic.claude-3-haiku-20240307-v1:0": [0.25, 1.25],
    "deepseek-chat": [0.14, 0.28],
    # อัปเดตราคา (ประมาณการ)
    "gemini-2.0-flash": [0.10, 0.40],
    "gemini-2.5-pro": [3.50, 10.50],
}

SYSTEM_PROMPT = """
บทบาท: คุณคือ "AI ผู้ช่วยอัจฉริยะประจำศาลปกครอง"
หน้าที่หลัก: สืบค้น วิเคราะห์ และสรุปข้อมูลจากเอกสารอ้างอิง (Context) เพื่อตอบคำถามประชาชนด้วยภาษาที่เข้าใจง่าย กระชับ และถูกต้องตามหลักการ

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
        return gspread.authorize(creds).open(SHEET_NAME).sheet1
    except: return None

def save_to_sheet(username, q, r_left, r_right):
    try:
        sheet = get_sheet_client()
        if sheet:
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
        elif "429" in error_msg:
             answer = "⚠️ ใช้งานเกินโควตาฟรี (Rate Limit) กรุณารอสักครู่"
        else:
            answer = f"⚠️ เกิดข้อผิดพลาด: {error_msg}"
    
    elapsed = time.time() - start_time
    return {"model": model_name, "answer": answer, "citations": citations_dict, 
            "cost": calculate_cost(cfg["id"], full_input, answer), "config": cfg, "time": elapsed}

# ==========================================
# 🎨 3. THEME & UI MANAGER
# ==========================================

# Sidebar
with st.sidebar:
    st.markdown("""
        <div style="text-align: center; margin-bottom: 10px;">
            <div class="court-icon">⚖️</div>
        </div>
    """, unsafe_allow_html=True)
    
    st.title("Smart Court AI")
    st.markdown("ระบบผู้ช่วยอัจฉริยะศาลปกครอง")
    st.markdown("---")
    st.subheader("⚙️ ตั้งค่า")
    
    theme_choice = st.radio("🎨 เลือกธีม", ["🌙 Modern Dark", "☀️ Official Light"])
    
    st.markdown("⚔️ **คู่เทียบโมเดล**")
    model_keys = list(MODELS.keys())
    m_left = st.selectbox("🤖 ฝั่งซ้าย", model_keys, index=0)
    # Default index adjusted for new list
    m_right = st.selectbox("🦁 ฝั่งขวา", model_keys, index=4) 
    
    temp_val = st.slider("🌡️ ความสร้างสรรค์", 0.0, 1.0, 0.3)
    
    st.markdown("---")
    username = st.text_input("👤 ชื่อผู้ใช้งาน", value="Officer")
    
    c1, c2 = st.columns(2)
    if c1.button("🗑️ ล้างแชท", use_container_width=True):
        st.session_state.messages = []
        st.rerun()
    if st.session_state.get("messages"):
        chat_str = "\n".join([f"{m['role']}: {m['content']}" if m['role']=='user' else "AI Reponse" for m in st.session_state.messages])
        c2.download_button("📥 Save", chat_str, "chat_history.txt", use_container_width=True)

# --- 🌈 INTELLIGENT THEME CONFIGURATION ---
if "Light" in theme_choice:
    # ☀️ LIGHT THEME
    bg_color = "#f8f9fa"         
    card_bg = "#ffffff"          
    text_color = "#212529"       
    header_gradient = "linear-gradient(135deg, #0f3460 0%, #16213e 100%)" 
    citation_bg = "#e3f2fd"
    citation_border = "#90caf9"
    citation_text = "#0d47a1"
    tooltip_bg = "#343a40"
    tooltip_text = "#fff"
    user_bubble_bg = "#e3f2fd"
    user_bubble_text = "#212529"
    shadow_style = "0 2px 5px rgba(0,0,0,0.05)"
    
    border_color = "#dee2e6"
    card_header_bg = "#f1f3f5"
    input_bg = "#ffffff"
    sidebar_bg = "#ffffff"
    sidebar_text = "#212529"
    btn_color = "#0f3460"
    btn_text = "#ffffff"
    
else:
    # 🌙 DARK THEME
    bg_color = "#0e1117"         
    card_bg = "#1e1e1e"          
    text_color = "#ffffff"       
    header_gradient = "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)" 
    
    citation_bg = "#2d2d2d"       
    citation_border = "#555555"   
    citation_text = "#e0e0e0"     
    
    tooltip_bg = "#ffffff"
    tooltip_text = "#000000"
    user_bubble_bg = "#343a40"
    user_bubble_text = "#ffffff"
    shadow_style = "0 4px 6px rgba(0,0,0,0.3)"
    
    border_color = "#444444"
    card_header_bg = "#262730"    
    input_bg = "#262730"          
    sidebar_bg = "#161b22"        
    sidebar_text = "#e0e0e0"      
    btn_color = "#343a40"
    btn_text = "#e0e0e0"

st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&display=swap');
    .stApp {{ background-color: {bg_color}; }}
    
    html, body, [class*="css"], .stMarkdown, .stText, p {{ 
        font-family: 'Sarabun', sans-serif !important; 
        color: {text_color} !important;
    }}
    
    h1, h2, h3, h4, h5, h6 {{ color: {text_color} !important; }}

    /* Header */
    .court-header {{
        background: {header_gradient}; padding: 1.5rem; border-radius: 12px; color: white !important;
        text-align: center; box-shadow: {shadow_style}; margin-bottom: 25px;
    }}
    .court-header h2, .court-header p {{ color: white !important; }}
    
    /* Icon */
    .court-icon {{
        font-size: 80px; line-height: 1; cursor: default; color: #FFD700; 
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.6), 0 0 20px rgba(255, 215, 0, 0.4);
        transition: transform 0.3s ease; display: inline-block;
    }}
    .court-icon:hover {{ transform: scale(1.1); }}

    /* Response Card */
    .response-card {{
        background-color: {card_bg}; padding: 0; border-radius: 12px;
        box-shadow: {shadow_style}; border: 1px solid {border_color};
        margin-bottom: 15px; color: {text_color}; overflow: hidden;
    }}
    .card-content {{ padding: 20px; }}
    
    /* Card Header */
    .card-header {{
        background-color: {card_header_bg}; padding: 12px 20px;
        border-bottom: 1px solid {border_color};
        display: flex; justify-content: space-between; align-items: center;
    }}
    
    /* Model Badge */
    .model-badge {{
        display: inline-block; padding: 5px 12px; border-radius: 20px;
        font-size: 0.8rem; font-weight: 600; color: white !important; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }}

    /* Citations */
    .citation-container {{
        background-color: {citation_bg};
        border-left: 3px solid #FFD700; 
        padding: 10px; margin-top: 10px; border-radius: 6px;
        border-top: 1px solid {border_color};
        border-right: 1px solid {border_color};
        border-bottom: 1px solid {border_color};
    }}
    .citation-title {{
        font-weight: bold; margin-bottom: 5px; color: {citation_text} !important; font-size: 0.9rem;
    }}
    .citation-body {{
        font-size: 0.85rem; color: {citation_text} !important; opacity: 0.9; font-style: italic;
    }}
    
    /* User Bubble */
    .user-bubble {{
        background-color: {user_bubble_bg};
        color: {user_bubble_text} !important;
        padding: 12px 18px;
        border-radius: 18px 18px 4px 18px;
        margin-left: auto;
        width: fit-content; max-width: 80%;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        text-align: right;
    }}
    
    /* Input Box */
    .stChatInput textarea {{ 
        background-color: {input_bg} !important; 
        color: {text_color} !important; 
        border: 1px solid {border_color} !important;
    }}
    
    /* Sidebar */
    [data-testid="stSidebar"] {{ 
        background-color: {sidebar_bg}; 
        border-right: 1px solid {border_color}; 
    }}
    [data-testid="stSidebar"] * {{ color: {sidebar_text} !important; }}
    
    /* Selectbox & Input in Sidebar */
    .stSelectbox div[data-baseweb="select"] > div {{
        background-color: {input_bg}; color: {text_color}; border-color: {border_color};
    }}
    .stTextInput input {{
        background-color: {input_bg}; color: {text_color}; border-color: {border_color};
    }}
    
    /* Buttons */
    .stButton > button {{
        background-color: {btn_color}; color: {btn_text}; border: 1px solid {border_color};
        width: 100%; border-radius: 8px; transition: 0.3s;
    }}
    .stButton > button:hover {{
        border-color: #FFD700; color: #FFD700;
    }}

    /* Table */
    [data-testid="stDataFrame"] {{ background-color: {card_bg} !important; }}
    
    /* Scrollbar */
    ::-webkit-scrollbar {{ width: 8px; }}
    ::-webkit-scrollbar-thumb {{ background: #888; border-radius: 4px; }}
    ::-webkit-scrollbar-thumb:hover {{ background: #555; }}

</style>
""", unsafe_allow_html=True)

# ==========================================
# 🖥️ 4. MAIN LAYOUT
# ==========================================

st.markdown("""
<div class="court-header">
    <h2 style='margin:0;'>⚖️ Smart Court AI Knowledge Base</h2>
    <p style='margin:5px 0 0 0; opacity:0.9; font-size:1rem;'>ระบบสืบค้นและวิเคราะห์ข้อมูลคดีปกครองด้วย AI</p>
</div>
""", unsafe_allow_html=True)

tab_chat, tab_hist = st.tabs(["💬 สนทนา (Chat)", "📜 ประวัติการใช้งาน (History)"])

def display_result_box(res_data):
    icon = res_data['config']['icon']
    color = res_data['config']['color']
    
    st.markdown(f"""
    <div class="response-card">
        <div class="card-header">
            <span class="model-badge" style="background-color:{color};">{icon} {res_data['model']}</span>
            <span style="font-size:0.8rem; font-weight:600; opacity:0.7;">⏱️ {res_data['time']:.2f}s</span>
        </div>
        <div class="card-content">
            <div style="margin-top:0px; line-height:1.7; font-size:1rem;">{res_data['answer']}</div>
    """, unsafe_allow_html=True)
    
    if res_data.get("citations"):
        st.markdown(f"<hr style='margin:15px 0; border-top:1px dashed {text_color}; opacity:0.2;'>", unsafe_allow_html=True)
        st.markdown("**📚 เอกสารอ้างอิง (References):**")
        citations_html = ""
        for fname, snippet in res_data['citations'].items():
            citations_html += f"""
            <div class="citation-container">
                <div class="citation-title">📄 {fname}</div>
                <div class="citation-body">"{snippet}"</div>
            </div>
            """
        st.markdown(citations_html, unsafe_allow_html=True)
    
    # Footer Stats
    st.markdown(f"""
        <div style="margin-top:15px; font-size:0.85rem; color:#2ecc71 !important; text-align:right;">
            💸 Estimated Cost: <b>{res_data['cost']:.4f} THB</b>
        </div>
    </div>
    </div>
    """, unsafe_allow_html=True)

# --- TAB 1: CHAT ---
with tab_chat:
    chat_container = st.container()

    with chat_container:
        if "messages" not in st.session_state: st.session_state.messages = []
        for msg in st.session_state.messages:
            if msg["role"] == "user":
                with st.chat_message("user", avatar="🧑‍💼"):
                    st.markdown(f"""<div class="user-bubble">{msg['content']}</div>""", unsafe_allow_html=True)
            else:
                with st.chat_message("assistant", avatar="⚖️"):
                    c1, c2 = st.columns(2)
                    with c1: display_result_box(msg["left"])
                    with c2: display_result_box(msg["right"])

    # Fixed Input
    if prompt := st.chat_input("พิมพ์คำถามเพื่อสืบค้นข้อมูล..."):
        with chat_container:
            with st.chat_message("user", avatar="🧑‍💼"):
                 st.markdown(f"""<div class="user-bubble">{prompt}</div>""", unsafe_allow_html=True)
            
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
        if 'Cost A (THB)' in df.columns or df.shape[1] > 5:
            try:
                df.iloc[:, 5] = pd.to_numeric(df.iloc[:, 5], errors='coerce')
                df.iloc[:, 8] = pd.to_numeric(df.iloc[:, 8], errors='coerce')
                st.caption("📊 กราฟค่าใช้จ่ายล่าสุด")
                st.line_chart(df.iloc[:, [5, 8]])
            except: pass
    else:
        st.info("ไม่พบประวัติการใช้งาน")