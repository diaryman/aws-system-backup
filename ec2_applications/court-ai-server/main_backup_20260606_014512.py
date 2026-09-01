import time
import re
import streamlit as st
import concurrent.futures
import pandas as pd
import difflib
from io import BytesIO
try:
    from docx import Document
    from docx.shared import Inches
except ImportError:
    Document = None

import plotly.express as px
import plotly.graph_objects as go
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from src.config import MODELS, KNOWLEDGE_BASES
from src.utils import check_secrets
from src.ui import load_custom_css, render_header, render_user_message, render_result_card, render_welcome_screen, render_copy_button
from src.services import retrieve_context, call_single_model, save_to_sheet, load_history_from_sheet, save_feedback, generate_dashboard_insight

from streamlit.runtime.scriptrunner import add_script_run_ctx, get_script_run_ctx

# 1. Setup Page
st.set_page_config(page_title="Smart Court AI", page_icon="⚖️", layout="wide")

# 2. Check Secrets
check_secrets()

# 3. Initialize Session State & Persistence
if "messages" not in st.session_state:
    st.session_state.messages = []
if "username_confirmed" not in st.session_state:
    st.session_state.username_confirmed = False
if "username" not in st.session_state:
    st.session_state.username = ""
if "last_activity" not in st.session_state:
    st.session_state.last_activity = time.time()
if "fb_versions" not in st.session_state:
    st.session_state.fb_versions = {}

# 3.1 Check URL Params
if not st.session_state.username_confirmed:
    params = st.query_params
    if "username" in params and params["username"]:
        st.session_state.username = params["username"]
        st.session_state.username_confirmed = True
        st.session_state.last_activity = time.time()

# 3.2 Timeout Logic
current_time = time.time()
if st.session_state.username_confirmed:
    if (current_time - st.session_state.last_activity) > 600: # 10 minutes
        st.session_state.clear()
        st.query_params.clear()
        st.warning("⏳ Access Session หมดอายุ (เกิน 10 นาที) กรุณาลงชื่อเข้าใช้ใหม่")
        st.stop()
    else:
        st.session_state.last_activity = current_time

# 4. Load CSS
if not st.session_state.username_confirmed:
    load_custom_css("☀️ Official Light")

# ==========================================
# 📊 HELPER FUNCTIONS
# ==========================================

def render_diff_view(text1, text2):
    """Renders a simple side-by-side or unified diff view for text comparison."""
    if not text1 or not text2: return
    
    diff = difflib.ndiff(text1.splitlines(), text2.splitlines())
    diff_html = []
    
    # Simple highlighting logic
    for line in diff:
        if line.startswith('- '):
            diff_html.append(f"<div style='background-color: #ffe6e6; color: #b30000; padding: 2px 4px; display: block;'>- {line[2:]}</div>")
        elif line.startswith('+ '):
            diff_html.append(f"<div style='background-color: #e6ffe6; color: #006600; padding: 2px 4px; display: block;'>+ {line[2:]}</div>")
        elif line.startswith('? '):
            continue
        else:
            diff_html.append(f"<div style='color: #444; padding: 2px 4px;'>{line}</div>")
            
    st.markdown(
        f"<div style='font-family: monospace; font-size: 0.85rem; border:1px solid #ddd; padding:10px; border-radius:5px; background: #fafafa; max-height: 300px; overflow-y: auto;'>{''.join(diff_html)}</div>", 
        unsafe_allow_html=True
    )

@st.fragment
def render_combined_feedback_form(key_prefix, username, prompt, res_l, res_r, is_latest=False):
    # Use session state to keep track of if the form should be expanded to avoid flickering
    expander_key = f"expander_state_{key_prefix}"
    submitted_key = f"fb_submitted_{key_prefix}"
    
    if expander_key not in st.session_state:
        st.session_state[expander_key] = is_latest
    if submitted_key not in st.session_state:
        st.session_state[submitted_key] = False

    if st.session_state[submitted_key]:
        st.success("✅ บันทึกการประเมินความพึงพอใจเรียบร้อยแล้ว ขอบคุณครับ/ค่ะ")
        return

    with st.expander("✨ ให้คะแนนและข้อเสนอแนะ (Feedback)", expanded=st.session_state[expander_key]):
        st.markdown("### 📊 แบบประเมินเปรียบเทียบคำตอบ")
        st.caption("กรุณาให้คะแนนความพึงพอใจสำหรับคำตอบทั้ง 2 ฝั่ง (1-5 ดาว)")
        
        mc1, mc2 = st.columns(2, gap="large")
        
        # Function to show toast without full rerun if possible
        def on_rating_change():
            st.toast("⭐ บันทึกระดับคะแนนเบื้องต้นแล้ว", icon="✨")

        with mc1:
            st.info(f"👈 **ประเมินฝั่งซ้าย ({res_l['model']})**")
            lc1, lc2 = st.columns(2)
            with lc1:
                st.write("1. ความถูกต้องทางกฎหมาย/วิชาการ");  st.feedback("stars", key=f"{key_prefix}_l_acc", on_change=on_rating_change)
                st.write("3. การอ้างอิงและเหตุผลทางกฎหมาย"); st.feedback("stars", key=f"{key_prefix}_l_det", on_change=on_rating_change)
                st.write("5. ความพึงพอใจและประโยชน์ใช้งาน"); st.feedback("stars", key=f"{key_prefix}_l_sat", on_change=on_rating_change)
            with lc2:
                st.write("2. ความครบถ้วนของเนื้อหา"); st.feedback("stars", key=f"{key_prefix}_l_comp", on_change=on_rating_change)
                st.write("4. ความตรงประเด็นและรูปแบบ");   st.feedback("stars", key=f"{key_prefix}_l_use", on_change=on_rating_change)

        with mc2:
            st.success(f"👉 **ประเมินฝั่งขวา ({res_r['model']})**")
            rc1, rc2 = st.columns(2)
            with rc1:
                st.write("1. ความถูกต้องทางกฎหมาย/วิชาการ");  st.feedback("stars", key=f"{key_prefix}_r_acc", on_change=on_rating_change)
                st.write("3. การอ้างอิงและเหตุผลทางกฎหมาย"); st.feedback("stars", key=f"{key_prefix}_r_det", on_change=on_rating_change)
                st.write("5. ความพึงพอใจและประโยชน์ใช้งาน"); st.feedback("stars", key=f"{key_prefix}_r_sat", on_change=on_rating_change)
            with rc2:
                st.write("2. ความครบถ้วนของเนื้อหา"); st.feedback("stars", key=f"{key_prefix}_r_comp", on_change=on_rating_change)
                st.write("4. ความตรงประเด็นและรูปแบบ");   st.feedback("stars", key=f"{key_prefix}_r_use", on_change=on_rating_change)
        
        st.divider()
        st.markdown("#### 💡 คำแนะนำเพิ่มเติม / คำตอบที่ถูกต้อง (Suggestions)")
        suggestion = st.text_area("Suggestion", placeholder="ระบุสิ่งที่ควรแก้ไข...", height=100, label_visibility="collapsed", key=f"{key_prefix}_text")
        
        _, sub_col, _ = st.columns([1, 2, 1])
        with sub_col:
            if st.button("💾 บันทึกการประเมิน (Submit)", key=f"btn_sub_{key_prefix}", use_container_width=True):
                def get_score(val): return (val + 1) if val is not None else 0
                fb_l = {"accuracy": get_score(st.session_state.get(f"{key_prefix}_l_acc")), "completeness": get_score(st.session_state.get(f"{key_prefix}_l_comp")), "details": get_score(st.session_state.get(f"{key_prefix}_l_det")), "usefulness": get_score(st.session_state.get(f"{key_prefix}_l_use")), "satisfaction": get_score(st.session_state.get(f"{key_prefix}_l_sat")), "suggestion": suggestion}
                fb_r = {"accuracy": get_score(st.session_state.get(f"{key_prefix}_r_acc")), "completeness": get_score(st.session_state.get(f"{key_prefix}_r_comp")), "details": get_score(st.session_state.get(f"{key_prefix}_r_det")), "usefulness": get_score(st.session_state.get(f"{key_prefix}_r_use")), "satisfaction": get_score(st.session_state.get(f"{key_prefix}_r_sat")), "suggestion": suggestion}
                save_feedback(username, prompt, res_l['model'], fb_l, res_l['answer'])
                save_feedback(username, prompt, res_r['model'], fb_r, res_r['answer'])
                st.toast(f"✅ บันทึกสมบูรณ์!", icon="🙏")
                
                # Collapse after submit and trigger fragment refresh
                st.session_state[expander_key] = False
                st.session_state[submitted_key] = True
                st.rerun()

def generate_word_report(df, user):
    """Generates a DOCX report from the history dataframe."""
    if Document is None: return None
    
    doc = Document()
    doc.add_heading('รายงานการทดสอบ Smart Court AI', 0)
    doc.add_paragraph(f'ผู้ทดสอบ: {user}')
    doc.add_paragraph(f'วันที่ออกรายงาน: {time.strftime("%Y-%m-%d %H:%M")}')
    
    for index, row in df.iterrows():
        try:
            q = str(row.get('Question', ''))
            ans_l = str(row.get('Answer_Left', ''))
            ans_r = str(row.get('Answer_Right', ''))
            mod_l = str(row.get('Model_Left', ''))
            mod_r = str(row.get('Model_Right', ''))
            
            doc.add_heading(f'Q: {q}', level=2)
            
            table = doc.add_table(rows=1, cols=2)
            hdr_cells = table.rows[0].cells
            hdr_cells[0].text = f'Left Model: {mod_l}'
            hdr_cells[1].text = f'Right Model: {mod_r}'
            
            row_cells = table.add_row().cells
            row_cells[0].text = ans_l
            row_cells[1].text = ans_r
            
            doc.add_paragraph('--------------------------------------------------')
        except Exception:
            continue
            
    bio = BytesIO()
    doc.save(bio)
    bio.seek(0)
    return bio

def generate_admin_word_report(df, df_metrics):
    if Document is None: return None
    
    doc = Document()
    doc.add_heading('รายงานสรุปวิเคราะห์ระบบ Smart Court AI เชิงวิชาการ', 0)
    doc.add_paragraph(f'พิมพ์รายงานเมื่อ: {time.strftime("%Y-%m-%d %H:%M")}')
    doc.add_paragraph('รายงานนี้สรุปผลจากการวิเคราะห์ข้อมูลการเปรียบเทียบโมเดลในคลังข้อมูลตอบคำถามของศาลปกครอง เพื่อประเมินประสิทธิภาพในทุกมิติมาตรฐานวิชาการ')
    
    # 1. Executive Summary Section
    doc.add_heading('1. สถิติภาพรวมของระบบ (Executive Summary)', level=1)
    table_stats = doc.add_table(rows=4, cols=2)
    table_stats.style = 'Table Grid'
    
    total_cost = df.get('Cost_Model_Left', 0).sum() + df.get('Cost_Model_Right', 0).sum()
    stats_data = [
        ("จำนวนคำถามทั้งหมด", f"{len(df):,} คำถาม"),
        ("จำนวนผู้ใช้งานไม่ซ้ำคน", f"{df['Username'].nunique():,} คน"),
        ("ค่าใช้จ่ายประมาณการรวม (THB)", f"{total_cost:,.2f} บาท"),
        ("หน่วยงานที่ใช้งานสูงสุด", f"{df['Agency'].mode()[0] if not df['Agency'].empty else '-'}")
    ]
    
    for i, (label, val) in enumerate(stats_data):
        table_stats.rows[i].cells[0].text = label
        table_stats.rows[i].cells[1].text = val
        
    doc.add_paragraph() # spacing
    
    # 2. Academic Evaluation Section
    doc.add_heading('2. คะแนนประเมินเฉลี่ยรายมิติวิชาการ (Academic Evaluation Profiles)', level=1)
    if not df_metrics.empty:
        avg_metrics = df_metrics.groupby(['Model', 'Metric'])['Score'].mean().reset_index()
        avg_metrics = avg_metrics.sort_values(by=['Metric', 'Model'])
        
        table_metrics = doc.add_table(rows=1, cols=3)
        table_metrics.style = 'Table Grid'
        hdr_cells = table_metrics.rows[0].cells
        hdr_cells[0].text = 'มิติการประเมินวิชาการ'
        hdr_cells[1].text = 'โมเดลปัญญาประดิษฐ์'
        hdr_cells[2].text = 'คะแนนเฉลี่ย (1-5 ดาว)'
        
        for _, row_m in avg_metrics.iterrows():
            row_cells = table_metrics.add_row().cells
            row_cells[0].text = str(row_m['Metric'])
            row_cells[1].text = str(row_m['Model'])
            row_cells[2].text = f"{row_m['Score']:.2f}"
    else:
        doc.add_paragraph('ยังไม่มีข้อมูลการประเมินดาว')
        
    doc.add_paragraph() # spacing
    
    # 3. User Segment Section
    doc.add_heading('3. สัดส่วนการใช้งานตามกลุ่มผู้ใช้ (User Segments)', level=1)
    doc.add_heading('สัดส่วนผู้ใช้แยกตามตำแหน่งงาน:', level=2)
    pos_counts = df['Position'].value_counts()
    table_pos = doc.add_table(rows=1, cols=2)
    table_pos.style = 'Table Grid'
    table_pos.rows[0].cells[0].text = 'ตำแหน่งงาน'
    table_pos.rows[0].cells[1].text = 'จำนวนครั้งการใช้งาน'
    for pos, count in pos_counts.items():
        row_cells = table_pos.add_row().cells
        row_cells[0].text = str(pos)
        row_cells[1].text = f"{count:,}"
        
    doc.add_paragraph() # spacing
    
    # 4. Detailed Logs
    doc.add_heading('4. รายการบันทึกข้อมูลการเปรียบเทียบ (Comparison Logs Catalog)', level=1)
    for idx, row in df.iterrows():
        doc.add_heading(f'บันทึกรายการที่ {idx + 1} | ผู้ใช้: {row.get("Username", "-")} | วันที่: {row.get("Timestamp", "-")}', level=2)
        doc.add_paragraph(f'คำถาม (Question): {row.get("Question", "")}')
        
        table_comp = doc.add_table(rows=1, cols=2)
        table_comp.style = 'Table Grid'
        hdr_comp = table_comp.rows[0].cells
        hdr_comp[0].text = f"ฝั่งซ้าย: {row.get('Model_Left', '')}"
        hdr_comp[1].text = f"ฝั่งขวา: {row.get('Model_Right', '')}"
        
        row_comp = table_comp.add_row().cells
        row_comp[0].text = str(row.get('Answer_Left', ''))
        row_comp[1].text = str(row.get('Answer_Right', ''))
        
        doc.add_paragraph(f"ความพึงพอใจฝั่งซ้าย: {row.get('Feedback_Left', '-')}")
        doc.add_paragraph(f"ความพึงพอใจฝั่งขวา: {row.get('Feedback_Right', '-')}")
        doc.add_paragraph("--------------------------------------------------")
        
    bio = BytesIO()
    doc.save(bio)
    bio.seek(0)
    return bio

def parse_feedback_scores(fb_str):
    if not fb_str or not isinstance(fb_str, str): return None, ""
    
    suggestion = ""
    if " Suggestion: " in fb_str:
        parts = fb_str.split(" Suggestion: ", 1)
        fb_str_scores = parts[0]
        suggestion = parts[1]
    else:
        fb_str_scores = fb_str
        
    scores = {}
    pattern = r"([A-Za-z]+):(\d+)"
    matches = re.findall(pattern, fb_str_scores)
    
    mapping = {
        "Acc": "1. Legal/Academic Accuracy (ความถูกต้องทางกฎหมาย/วิชาการ)",
        "Comp": "2. Completeness of Content (ความครบถ้วนของเนื้อหา)",
        "Det": "3. Citations & Legal Reasoning (การอ้างอิงและเหตุผลทางกฎหมาย)",
        "Use": "4. Relevance & Presentation (ความตรงประเด็นและรูปแบบ)",
        "Sat": "5. Overall Satisfaction (ความพึงพอใจและประโยชน์ใช้งาน)"
    }
    for k, v in matches:
        if k in mapping: scores[mapping[k]] = int(v)
            
    return scores, suggestion

def render_dashboard(current_username):
    # Admin Password Protection
    if "admin_logged_in" not in st.session_state:
        st.session_state.admin_logged_in = False

    if not st.session_state.admin_logged_in:
        st.subheader("🔐 แผงควบคุมผู้ดูแลระบบ (Admin Access)")
        col1, col2 = st.columns([2, 1])
        admin_pass = col1.text_input("กรุณาระบุรหัสผ่านแอดมิน", type="password", key="admin_pass_input")
        if col2.button("เข้าสู่ระบบ", use_container_width=True):
            if admin_pass == "Admin1234": # รหัสผ่านเริ่มต้น
                st.session_state.admin_logged_in = True
                st.rerun()
            else:
                st.error("❌ รหัสผ่านไม่ถูกต้อง")
        st.stop()

    st.title("🛡️ ผู้บริหาร & วิเคราะห์ระบบ (Admin & Analytics)")
    if st.button("🚪 ออกจากหน้าแอดมิน"):
        st.session_state.admin_logged_in = False
        st.rerun()
    
    st.divider()
    all_df = load_history_from_sheet(None)
    if all_df.empty:
        st.info("ยังไม่มีข้อมูลการใช้งานในระบบ")
        return

    # --- DATE RANGE FILTER ---
    st.markdown("### 🗓️ กรองข้อมูลตามช่วงเวลา (Date Range Filter)")
    try:
        # Convert Timestamp to datetime objects for filtering
        all_df['dt_timestamp'] = pd.to_datetime(all_df['Timestamp'])
        min_date = all_df['dt_timestamp'].min().date()
        max_date = all_df['dt_timestamp'].max().date()
        
        fc1, fc2, fc3 = st.columns([2, 2, 1])
        with fc1:
            start_date = st.date_input("จากวันที่", min_date, min_value=min_date, max_value=max_date)
        with fc2:
            end_date = st.date_input("ถึงวันที่", max_date, min_value=min_date, max_value=max_date)
        with fc3:
            st.write("") # Spacer
            if st.button("🔄 Reset", use_container_width=True):
                st.rerun()

        # Apply filtering
        all_df = all_df[
            (all_df['dt_timestamp'].dt.date >= start_date) & 
            (all_df['dt_timestamp'].dt.date <= end_date)
        ].copy()
        
        if all_df.empty:
            st.warning("❌ ไม่พบข้อมูลในช่วงวันที่เลือก")
            return
        st.caption(f"📅 แสดงข้อมูลจาก **{start_date}** ถึง **{end_date}** (พบ {len(all_df)} รายการ)")
    except Exception as e:
        st.error(f"⚠️ เกิดข้อผิดพลาดในการกรองวันที่: {e}")

    # Data Enrichment & Preprocessing
    # Ensure critical columns exist for analytics to avoid KeyErrors with old data
    required_cols = {
        'Time_Left': 0.0, 
        'Time_Right': 0.0, 
        'Cost_Model_Left': 0.0, 
        'Cost_Model_Right': 0.0,
        'Feedback_Left': "",
        'Feedback_Right': ""
    }
    for col, default in required_cols.items():
        if col not in all_df.columns:
            all_df[col] = default

    # Ensure numerical columns are numeric
    for col in all_df.columns:
        if 'Cost' in col or 'Time' in col:
            all_df[col] = pd.to_numeric(all_df[col], errors='coerce').fillna(0)

    # Word Count Analysis
    all_df['WordCount_Left'] = all_df['Answer_Left'].apply(lambda x: len(str(x).split()))
    all_df['WordCount_Right'] = all_df['Answer_Right'].apply(lambda x: len(str(x).split()))

    def get_sat(fb_str):
        scores, _ = parse_feedback_scores(fb_str)
        if not scores: return 0
        return scores.get("5. Overall Satisfaction (ความพึงพอใจและประโยชน์ใช้งาน)", scores.get("Satisfaction", 0))

    all_df['Sat_Left'] = all_df['Feedback_Left'].apply(get_sat)
    all_df['Sat_Right'] = all_df['Feedback_Right'].apply(get_sat)

    # Winner Logic
    def get_winner(row):
        if row['Sat_Left'] > row['Sat_Right']: return row['Model_Left']
        if row['Sat_Right'] > row['Sat_Left']: return row['Model_Right']
        return "Draw"
    
    # Filter only rows with at least one satisfaction score > 0
    scored_df = all_df[(all_df['Sat_Left'] > 0) | (all_df['Sat_Right'] > 0)].copy()
    if not scored_df.empty:
        scored_df['Winner'] = scored_df.apply(get_winner, axis=1)

    # Agency & Position Extraction
    # Assuming Username format: "Position (Level) - Department"
    def extract_info(u):
        u = str(u)
        pos = u.split('(')[0].strip() if '(' in u else (u.split('-')[0].strip() if '-' in u else u)
        dept = u.split('-')[-1].strip() if '-' in u else "ไม่ระบุ"
        return pos, dept

    all_df['Position'], all_df['Agency'] = zip(*all_df['Username'].apply(extract_info))

    # Metric Extraction for All Dimensions
    def get_all_metrics(fb_str):
        scores, _ = parse_feedback_scores(fb_str)
        return scores if scores else {}

    # Create a long-form dataframe for metric analysis
    metric_rows = []
    for _, row in all_df.iterrows():
        # Left Side
        m_l = row['Model_Left']
        metrics_l = get_all_metrics(row['Feedback_Left'])
        for k, v in metrics_l.items():
            metric_rows.append({"Model": m_l, "Metric": k, "Score": v, "Position": row['Position'], "Agency": row['Agency']})
        
        # Right Side
        m_r = row['Model_Right']
        metrics_r = get_all_metrics(row['Feedback_Right'])
        for k, v in metrics_r.items():
            metric_rows.append({"Model": m_r, "Metric": k, "Score": v, "Position": row['Position'], "Agency": row['Agency']})
    
    df_metrics = pd.DataFrame(metric_rows)

    # 1. KPI Overview
    st.markdown("### 📈 ภาพรวมสมรรถนะ (System Performance)")
    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    total_q = len(all_df)
    total_cost = all_df['Cost_Model_Left'].sum() + all_df['Cost_Model_Right'].sum()
    unique_users = all_df['Username'].nunique()
    
    kpi1.metric("จำนวนคำถามทั้งหมด", f"{total_q:,}")
    kpi2.metric("จำนวนผู้ใช้งาน", f"{unique_users:,}")
    kpi3.metric("ค่าใช้จ่ายรวม (THB)", f"{total_cost:,.2f}")
    kpi4.metric("หน่วยงานที่ใช้งานสูงสุด", all_df['Agency'].mode()[0] if not all_df['Agency'].empty else "-")

    tab_visuals, tab_battle, tab_users, tab_ai_insight, tab_raw = st.tabs([
        "📊 การวิเคราะห์รายมิติ (Visual Analytics)", 
        "⚔️ การดวลโมเดล (Battle Mode)",
        "👥 วิเคราะห์กลุ่มผู้ใช้ (User Segments)", 
        "🧠 สรุปผลอัจฉริยะ (AI Strategic Insights)",
        "📋 ข้อมูลทั้งหมด (Logs)"
    ])

    # --- TAB 1: Visual Analytics ---
    with tab_visuals:
        st.markdown("##### ⭐ คะแนนเฉลี่ยและโปรไฟล์มิติวิชาการ (Avg Star Rating & Academic Profile)")
        if not df_metrics.empty:
            avg_metrics = df_metrics.groupby(['Model', 'Metric'])['Score'].mean().reset_index()
            avg_metrics = avg_metrics.sort_values(by='Metric')
            
            vc1, vc2 = st.columns(2)
            with vc1:
                fig_metrics = px.bar(avg_metrics, x='Metric', y='Score', color='Model', barmode='group',
                                    title="Performance across 5 Academic Dimensions",
                                    labels={'Score': 'Average Stars (1-5)', 'Metric': 'Dimension'},
                                    color_discrete_sequence=px.colors.qualitative.Set2)
                fig_metrics.update_layout(xaxis={'tickangle': 15})
                st.plotly_chart(fig_metrics, use_container_width=True)
                
            with vc2:
                fig_radar = px.line_polar(avg_metrics, r='Score', theta='Metric', color='Model', line_close=True,
                                         title="Academic Multi-Dimensional Profile (Radar Chart)",
                                         color_discrete_sequence=px.colors.qualitative.Set2)
                fig_radar.update_traces(fill='toself', opacity=0.3)
                fig_radar.update_layout(
                    polar=dict(
                        radialaxis=dict(visible=True, range=[0, 5])
                    )
                )
                st.plotly_chart(fig_radar, use_container_width=True)
        else:
            st.warning("ยังไม่มีข้อมูลการประเมินดาว")

        c1, c2 = st.columns(2)
        with c1:
            st.markdown("##### ⏱️ ความเร็วในการตอบสนอง (Response Time)")
            times = pd.concat([all_df['Time_Left'], all_df['Time_Right']])
            fig_time = px.histogram(times, nbins=20, labels={'value': 'Seconds'}, 
                                   color_discrete_sequence=['#8E44AD'], title="Response Time Histogram")
            st.plotly_chart(fig_time, use_container_width=True)

        with c2:
            st.markdown("##### 💎 ความคุ้มค่า (Satisfaction vs Cost)")
            eff_l = all_df[['Model_Left', 'Cost_Model_Left', 'Sat_Left']].rename(columns={'Model_Left': 'Model', 'Cost_Model_Left': 'Cost', 'Sat_Left': 'Satisfaction'})
            eff_r = all_df[['Model_Right', 'Cost_Model_Right', 'Sat_Right']].rename(columns={'Model_Right': 'Model', 'Cost_Model_Right': 'Cost', 'Sat_Right': 'Satisfaction'})
            eff_df = pd.concat([eff_l, eff_r])
            eff_df = eff_df[eff_df['Satisfaction'] > 0]
            fig_eff = px.scatter(eff_df, x="Cost", y="Satisfaction", color="Model", 
                                 title="Target: Top-Left (High Quality, Low Cost)")
            st.plotly_chart(fig_eff, use_container_width=True)

    # --- TAB 3: User Segments & Inspector ---
    with tab_users:
        st.markdown("##### 🏢 วิเคราะห์กลุ่มผู้ใช้งาน (Usage by Segment)")
        u1, u2 = st.columns(2)
        
        with u1:
            st.markdown("<h6>สัดส่วนแยกตามตำแหน่ง (By Position)</h6>", unsafe_allow_html=True)
            pos_counts = all_df['Position'].value_counts().reset_index()
            fig_pos = px.pie(pos_counts, names='Position', values='count', hole=0.3,
                            color_discrete_sequence=px.colors.sequential.RdBu)
            st.plotly_chart(fig_pos, use_container_width=True)

        with u2:
            st.markdown("<h6>สัดส่วนแยกตามหน่วยงาน (By Agency)</h6>", unsafe_allow_html=True)
            agency_counts = all_df['Agency'].value_counts().reset_index()
            fig_agency = px.bar(agency_counts, x='count', y='Agency', orientation='h',
                               color='count', color_continuous_scale='Blues')
            st.plotly_chart(fig_agency, use_container_width=True)

        st.divider()
        st.markdown("##### 🔍 คะแนนวิเคราะห์รายมิติแยกตามบทบาทผู้ใช้ (Avg Rating by User Segments)")
        if not df_metrics.empty:
            avg_by_pos = df_metrics.groupby(['Position', 'Metric'])['Score'].mean().reset_index()
            fig_seg_pos = px.bar(avg_by_pos, x='Metric', y='Score', color='Position', barmode='group',
                                title="Academic Ratings by User Position",
                                labels={'Score': 'Average Rating', 'Metric': 'Dimension'},
                                color_discrete_sequence=px.colors.qualitative.Pastel)
            fig_seg_pos.update_layout(xaxis={'tickangle': 15})
            st.plotly_chart(fig_seg_pos, use_container_width=True)
            
        st.divider()
        st.markdown("##### 🔍 ติดตามพฤติกรรมรายบุคคล (User Inspector)")
        selected_user_ui = st.selectbox("เลือกผู้ใช้งานเพื่อดูประวัติ", sorted(all_df['Username'].unique()), key="inspector_user_select")
        
        user_data = all_df[all_df['Username'] == selected_user_ui]
        
        uc1, uc2, uc3 = st.columns(3)
        u_total = len(user_data)
        u_cost = user_data['Cost_Model_Left'].sum() + user_data['Cost_Model_Right'].sum()
        
        sat_scores = []
        for fb in pd.concat([user_data['Feedback_Left'], user_data['Feedback_Right']]):
            scs, _ = parse_feedback_scores(fb)
            if scs and 'Satisfaction' in scs: sat_scores.append(scs['Satisfaction'])
        u_sat = sum(sat_scores)/len(sat_scores) if sat_scores else 0
        
        uc1.metric("จำนวนคำถาม", f"{u_total}")
        uc2.metric("ความพึงพอใจเฉลี่ย", f"{u_sat:.1f}/5")
        uc3.metric("ค่าใช้จ่ายรวม", f"{u_cost:.2f} THB")
        
        st.markdown("---")
        st.markdown(f"###### 💬 ประวัติการสนทนาของ: {selected_user_ui}")
        for _, row in user_data.iloc[::-1].iterrows():
            with st.chat_message("user", avatar="🧑‍💼"):
                st.write(row['Question'])
                st.caption(f"📅 {row['Timestamp']}")
            
            with st.chat_message("assistant", avatar="⚖️"):
                ac1, ac2 = st.columns(2)
                with ac1:
                    st.info(f"👈 {row['Model_Left']}")
                    st.write(row['Answer_Left'])
                    st.caption(f"Time: {row['Time_Left']}s | Cost: {row['Cost_Model_Left']} THB")
                with ac2:
                    st.success(f"👉 {row['Model_Right']}")
                    st.write(row['Answer_Right'])
                    st.caption(f"Time: {row['Time_Right']}s | Cost: {row['Cost_Model_Right']} THB")

    # --- TAB 2: Battle Mode ---
    with tab_battle:
        st.markdown("##### ⚔️ Model Battle: Who provides better answers?")
        if not scored_df.empty:
            win_counts = scored_df['Winner'].value_counts().reset_index()
            win_counts.columns = ['Model', 'Wins']
            
            wc1, wc2 = st.columns([1, 2])
            with wc1:
                st.write("📊 สรุปอัตราการชนะ (Win Rate)")
                st.dataframe(win_counts, use_container_width=True)
            
            with wc2:
                fig_win = px.pie(win_counts, names='Model', values='Wins', hole=0.4,
                                color_discrete_sequence=px.colors.qualitative.Pastel,
                                title="Head-to-Head Win Distribution")
                st.plotly_chart(fig_win, use_container_width=True)
            
            st.markdown("---")
            st.markdown("###### 🏆 รายการดวลล่าสุด (Detailed Battle History)")
            battle_history = scored_df[['Timestamp', 'Question', 'Model_Left', 'Sat_Left', 'Model_Right', 'Sat_Right', 'Winner']].iloc[::-1].head(10)
            st.table(battle_history)
        else:
            st.warning("ยังไม่มีข้อมูลการประเมินมากพอที่จะแสดงการดวลโมเดล")


    # --- TAB 3: AI Strategic Insights ---
    with tab_ai_insight:
        st.markdown("##### 🚀 AI Strategic Reports")
        st.info("ระบบจะใช้โมเดลวิเคราะห์พฤติกรรมการใช้งานจาก Logs ล่าสุด เพื่อสรุปแนวโน้มและปัญหา")
        
        if st.button("🪄 วิเคราะห์ภาพรวมด้วย AI (One-Click Analysis)", type="primary"):
            with st.spinner("AI กำลังวิเคราะห์ข้อมูลเชิงกลยุทธ์..."):
                insight_report = generate_dashboard_insight(all_df)
                st.markdown(insight_report)

    # --- TAB 4: Raw Logs & Export ---
    with tab_raw:
        st.subheader("📋 บันทึกข้อมูลระบบทั้งหมด (System Logs)")
        st.dataframe(all_df, use_container_width=True)
        
        st.markdown("### 📤 ตัวเลือกการส่งออกข้อมูลวิเคราะห์ (Export Analytics Catalog)")
        
        col_exp1, col_exp2 = st.columns(2)
        col_exp3, col_exp4 = st.columns(2)
        
        # 1. CSV Export
        csv = all_df.to_csv(index=False).encode('utf-8')
        col_exp1.download_button(
            label="📥 ส่งออกข้อมูลดิบทั้งหมด (CSV)",
            data=csv,
            file_name="smart_court_logs.csv",
            mime="text/csv",
            use_container_width=True
        )
        
        # 2. JSON Export
        json_df = all_df.copy()
        if 'dt_timestamp' in json_df.columns:
            json_df = json_df.drop(columns=['dt_timestamp'])
        json_data = json_df.to_json(orient='records', force_ascii=False, indent=2)
        col_exp2.download_button(
            label="⚙️ ส่งออกโครงสร้างข้อมูลดิบ (JSON)",
            data=json_data,
            file_name="smart_court_logs.json",
            mime="application/json",
            use_container_width=True
        )
        
        # 3. Excel Multi-Sheet Export
        excel_buffer = BytesIO()
        try:
            with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
                excel_df = all_df.copy()
                if 'dt_timestamp' in excel_df.columns:
                    excel_df = excel_df.drop(columns=['dt_timestamp'])
                excel_df.to_excel(writer, sheet_name='Logs', index=False)
                
                if not df_metrics.empty:
                    avg_metrics = df_metrics.groupby(['Model', 'Metric'])['Score'].mean().reset_index()
                    avg_metrics.to_excel(writer, sheet_name='Model Ratings', index=False)
                
                pos_counts = all_df['Position'].value_counts().reset_index()
                pos_counts.to_excel(writer, sheet_name='User Positions', index=False)
                
                agency_counts = all_df['Agency'].value_counts().reset_index()
                agency_counts.to_excel(writer, sheet_name='User Agencies', index=False)
            
            excel_bytes = excel_buffer.getvalue()
            col_exp3.download_button(
                label="📊 ส่งออกตารางวิเคราะห์มิติวิชาการ (Excel .xlsx)",
                data=excel_bytes,
                file_name="smart_court_academic_analytics.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                use_container_width=True
            )
        except Exception as e:
            col_exp3.error(f"Excel Export Error: {e}")
            
        # 4. Word Academic Summary Report (.docx)
        if Document:
            docx_buffer = generate_admin_word_report(all_df, df_metrics)
            if docx_buffer:
                col_exp4.download_button(
                    label="📄 ส่งออกรายงานเปรียบเทียบคำตอบสรุปผล (Word .docx)",
                    data=docx_buffer,
                    file_name="smart_court_academic_report.docx",
                    mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    use_container_width=True
                )
            else:
                col_exp4.error("ไม่สามารถสร้างไฟล์รายงาน Word ได้")
        else:
            col_exp4.info("📦 ไลบรารี python-docx ยังไม่ได้ติดตั้งบนเครื่อง")

        st.write("") # spacing
        with st.expander("📄 ดึงสรุปผลระดับบริหาร (PDF)"):
            if st.button("พิมพ์สรุปผลระดับบริหาร (Executive PDF)", use_container_width=True):
                buffer = BytesIO()
                p = canvas.Canvas(buffer, pagesize=letter)
                p.setFont("Helvetica-Bold", 16)
                p.drawString(100, 750, "Executive Summary: Smart Court AI")
                p.setFont("Helvetica", 12)
                p.drawString(100, 730, f"Generated on: {time.strftime('%Y-%m-%d %H:%M')}")
                p.drawString(100, 710, f"Total Questions: {total_q}")
                p.drawString(100, 690, f"Total Users: {unique_users}")
                p.drawString(100, 670, f"Total Budget Used: {total_cost:.2f} THB")
                p.drawString(100, 650, "--------------------------------------------")
                p.drawString(100, 630, "Report generated automatically by system admin panel.")
                p.showPage()
                p.save()
                buffer.seek(0)
                st.download_button("ดาวน์โหลดไฟล์ PDF", buffer, "Executive_Report.pdf", "application/pdf")

# ==========================================
# 🔐 LOGIN SCREEN
# ==========================================
if not st.session_state.username_confirmed:
    c1, c2, c3 = st.columns([1, 2, 1])
    with c2:
        st.markdown("<div style='text-align: center; font-size: 80px;'>⚖️</div>", unsafe_allow_html=True)
        st.markdown("<h1 style='text-align: center;'>Smart Court AI</h1>", unsafe_allow_html=True)
        st.markdown("<p style='text-align: center; margin-bottom: 30px;'>ระบบผู้ช่วยอัจฉริยะศาลปกครอง</p>", unsafe_allow_html=True)
        
        with st.container(border=True):
            st.markdown("##### 👤 ระบุข้อมูลผู้ใช้งาน (User Identification)")
            
            # 1. Position
            pos_options = ["ตุลาการศาลปกครอง", "พนักงานคดีปกครอง", "เจ้าหน้าที่ศาลปกครอง", "อื่นๆ"]
            selected_pos = st.selectbox("ตำแหน่ง", pos_options, key="login_pos")
            
            final_pos = selected_pos
            if selected_pos == "อื่นๆ":
                final_pos = st.text_input("ระบุตำแหน่งอื่นๆ", placeholder="โปรดระบุ...", key="login_pos_other")

            # 2. Level (Only for specific roles)
            selected_level = ""
            if selected_pos in ["พนักงานคดีปกครอง", "เจ้าหน้าที่ศาลปกครอง", "อื่นๆ"]:
                level_options = ["ปฏิบัติการ", "ชำนาญการ", "ชำนาญการพิเศษ", "เชี่ยวชาญ"]
                selected_level = st.selectbox("ระดับ", level_options, key="login_level")

            # 3. Department
            dept_options = ["ศาลปกครอง", "สำนักงานศาลปกครองสูงสุด", "สำนักงานศาลปกครองกลาง", "สำนักงานศาลปกครองในภูมิภาค", "สำนักวิจัยและวิชาการ", "สำนักส่งเสริมงานคดีปกครอง"]
            selected_dept = st.selectbox("หน่วยงาน", dept_options, key="login_dept")
            
            if st.button("🚀 เข้าสู่ระบบ (Start)", type="primary", use_container_width=True):
                # Validation for "Other" text input
                if selected_pos == "อื่นๆ" and not final_pos.strip():
                    st.warning("⚠️ กรุณาระบุตำแหน่งของคุณ")
                else:
                    # Construct Username: Position (Level) - Department
                    user_parts = [final_pos]
                    if selected_level:
                        user_parts.append(f"({selected_level})")
                    user_parts.append(f"- {selected_dept}")
                    
                    full_username = " ".join(user_parts)
                    
                    st.session_state.username = full_username
                    st.session_state.username_confirmed = True
                    st.session_state.last_activity = time.time()
                    st.query_params["username"] = full_username
                    st.rerun()
    st.stop()

# ==========================================
# 🏗️ SIDEBAR & PAGE LOGIC
# ==========================================
with st.sidebar:
    st.markdown("""<div style="text-align: center; margin-bottom: 20px;"><div class="court-icon">⚖️</div></div>""", unsafe_allow_html=True)
    st.markdown("<h3 style='text-align: center;'>Smart Court AI</h3>", unsafe_allow_html=True)
    st.markdown("---")
    
    page_mode = st.radio("Choose Mode", ["💬 แชท (Chat)", "📊 แดชบอร์ด (Dashboard)"], index=0, label_visibility="collapsed")
    st.markdown("---")
    
    with st.expander("⚙️ ตั้งค่า (Settings)", expanded=True):
        theme_choice = st.radio("Theme Mode", ["🌙 Modern Dark", "☀️ Official Light"], index=1, label_visibility="collapsed")
        load_custom_css(theme_choice) 
        
        st.markdown(f"**👤 ผู้ใช้งาน:** {st.session_state.username}")
        if st.button("ออกจากระบบ (Logout)", use_container_width=True):
            st.session_state.clear(); st.query_params.clear(); st.rerun()

        layout_mode = st.toggle("📱 Mobile / Tab Layout", value=False)
        username = st.session_state.username 
        temp_val = st.slider("ความสร้างสรรค์ (Temp)", 0.0, 1.0, 0.3)
        
        # System Prompt Config
        st.markdown("📝 **คำสั่งระบบ (System Prompt):**")
        from src.config import SYSTEM_PROMPT
        if "custom_sys_prompt" not in st.session_state:
            st.session_state.custom_sys_prompt = SYSTEM_PROMPT
        
        system_instruction_val = st.text_area("System Prompt", value=st.session_state.custom_sys_prompt, height=150, label_visibility="collapsed", key="sys_prompt_area")

    if page_mode == "💬 แชท (Chat)":
        st.markdown("---")
        st.markdown("##### ⚔️ Model Comparison")
        with st.container(border=True):
            st.caption("👈 ฝั่งซ้าย (Left Side)")
            kb_left_name = st.selectbox("คลังข้อมูล", list(KNOWLEDGE_BASES.keys()), index=0, key="kb_l")
            m_left = st.selectbox("โมเดล", list(MODELS.keys()), index=0, key="md_l")
        with st.container(border=True):
            st.caption("👉 ฝั่งขวา (Right Side)")
            kb_right_name = st.selectbox("คลังข้อมูล ", list(KNOWLEDGE_BASES.keys()), index=0, key="kb_r")
            m_right = st.selectbox("โมเดล ", list(MODELS.keys()), index=1 if len(MODELS) > 1 else 0, key="md_r")
        
        kb_left_id = KNOWLEDGE_BASES[kb_left_name]
        kb_right_id = KNOWLEDGE_BASES[kb_right_name]

# Helper to render side-by-side or tabs
def render_responses_layout(content_l, content_r, layout_tab):
    if layout_tab:
        t1, t2 = st.tabs(["👈 Left Answer", "👉 Right Answer"])
        with t1: content_l()
        with t2: content_r()
    else:
        c1, c2 = st.columns(2)
        with c1: content_l()
        with c2: content_r()

# Route Pages
if page_mode == "📊 แดชบอร์ด (Dashboard)":
    render_dashboard(username)
else:
    render_header()
    tab_chat, tab_hist = st.tabs(["💬 สนทนา (Chat)", "📜 ประวัติ ((History)"])
    
    with tab_chat:
        chat_container = st.container()
        prompt = None
        if 'auto_run_prompt' in st.session_state:
            prompt = st.session_state['auto_run_prompt']; del st.session_state['auto_run_prompt']
        
        with chat_container:
            if len(st.session_state.messages) == 0 and not prompt:
                render_welcome_screen()
                s_cols = st.columns(3)
                questions = ["ขั้นตอนการยื่นฟ้องคดีปกครอง?", "ศาลปกครองพิจารณาคดีประเภทใด?", "การขอทุเลาการบังคับคืออะไร?"]
                for i, q in enumerate(questions):
                    with s_cols[i]:
                        if st.button(q, key=f"s_btn_{i}", use_container_width=True): prompt = q

            for i, msg in enumerate(st.session_state.messages):
                if msg["role"] == "user":
                    with st.chat_message("user", avatar="🧑‍💼"): render_user_message(msg['content'])
                else:
                    with st.chat_message("assistant", avatar="⚖️"):
                        prompt_text = st.session_state.messages[i-1]["content"] if i > 0 else "History"
                        def render_l():
                            render_result_card(msg["left"], msg["kb_l_name"], side="left")
                            render_copy_button(msg["left"]['answer'], f"hist_l_{i}")
                        def render_r():
                            render_result_card(msg["right"], msg["kb_r_name"], side="right")
                            render_copy_button(msg["right"]['answer'], f"hist_r_{i}")
                        render_responses_layout(render_l, render_r, layout_mode)
                        
                        # DIFF VIEW HISTORY
                        if not layout_mode:
                            with st.expander("🔍 เปรียบเทียบความแตกต่าง (Difference Analysis)", expanded=False):
                                st.caption("🔴: มีในซ้ายแต่ไม่มีในขวา | 🟢: มีในขวาแต่ไม่มีในซ้าย")
                                render_diff_view(msg["left"]['answer'], msg["right"]['answer'])
                        
                        is_last = (i == len(st.session_state.messages) - 1)
                        render_combined_feedback_form(f"hist_fb_{i}", username, prompt_text, msg["left"], msg["right"], is_latest=is_last)
                        st.divider()

            if len(st.session_state.messages) > 0:
                 st.markdown("##### 🔎 คำถามที่เกี่ยวข้อง")
                 sq_cols = st.columns(3)
                 next_questions = ["ระยะเวลาฟ้องคดี?", "ค่าธรรมเนียมศาล?", "การอุทธรณ์ทำอย่างไร?"]
                 for i, nq in enumerate(next_questions):
                     with sq_cols[i]:
                         if st.button(nq, key=f"next_q_{i}", use_container_width=True): prompt = nq

        if len(st.session_state.messages) > 0:
            if st.columns([1, 4])[0].button("🔄 ถามซ้ำ (Regenerate)"):
                 if st.session_state.messages and st.session_state.messages[-1]['role'] == 'assistant':
                    last_v = st.session_state.messages[-2]
                    st.session_state.messages.pop(); st.session_state.messages.pop()
                    st.session_state['auto_run_prompt'] = last_v['content']; st.rerun()

        input_text = st.chat_input("พิมพ์คำถามของคุณที่นี่...")
        if input_text: prompt = input_text

    if prompt:
        with chat_container:
            if not st.session_state.messages or st.session_state.messages[-1].get('content') != prompt:
                 with st.chat_message("user", avatar="🧑‍💼"): render_user_message(prompt)
                 st.session_state.messages.append({"role": "user", "content": prompt})

            with st.chat_message("assistant", avatar="⚖️"):
                ph_l = None; ph_r = None
                if layout_mode:
                    status = st.status("🔍 กำลังประมวลผล...", expanded=True)
                else:
                    c1, c2 = st.columns(2)
                    with c1: st.info(f"👈 {m_left}", icon="⏳"); ph_l = st.empty(); ph_l.markdown("Waiting...")
                    with c2: st.success(f"👉 {m_right}", icon="⏳"); ph_r = st.empty(); ph_r.markdown("Waiting...")
                    status = st.status("🔍 System Progress...", expanded=True)

                with concurrent.futures.ThreadPoolExecutor() as executor:
                    status.write("📚 Searching Knowledge Base...")
                    ctx = get_script_run_ctx()
                    def task(func, *args, **kwargs): add_script_run_ctx(ctx=ctx); return func(*args, **kwargs)
                    f_ctx_l = executor.submit(task, retrieve_context, prompt, kb_left_id)
                    f_ctx_r = executor.submit(task, retrieve_context, prompt, kb_right_id)
                    ctx_l, cite_l = f_ctx_l.result()
                    ctx_r, cite_r = f_ctx_r.result()
                    
                    status.write("⚡ Generating Answers...")
                    import queue
                    q_l = queue.Queue()
                    q_r = queue.Queue()
                    
                    f1 = executor.submit(task, call_single_model, m_left, prompt, ctx_l, cite_l, temp_val, None, system_instruction_val, q_l)
                    f2 = executor.submit(task, call_single_model, m_right, prompt, ctx_r, cite_r, temp_val, None, system_instruction_val, q_r)
                    
                    ans_l = ""
                    ans_r = ""
                    done_l = False
                    done_r = False
                    
                    while not (done_l and done_r):
                        try:
                            while not q_l.empty():
                                chunk = q_l.get_nowait()
                                if chunk is None:
                                    done_l = True
                                else:
                                    ans_l += chunk
                        except queue.Empty:
                            pass
                            
                        try:
                            while not q_r.empty():
                                chunk = q_r.get_nowait()
                                if chunk is None:
                                    done_r = True
                                else:
                                    ans_r += chunk
                        except queue.Empty:
                            pass
                            
                        if ph_l and ans_l:
                            ph_l.markdown(ans_l + "▌")
                        if ph_r and ans_r:
                            ph_r.markdown(ans_r + "▌")
                            
                        if not done_l and f1.done() and q_l.empty():
                            done_l = True
                        if not done_r and f2.done() and q_r.empty():
                            done_r = True
                            
                        time.sleep(0.02)
                        
                    if ph_l and ans_l:
                        ph_l.markdown(ans_l)
                    if ph_r and ans_r:
                        ph_r.markdown(ans_r)
                        
                    res_l = f1.result()
                    res_r = f2.result()
                
                status.update(label="✅ เสร็จสิ้น", state="complete", expanded=False)
                if ph_l: ph_l.empty()
                if ph_r: ph_r.empty()
                
                curr = len(st.session_state.messages)
                def rl(): render_result_card(res_l, kb_left_name, side="left"); render_copy_button(res_l['answer'], f"live_l_{curr}")
                def rr(): render_result_card(res_r, kb_right_name, side="right"); render_copy_button(res_r['answer'], f"live_r_{curr}")
                render_responses_layout(rl, rr, layout_mode)

                # LIVE DIFF
                if not layout_mode:
                    with st.expander("🔍 เปรียบเทียบความแตกต่าง (Difference Analysis)", expanded=False):
                        st.caption("🔴: มีในซ้ายแต่ไม่มีในขวา | 🟢: มีในขวาแต่ไม่มีในซ้าย")
                        render_diff_view(res_l['answer'], res_r['answer'])

                render_combined_feedback_form(f"hist_fb_{curr}", username, prompt, res_l, res_r, is_latest=True)

                st.session_state.messages.append({"role": "assistant", "left": res_l, "right": res_r, "kb_l_name": kb_left_name, "kb_r_name": kb_right_name})
                if username: save_to_sheet(username, prompt, res_l, res_r, kb_left_name, kb_right_name)

    with tab_hist:
        st.subheader(f"📜 ประวัติการใช้งาน: {username}")
        c_ref, c_dl = st.columns(2)
        if c_ref.button("🔄 รีเฟรช"): st.cache_data.clear(); st.rerun()
        df = load_history_from_sheet(username)
        if not df.empty:
            if Document:
                docx = generate_word_report(df, username)
                if docx: c_dl.download_button("📄 ดาวน์โหลด Word", docx, f"Report_{username}.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", use_container_width=True)
            
            search_query = st.text_input("🔍 ค้นหา", "").lower()
            df = df.iloc[::-1]
            for idx, row in df.iterrows():
                try:
                    q = row['Question']
                    if search_query and search_query not in str(q).lower(): continue
                    
                    # Header with Timestamp and Question snippet
                    with st.expander(f"🕒 {row['Timestamp']} | ❓ {q[:50]}...", expanded=False):
                        st.markdown(f"**Question:** {q}")
                        
                        # Data Mapping for Result Cards
                        # Fetch config from MODELS if available, otherwise fallback
                        m_l_name = row['Model_Left']
                        m_r_name = row['Model_Right']
                        
                        cfg_l = MODELS.get(m_l_name, {"icon": "🤖", "color": "#808080"})
                        cfg_r = MODELS.get(m_r_name, {"icon": "🤖", "color": "#808080"})

                        d_l = {
                            "model": m_l_name, 
                            "answer": row['Answer_Left'], 
                            "cost": row['Cost_Model_Left'], 
                            "time": row.get('Time_Left', 0), 
                            "citations": {},
                            "config": cfg_l
                        }
                        d_r = {
                            "model": m_r_name, 
                            "answer": row['Answer_Right'], 
                            "cost": row['Cost_Model_Right'], 
                            "time": row.get('Time_Right', 0), 
                            "citations": {},
                            "config": cfg_r
                        }
                        
                        def rh_l(): 
                            render_result_card(d_l, row['KB_Left'], side="left")
                            render_copy_button(row['Answer_Left'], f"copy_hl_{idx}")
                            if row['Feedback_Left']: st.caption(f"💬 Feedback Left: {row['Feedback_Left']}")
                        
                        def rh_r(): 
                            render_result_card(d_r, row['KB_Right'], side="right")
                            render_copy_button(row['Answer_Right'], f"copy_hr_{idx}")
                            if row['Feedback_Right']: st.caption(f"💬 Feedback Right: {row['Feedback_Right']}")
                        
                        render_responses_layout(rh_l, rh_r, layout_mode)
                except Exception as e: 
                    st.error(f"Error loading record: {e}")
                    continue
        else: st.info("ไม่พบประวัติ")
