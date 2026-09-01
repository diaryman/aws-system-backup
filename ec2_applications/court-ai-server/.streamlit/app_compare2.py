import streamlit as st
import boto3
from openai import OpenAI
import google.generativeai as genai
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import pandas as pd
import time
import json 

# =========================================================
# 🔴 1. CONFIGURATION (ข้อมูลเดิม)
# =========================================================
AWS_ACCESS_KEY = "AKIAYTQS56CHP7AMEIDN"       
AWS_SECRET_KEY = "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" 
KB_ID = "UHX3CVMTKL"  
REGION = "us-east-1"
DEEPSEEK_API_KEY = "sk-07ce6a4f4681466792a896d4c51d51df" 
GEMINI_API_KEY = "AIzaSyCvzLKpmHi24e5SinJTFny6BMzpCW8OiBA"
SHEET_NAME = "Court_AI_Logs" 

THB_RATE = 35.0 
MODEL_PRICING = {
    "anthropic.claude-3-5-sonnet-20240620-v1:0": [3.00, 15.00],
    "anthropic.claude-3-haiku-20240307-v1:0": [0.25, 1.25],
    "deepseek-chat": [0.14, 0.28],
    "deepseek-reasoner": [0.55, 2.19],
    "gemini-2.0-flash": [0.10, 0.40],
    "gemini-2.5-pro": [3.50, 10.50],
}

SYSTEM_PROMPT = """
คุณคือ "AI ผู้ช่วยอัจฉริยะประจำศาลปกครอง" มีหน้าที่ให้ข้อมูลแก่ประชาชนตามเอกสารอ้างอิงเท่านั้น
กฎเหล็ก:
1. ห้ามให้คำปรึกษาทางกฎหมาย หรือฟันธงผลแพ้-ชนะ
2. ห้ามวินิจฉัยว่าคดี "อยู่ในอำนาจศาล" หรือไม่
3. หากผู้ใช้ถามเรื่องอายุความ ให้ตอบเกณฑ์กฎหมาย แต่ห้ามคำนวณวันหมดอายุความให้เจาะจง
4. ต้องอ้างอิงข้อมูลจาก Context ที่ได้รับเท่านั้น
5. หากไม่มีข้อมูล ให้ตอบว่า "ไม่พบข้อมูลในฐานข้อมูล"
"""

# =========================================================
# ⚙️ 2. SYSTEM SETUP
# =========================================================
st.set_page_config(page_title="Smart Court AI", page_icon="⚖️", layout="wide")

# --- Clients ---
@st.cache_resource
def get_aws_runtime(): return boto3.client('bedrock-runtime', region_name=REGION, aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY)
@st.cache_resource
def get_aws_agent(): return boto3.client('bedrock-agent-runtime', region_name=REGION, aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY)
@st.cache_resource
def get_deepseek_client(): return OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")
if GEMINI_API_KEY: genai.configure(api_key=GEMINI_API_KEY)

# --- Helpers ---
def calculate_cost(model_id, input_text, output_text):
    est_in = len(input_text)/2.5; est_out = len(output_text)/2.5
    price = MODEL_PRICING.get(model_id, [1.0, 3.0])
    return ((est_in/1e6 * price[0]) + (est_out/1e6 * price[1])) * THB_RATE

def get_sheet_client():
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
    return gspread.authorize(creds).open(SHEET_NAME).sheet1

def save_to_sheet(username, q, m1, a1, c1, m2, a2, c2):
    try:
        sheet = get_sheet_client()
        sheet.append_row([datetime.now().strftime("%Y-%m-%d %H:%M:%S"), username, q, m1, a1, f"{c1:.4f}", m2, a2, f"{c2:.4f}"])
        return True
    except Exception as e: print(e); return False

@st.cache_data(ttl=5)
def load_history(target_username):
    try:
        sheet = get_sheet_client()
        data = sheet.get_all_values()
        if not data: return pd.DataFrame()
        
        headers = data[0]; rows = data[1:]
        df = pd.DataFrame(rows, columns=headers)
        
        df = df.loc[:, ~df.columns.str.match(r'^\s*$')]
        df.columns = df.columns.astype(str).str.strip()
        
        user_col = next((c for c in df.columns if c.lower() == 'username'), None)
        if user_col and target_username:
            target = str(target_username).strip().lower()
            df[user_col] = df[user_col].astype(str).str.strip()
            return df[df[user_col].str.lower() == target]
        return pd.DataFrame()
    except Exception as e: return pd.DataFrame()

# --- AI Logic ---
def get_context(prompt):
    try:
        res = get_aws_agent().retrieve(knowledgeBaseId=KB_ID, retrievalQuery={'text': prompt}, retrievalConfiguration={'vectorSearchConfiguration': {'numberOfResults': 5}})
        ctx = ""; cites = []
        if 'retrievalResults' in res:
            for r in res['retrievalResults']:
                ctx += f"- {r['content']['text']}\n"
                cites.append({'content': r['content']['text'], 'uri': r['location']['s3Location']['uri']})
        return ctx, cites
    except: return None, []

MODELS = {
    "Claude 3.5 Sonnet (AWS)": {"type": "bedrock", "id": "anthropic.claude-3-5-sonnet-20240620-v1:0", "color": "badge-aws"},
    "DeepSeek V3": {"type": "deepseek", "id": "deepseek-chat", "color": "badge-deepseek"},
    "Gemini 2.0 Flash": {"type": "gemini", "id": "gemini-2.0-flash", "color": "badge-gemini"},
}

def ask_ai(prompt, model_key):
    cfg = MODELS[model_key]; t = cfg["type"]; mid = cfg["id"]
    ctx, cites = get_context(prompt)
    if not ctx: return "ไม่พบข้อมูลในฐานข้อมูล", [], 0
    
    ans = ""; cost = 0; full_in = ""
    try:
        if t == "bedrock":
            payload = {"anthropic_version": "bedrock-2023-05-31", "max_tokens": 2048, "system": SYSTEM_PROMPT, "messages": [{"role": "user", "content": f"Ref:\n{ctx}\nQ: {prompt}"}]}
            res = get_aws_runtime().invoke_model(modelId=mid, body=json.dumps(payload))
            ans = json.loads(res.get('body').read())['content'][0]['text']
            full_in = f"{SYSTEM_PROMPT} {ctx} {prompt}"
        elif t == "deepseek":
            res = get_deepseek_client().chat.completions.create(model=mid, messages=[{"role": "system", "content": f"{SYSTEM_PROMPT}\nRef:{ctx}"}, {"role": "user", "content": prompt}])
            ans = res.choices[0].message.content
            full_in = f"{SYSTEM_PROMPT} {ctx} {prompt}"
        elif t == "gemini":
            full_in = f"{SYSTEM_PROMPT}\nRef:{ctx}\nQ: {prompt}"
            ans = genai.GenerativeModel(mid).generate_content(full_in).text
            
        cost = calculate_cost(mid, full_in, ans)
        return ans, cites, cost
    except Exception as e: return f"Error: {e}", [], 0

# =========================================================
# 🎨 3. THEME & UI MANAGER
# =========================================================

# --- Sidebar Configuration ---
with st.sidebar:
    # 🟢 แก้ไขตรงนี้: ใช้ไอคอน ⚖️ แทนรูปภาพที่เสีย
    st.markdown("""
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 100px; line-height: 100px; text-shadow: 0 0 10px rgba(255,215,0,0.5);">⚖️</div>
        </div>
    """, unsafe_allow_html=True)
    
    st.markdown("### 🎨 ปรับแต่งธีม")
    # Default to Dark (index=1)
    theme_choice = st.radio("เลือกรูปแบบการแสดงผล", ["☀️ Official Light (สว่าง)", "🌙 Modern Dark (มืด)"], index=1)
    
    st.markdown("---")
    st.markdown("### 👤 ผู้ใช้งาน")
    username = st.text_input("ชื่อ/หน่วยงาน", value="Guest")
    
    st.markdown("---")
    st.markdown("### ⚙️ เลือกโมเดล")
    m_left = st.selectbox("🤖 ซ้าย", list(MODELS.keys()), index=0) 
    m_right = st.selectbox("🦁 ขวา", list(MODELS.keys()), index=2) 
    
    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("🗑️ ล้างหน้าจอ"):
        st.session_state.history = []
        st.rerun()

# --- CSS Injection based on Theme ---
if "Light" in theme_choice:
    # ☀️ THEME: LIGHT
    bg_color = "#F0F2F6"
    card_bg = "#FFFFFF"
    text_color = "#212529"
    header_bg = "linear-gradient(90deg, #002D62 0%, #004085 100%)"
    header_text = "#FFD700"
    user_bubble_bg = "#E8F0FE"
    user_bubble_border = "#1A73E8"
    user_text = "#0D47A1"
    sidebar_bg = "#FFFFFF"
    sidebar_text = "#002D62"
    table_bg = "#FFFFFF"
    table_text = "#333333"
else:
    # 🌙 THEME: DARK (Default)
    bg_color = "#0E1117"
    card_bg = "#1E1E1E"
    text_color = "#E0E0E0"
    header_bg = "linear-gradient(90deg, #1A1A1A 0%, #333333 100%)"
    header_text = "#FFD700"
    user_bubble_bg = "#2C2C2C"
    user_bubble_border = "#FFD700"
    user_text = "#FFFFFF"
    sidebar_bg = "#161B22"
    sidebar_text = "#E0E0E0"
    table_bg = "#1E1E1E"
    table_text = "#E0E0E0"

st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap');
    
    html, body, [class*="css"] {{ font-family: 'Sarabun', sans-serif; }}
    .stApp {{ background-color: {bg_color}; color: {text_color}; }}
    
    .header-container {{
        background: {header_bg}; padding: 30px; border-radius: 12px;
        text-align: center; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.2); margin-bottom: 25px;
    }}
    .header-title {{ color: {header_text}; font-size: 30px; font-weight: bold; margin: 0; }}
    
    .ai-card {{
        background-color: {card_bg}; border-radius: 10px; padding: 20px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1); border: 1px solid rgba(128,128,128,0.2);
        color: {text_color}; height: 100%;
    }}
    .ai-card div, .ai-card p {{ color: {text_color} !important; line-height: 1.6; }}
    
    .user-bubble {{
        background-color: {user_bubble_bg}; border-left: 5px solid {user_bubble_border};
        padding: 15px; border-radius: 8px; margin-bottom: 20px;
        color: {user_text}; font-weight: 500;
    }}
    
    [data-testid="stSidebar"] {{ background-color: {sidebar_bg}; border-right: 1px solid rgba(128,128,128,0.2); }}
    [data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3, [data-testid="stSidebar"] label, [data-testid="stSidebar"] p {{
        color: {sidebar_text} !important;
    }}
    
    [data-testid="stDataFrame"] {{ background-color: {table_bg} !important; }}
    [data-testid="stDataFrame"] * {{ color: {table_text} !important; }}
    .streamlit-expanderHeader {{ color: {text_color} !important; }}
    
    .stChatInput textarea {{ background-color: {card_bg} !important; color: {text_color} !important; }}
    
    .badge {{ display: inline-block; padding: 4px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; color: white !important; margin-bottom: 10px; }}
    .badge-aws {{ background-color: #FFD700; color: black !important; }}
    .badge-deepseek {{ background-color: #6A1B9A; }}
    .badge-gemini {{ background-color: #0277BD; }}
    
</style>
""", unsafe_allow_html=True)

# =========================================================
# 🖥️ MAIN UI
# =========================================================

st.markdown("""
<div class="header-container">
    <div class="header-title">⚖️ ระบบสนับสนุนการค้นหาข้อมูลศาลปกครอง</div>
    <div style="margin-top: 5px; opacity: 0.9; color: white;">AI-Powered Knowledge Retrieval & Comparison System</div>
</div>
""", unsafe_allow_html=True)

# Tabs
tab1, tab2 = st.tabs(["💬 สนทนา (Chat)", "📜 ประวัติการใช้งาน (History)"])

# --- TAB 1: Chat ---
with tab1:
    if "history" not in st.session_state: st.session_state.history = []

    for chat in st.session_state.history:
        st.markdown(f'<div class="user-bubble">🗣️ {chat["question"]}</div>', unsafe_allow_html=True)
        
        c1, c2 = st.columns(2)
        def render_card(col, m, a, cost, cites):
            with col:
                badge = MODELS[m]['color']
                st.markdown(f"""
                <div class="ai-card">
                    <span class="badge {badge}">{m}</span>
                    <div>{a}</div>
                </div>
                """, unsafe_allow_html=True)
                with st.expander(f"💰 {cost:.4f} THB | 📚 อ้างอิง"):
                    st.caption(f"Cost: {cost:.4f} THB")
                    for r in cites: st.caption(f"📄 {r.get('uri','').split('/')[-1]}")

        render_card(c1, chat['m1'], chat['a1'], chat['cost1'], chat['c1'])
        render_card(c2, chat['m2'], chat['a2'], chat['cost2'], chat['c2'])
        st.markdown("<br>", unsafe_allow_html=True)

    prompt = st.chat_input("พิมพ์คำถามเพื่อสืบค้นข้อมูล...")
    if prompt:
        with st.spinner(f"⏳ กำลังประมวลผล..."):
            a1, ci1, co1 = ask_ai(prompt, m_left)
            a2, ci2, co2 = ask_ai(prompt, m_right)
            save_to_sheet(username, prompt, m_left, a1, co1, m_right, a2, co2)
            
        st.session_state.history.append({
            "question": prompt,
            "m1": m_left, "a1": a1, "c1": ci1, "cost1": co1,
            "m2": m_right, "a2": a2, "c2": ci2, "cost2": co2
        })
        st.rerun()

# --- TAB 2: History ---
with tab2:
    st.subheader(f"📜 ประวัติของคุณ: {username}")
    if st.button("🔄 รีเฟรชข้อมูล"): st.cache_data.clear(); st.rerun()
    
    with st.spinner("Loading..."):
        df_hist = load_history(username)
    
    if not df_hist.empty:
        cols = ['Timestamp','Question','Model_Left','Answer_Left','Model_Right','Answer_Right']
        valid_cols = [c for c in cols if c in df_hist.columns]
        st.dataframe(df_hist[valid_cols], use_container_width=True, hide_index=True)
    else:
        st.info(f"ไม่พบข้อมูลของ '{username}'")
