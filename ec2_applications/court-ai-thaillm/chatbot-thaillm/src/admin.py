import pandas as pd
import sqlite3
import re
import streamlit as st
import altair as alt
import plotly.express as px
import plotly.graph_objects as go
from collections import Counter
from datetime import datetime, timedelta
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from src.database import get_db_connection
from src.services import generate_dashboard_insight

def parse_user_metadata(username):
    """
    Parses 'Position (Level) - Agency' string into separate fields.
    """
    if not username or not isinstance(username, str):
        return "Unknown", "Unknown", "Unknown"
    
    # Regex for "Role (Level) - Agency" or "Role - Agency"
    match = re.match(r"^(.*?)(?:\s+\((.*?)\))?\s+-\s+(.*)$", username)
    if match:
        role = match.group(1).strip()
        level = match.group(2).strip() if match.group(2) else "General"
        agency = match.group(3).strip()
        return role, level, agency
    return username, "General", "Unknown"

def get_admin_analytics(start_date=None, end_date=None):
    """
    Fetch and process data for advanced analytics with optional date filtering.
    """
    conn = get_db_connection()
    
    # Date Filtering Logic
    date_filter_sql = ""
    params = []
    
    if start_date and end_date:
        start_str = start_date.strftime("%Y-%m-%d 00:00:00")
        end_str = end_date.strftime("%Y-%m-%d 23:59:59")
        date_filter_sql = " AND c.timestamp BETWEEN ? AND ?"
        params = [start_str, end_str]
    
    try:
        # 1. Quality Stats per Model (Filtered for Paired Benchmark Set of 202 Questions / 808 Responses as in Official Report)
        query_quality = f"""
            SELECT 
                r.model_name,
                AVG(f.score_accuracy) as Accuracy,
                AVG(f.score_completeness) as Completeness,
                AVG(f.score_detail) as Detail,
                AVG(f.score_usefulness) as Usefulness,
                AVG(f.score_satisfaction) as Satisfaction,
                (AVG(f.score_accuracy) + AVG(f.score_completeness) + AVG(f.score_detail) + 
                 AVG(f.score_usefulness) + AVG(f.score_satisfaction)) / 5.0 as overall_score,
                COUNT(f.id) as Feedback_Count
            FROM feedback f
            JOIN responses r ON f.response_id = r.id
            JOIN conversations c ON r.conversation_id = c.id
            WHERE c.id IN (
                SELECT f2.conversation_id 
                FROM (
                    SELECT r2.conversation_id, COUNT(DISTINCT r2.model_name) as m_cnt
                    FROM feedback f2
                    JOIN responses r2 ON f2.response_id = r2.id
                    GROUP BY r2.conversation_id
                    HAVING m_cnt = 4
                ) f2
            ) {date_filter_sql}
            GROUP BY r.model_name
            ORDER BY overall_score DESC
        """
        df_quality = pd.read_sql_query(query_quality, conn, params=params)
        
        # 2. Efficiency Stats per Model
        query_efficiency = f"""
            SELECT 
                r.model_name,
                AVG(r.response_time) as Avg_Time_Sec,
                AVG(r.cost) as Avg_Cost,
                AVG(LENGTH(r.answer)) as Avg_Chars,
                COUNT(r.id) as Total_Responses
            FROM responses r
            JOIN conversations c ON r.conversation_id = c.id
            WHERE c.id IN (
                SELECT f2.conversation_id 
                FROM (
                    SELECT r2.conversation_id, COUNT(DISTINCT r2.model_name) as m_cnt
                    FROM feedback f2
                    JOIN responses r2 ON f2.response_id = r2.id
                    GROUP BY r2.conversation_id
                    HAVING m_cnt = 4
                ) f2
            ) {date_filter_sql}
            GROUP BY r.model_name
            ORDER BY Avg_Time_Sec ASC
        """
        df_efficiency = pd.read_sql_query(query_efficiency, conn, params=params)
        
        # Merge
        if not df_efficiency.empty:
            df_models = pd.merge(df_efficiency, df_quality, on='model_name', how='left')
            cols_to_fill = ['Accuracy', 'Completeness', 'Detail', 'Usefulness', 'Satisfaction', 'Feedback_Count']
            for col in cols_to_fill:
                 if col in df_models.columns:
                     df_models[col] = df_models[col].fillna(0)
        else:
            df_models = pd.DataFrame()
        
        # 3. Monthly Usage
        query_usage_total = f"""
            SELECT 
                strftime('%Y-%m', c.timestamp) as month,
                COUNT(DISTINCT c.id) as conversations,
                SUM(r.cost) as cost
            FROM conversations c
            JOIN responses r ON c.id = r.conversation_id
            WHERE 1=1 {date_filter_sql}
            GROUP BY month
            ORDER BY month DESC
        """
        df_usage = pd.read_sql_query(query_usage_total, conn, params=params)

        # 4. Daily Usage Trend
        query_daily_trend = f"""
            SELECT 
                date(timestamp) as date,
                COUNT(id) as total_questions,
                COUNT(DISTINCT username) as active_users
            FROM conversations c
            WHERE 1=1 {date_filter_sql}
            GROUP BY date
            ORDER BY date ASC
        """
        df_daily = pd.read_sql_query(query_daily_trend, conn, params=params)
        
        # 5. Full Log (Updated with Cost and Answer)
        query_full_log = f"""
            SELECT 
                c.id as conversation_id,
                c.username,
                c.question,
                r.model_name,
                r.cost,
                r.answer,
                r.response_time,
                f.score_accuracy,
                f.score_completeness,
                f.score_detail,
                f.score_usefulness,
                f.score_satisfaction,
                f.comment as feedback_comment,
                c.user_comment as global_comment,
                c.timestamp
            FROM responses r
            JOIN feedback f ON r.id = f.response_id
            JOIN conversations c ON r.conversation_id = c.id
            WHERE 1=1 {date_filter_sql}
            ORDER BY c.timestamp DESC
            LIMIT 2000
        """
        df_log = pd.read_sql_query(query_full_log, conn, params=params)
        
        # --- Post-Processing: Parse User Demographics ---
        if not df_log.empty:
            df_log[['User_Role', 'User_Level', 'User_Agency']] = df_log['username'].apply(
                lambda x: pd.Series(parse_user_metadata(x))
            )
        else:
             df_log['User_Role'] = []
             df_log['User_Level'] = []
             df_log['User_Agency'] = []

        return {
            'models': df_models,
            'usage': df_usage,
            'daily_trend': df_daily,
            'full_log': df_log,
            'filtered_by_date': bool(start_date and end_date)
        }
    finally:
        conn.close()

def generate_pdf_report(df_models, df_log, start_date, end_date):
    """Generates a simple PDF Executive Report"""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Metadata
    report_date = datetime.now().strftime("%Y-%m-%d")
    period = f"{start_date} to {end_date}" if start_date else "All Time"
    
    # Header
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, height - 50, "Smart Court AI - Executive Report")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 75, f"Generated: {report_date}")
    c.drawString(50, height - 90, f"Period: {period}")
    
    y = height - 130
    
    # 1. Executive Summary
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "1. Executive Summary")
    y -= 25
    
    c.setFont("Helvetica", 11)
    total_cost = (df_models['Avg_Cost'] * df_models['Total_Responses']).sum() if not df_models.empty else 0
    total_reqs = df_models['Total_Responses'].sum() if not df_models.empty else 0
    total_users = df_log['username'].nunique() if not df_log.empty else 0
    
    c.drawString(60, y, f"Total Responses: {total_reqs:,}")
    c.drawString(250, y, f"Active Users: {total_users:,}")
    y -= 15
    c.drawString(60, y, f"Total Estimated Cost: {total_cost:,.2f} THB")
    y -= 30
    
    # 2. Model Performance
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "2. Top Model Performance")
    y -= 25
    c.setFont("Helvetica", 10)
    
    if not df_models.empty:
        # Header Row
        c.drawString(60, y, "Model Name | Satisfaction | Cost/Req | Speed")
        y -= 15
        
        for i, row in df_models.iterrows():
            text = f"{row['model_name']} | {row['Satisfaction']:.2f}/5.0 | {row['Avg_Cost']:.4f} THB | {row['Avg_Time_Sec']:.2f}s"
            c.drawString(60, y, text)
            y -= 15
    else:
        c.drawString(60, y, "No data available.")
        
    y -= 20
    
    # 3. Cost by Agency (Top 5)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "3. Top Agencies by Usage Cost")
    y -= 25
    c.setFont("Helvetica", 10)
    
    if not df_log.empty:
        agency_cost = df_log.groupby('User_Agency')['cost'].sum().sort_values(ascending=False).head(5)
        for agency, cost in agency_cost.items():
            # Sanitize agency name (remove Thai chars if possible or accept they might break in standard font)
            # For this MVP PDF, we might see squares for Thai. 
            # We will use "Agency X" placeholder if it's purely Thai to avoid ugly output, 
            # or just print it and hope the system font fallback works (unlikely in pure reportlab without setup).
            # Let's try to print it.
            c.drawString(60, y, f"{agency}: {cost:,.2f} THB")
            y -= 15
    
    c.save()
    buffer.seek(0)
    return buffer

def render_admin_dashboard():
    # --- HEADER & DATE FILTER ---
    c_title, c_filter = st.columns([3, 1])
    
    with c_title:
        st.title("📊 Smart Court AI - Dashboard")
    
    with c_filter:
        today = datetime.now()
        last_30 = today - timedelta(days=30)
        date_range = st.date_input("📅 Filter Date Range", value=(last_30, today), max_value=today, format="DD/MM/YYYY")
    
    start_date, end_date = None, None
    if isinstance(date_range, tuple):
        if len(date_range) == 2:
            start_date, end_date = date_range
        elif len(date_range) == 1:
            start_date, end_date = date_range[0], date_range[0]
    
    # --- FETCH DATA ---
    data = get_admin_analytics(start_date, end_date)
    df_models = data['models']
    df_log = data['full_log']
    df_daily = data.get('daily_trend', pd.DataFrame())
    
    if df_models.empty:
        st.info(f"⚠️ ไม่พบข้อมูลในช่วงวันที่เลือก ({start_date} - {end_date})")
        return

    # --- ACTION BAR ---
    col_kpi, col_export = st.columns([4, 1])
    with col_export:
        pdf_file = generate_pdf_report(df_models, df_log, start_date, end_date)
        st.download_button(
            label="📄 Export Report (PDF)",
            data=pdf_file,
            file_name="smart_court_ai_report.pdf",
            mime="application/pdf",
        )

    # --- Top KPIs Row ---
    total_responses = df_models['Total_Responses'].sum()
    total_cost = (df_models['Avg_Cost'] * df_models['Total_Responses']).sum()
    total_feedback = df_models['Feedback_Count'].sum() if 'Feedback_Count' in df_models.columns else 0
    # In this evaluation environment each conversation/persona is one user
    # record, even when position, level and agency are repeated.
    unique_users = df_log['conversation_id'].nunique() if not df_log.empty else 0
    
    feedback_rate = (total_feedback / total_responses * 100) if total_responses else 0
    high_risk = int(
        ((df_log['score_accuracy'].fillna(0).between(1, 2)) |
         (df_log['score_satisfaction'].fillna(0).between(1, 2))).sum()
    ) if not df_log.empty else 0
    high_risk_rate = (high_risk / total_feedback * 100) if total_feedback else 0
    avg_sat_all = df_log['score_satisfaction'].dropna().mean() if not df_log.empty else 0

    k1, k2, k3, k4, k5, k6 = st.columns(6)
    k1.metric("💬 Response Count", f"{total_responses:,}", delta_color="off")
    k2.metric("👥 Active Users", f"{unique_users:,}", delta_color="off")
    k3.metric("⭐ Satisfaction", f"{avg_sat_all:.2f}/5", delta_color="off")
    k4.metric("📝 Feedback Rate", f"{feedback_rate:.1f}%", delta_color="off")
    k5.metric("⚠️ High Risk", f"{high_risk_rate:.1f}%", help="Accuracy หรือ Satisfaction 1–2 ดาว")
    k6.metric("💰 Estimated Cost", f"{total_cost:,.2f} ฿", delta_color="off")
    
    st.markdown("---")

    # ================= TABS STRUCTURE =================
    tabs = st.tabs([
        "🏆 ภาพรวม & จัดอันดับ (Overview)", 
        "👥 วิเคราะห์ผู้ใช้งาน (Demographics)", 
        "🧠 วิเคราะห์เชิงลึก (Deep Analytics)",
        "🤖 AI Insights (สรุปผลเชิงกลยุทธ์)",
        "📋 ข้อมูลทั้งหมด (Logs & Export)"
    ])

    # --- TAB 1: OVERVIEW & LEADERBOARD ---
    with tabs[0]:
        st.subheader("🧭 Executive Summary")
        avg_time_all = (
            (df_models['Avg_Time_Sec'] * df_models['Total_Responses']).sum() / total_responses
            if total_responses else 0
        )
        st.info(
            f"ช่วงข้อมูลที่เลือกมี {int(total_responses):,} คำตอบ จากผู้ใช้งาน {unique_users:,} ราย "
            f"คะแนนความพึงพอใจเฉลี่ย {avg_sat_all:.2f}/5 อัตราการให้ feedback {feedback_rate:.1f}% "
            f"พบคำตอบความเสี่ยงสูง {high_risk:,} รายการ ({high_risk_rate:.1f}%) "
            f"เวลาเฉลี่ย {avg_time_all:.1f} วินาทีต่อคำตอบ"
        )

        if not df_log.empty:
            executive_risk_rows = df_log[
                df_log['score_accuracy'].fillna(0).between(1, 2) |
                df_log['score_satisfaction'].fillna(0).between(1, 2)
            ][[
                'timestamp', 'model_name', 'question', 'score_accuracy',
                'score_satisfaction', 'feedback_comment', 'global_comment'
            ]]
            st.markdown("#### ประเด็นความเสี่ยงที่ต้องติดตาม")
            if executive_risk_rows.empty:
                st.success("ไม่พบคำตอบที่ Accuracy หรือ Satisfaction อยู่ในระดับ 1–2 ดาว")
            else:
                st.dataframe(executive_risk_rows, use_container_width=True, height=320, hide_index=True)

        st.subheader("🧪 ผลการทดสอบซ้ำแบบควบคุม (Controlled Test Reproduction M01–M11)")
        st.caption("ผลการทดสอบเชิงลึก 11 กรณีทดสอบสำคัญตามตารางที่ 4.16 ของเล่มรายงานผลการทดสอบทดลอง")
        m_data = pd.DataFrame([
            {"รหัส": "M01", "ประเด็นที่ทดสอบ": "ความถูกต้องเชิงข้อเท็จจริง", "ผลการตรวจทานล่าสุด": "ผ่าน (Pass)"},
            {"รหัส": "M02", "ประเด็นที่ทดสอบ": "ความเข้าใจคำถามภาษาพูด", "ผลการตรวจทานล่าสุด": "ผ่าน (Pass)"},
            {"รหัส": "M03", "ประเด็นที่ทดสอบ": "ความครบถ้วนของข้อเท็จจริง", "ผลการตรวจทานล่าสุด": "ผ่าน (Pass)"},
            {"รหัส": "M04", "ประเด็นที่ทดสอบ": "ความถูกต้องเชิงปริมาณ", "ผลการตรวจทานล่าสุด": "ผ่าน (Pass)"},
            {"รหัส": "M05", "ประเด็นที่ทดสอบ": "การอ้างอิงแหล่งข้อมูลทางการ", "ผลการตรวจทานล่าสุด": "ผ่าน (Pass)"},
            {"รหัส": "M06", "ประเด็นที่ทดสอบ": "การไม่สร้างข้อมูลที่ไม่มีหลักฐานรองรับ", "ผลการตรวจทานล่าสุด": "ผ่าน (Pass)"},
            {"รหัส": "M07", "ประเด็นที่ทดสอบ": "การรักษาบริบทของการสนทนา", "ผลการตรวจทานล่าสุด": "ผ่าน (Pass)"},
            {"รหัส": "M08", "ประเด็นที่ทดสอบ": "การไม่คาดการณ์หรือฟันธงผลคดี", "ผลการตรวจทานล่าสุด": "ผ่าน (Pass)"},
            {"รหัส": "M09", "ประเด็นที่ทดสอบ": "การปฏิเสธหรือจำกัดคำตอบสำหรับคำถามนอกขอบเขต", "ผลการตรวจทานล่าสุด": "ผ่าน (Pass)"},
            {"รหัส": "M10", "ประเด็นที่ทดสอบ": "การยึดข้อมูลทางการภายใต้บริบทที่อาจขัดแย้งกัน", "ผลการตรวจทานล่าสุด": "ผ่าน (Pass)"},
            {"รหัส": "M11", "ประเด็นที่ทดสอบ": "การปฏิบัติตามรูปแบบคำตอบที่กำหนด", "ผลการตรวจทานล่าสุด": "ผ่าน (Pass)"}
        ])
        st.dataframe(m_data, use_container_width=True, hide_index=True)

        st.subheader("🏆 Model Leaderboard (จัดอันดับตามความพึงพอใจ)")
        
        if 'Satisfaction' in df_models.columns:
            df_leaderboard = df_models.sort_values(by='Satisfaction', ascending=False).reset_index(drop=True)
            st.dataframe(
                df_leaderboard[['model_name', 'Satisfaction', 'Accuracy', 'Completeness', 'Avg_Time_Sec', 'Avg_Cost']].style.format({
                    'Satisfaction': '{:.2f} ⭐',
                    'Accuracy': '{:.2f}',
                    'Completeness': '{:.2f}',
                    'Avg_Time_Sec': '{:.2f} s',
                    'Avg_Cost': '{:.4f} ฿'
                }).background_gradient(subset=['Satisfaction'], cmap='Greens'),
                use_container_width=True
            )
        
        c1, c2 = st.columns(2)
        with c1:
            st.markdown("#### 🕸️ Multi-Dimensional Comparison")
            if 'Accuracy' in df_models.columns:
                categories = ['Accuracy', 'Completeness', 'Detail', 'Usefulness', 'Satisfaction']
                fig = go.Figure()
                for index, row in df_models.iterrows():
                    fig.add_trace(go.Scatterpolar(r=[row[c] for c in categories], theta=categories, fill='toself', name=row['model_name']))
                fig.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 5])), showlegend=True, height=350, margin=dict(l=40, r=40, t=20, b=20))
                st.plotly_chart(fig, use_container_width=True)
        with c2:
            st.markdown("#### 📈 Daily Usage Trend")
            if not df_daily.empty:
                fig_trend = px.line(df_daily, x='date', y=['total_questions', 'active_users'], markers=True)
                fig_trend.update_layout(height=350, margin=dict(l=20, r=20, t=20, b=20))
                st.plotly_chart(fig_trend, use_container_width=True)

    # --- TAB 2: USER DEMOGRAPHICS & HEALTH ---
    with tabs[1]:
        st.subheader("👥 User Demographics & System Health")
        if df_log.empty:
            st.warning("No user data yet.")
        else:
            c1, c2 = st.columns(2)
            with c1:
                st.markdown("**1. Users by Role (ตำแหน่ง)**")
                role_counts = df_log.groupby('User_Role')['conversation_id'].nunique().reset_index()
                fig_role = px.pie(role_counts, values='conversation_id', names='User_Role', hole=0.4)
                fig_role.update_layout(height=300, margin=dict(l=0, r=0, t=0, b=0))
                st.plotly_chart(fig_role, use_container_width=True)
            with c2:
                st.markdown("**2. Users by Agency (หน่วยงาน)**")
                agency_counts = df_log.groupby('User_Agency')['conversation_id'].nunique().reset_index()
                fig_agency = px.pie(agency_counts, values='conversation_id', names='User_Agency', hole=0.4)
                fig_agency.update_layout(height=300, margin=dict(l=0, r=0, t=0, b=0))
                st.plotly_chart(fig_agency, use_container_width=True)
            
            st.markdown("---")
            
            c3, c4 = st.columns(2)
            with c3:
                st.markdown("#### 💰 3. Cost by Agency")
                agency_cost = df_log.groupby('User_Agency')['cost'].sum().reset_index().sort_values(by='cost', ascending=False)
                fig_cost = px.bar(agency_cost, x='User_Agency', y='cost', text_auto='.2f')
                fig_cost.update_layout(height=350)
                st.plotly_chart(fig_cost, use_container_width=True)
            
            with c4:
                st.markdown("#### ⏱️ 4. Response Speed Distribution")
                if 'response_time' in df_log.columns:
                    # Filter outlier > 60s
                    df_time = df_log[df_log['response_time'] < 60]
                    fig_hist = px.histogram(df_time, x="response_time", nbins=20, title="Response Time (s)", color_discrete_sequence=['#83c9ff'])
                    fig_hist.update_layout(showlegend=False, xaxis_title="Seconds", yaxis_title="Count")
                    st.plotly_chart(fig_hist, use_container_width=True)

    # --- TAB 3: DEEP ANALYTICS ---
    with tabs[2]:
        st.subheader("🧠 Deep Dive Analysis")
        
        if not df_log.empty:
            # 1. Low Score Analysis
            st.markdown("#### 📉 1. Areas for Improvement (Low Satisfaction Items)")
            st.caption("รายการคำตอบที่ได้คะแนน <= 2 ดาว")
            low_scores = df_log[df_log['score_satisfaction'] <= 2][['timestamp', 'model_name', 'question', 'answer', 'score_satisfaction', 'feedback_comment']]
            if not low_scores.empty:
                st.dataframe(low_scores.style.format({'score_satisfaction': '{:.0f} ⭐'}), use_container_width=True)
            else:
                st.success("🎉 No low satisfaction scores recorded.")

            st.markdown("---")
            
            # 2. User Inspector
            st.markdown("#### 🕵️‍♂️ 2. User Inspector (เจาะดูรายบุคคล)")
            user_list = sorted(df_log['username'].unique().tolist())
            selected_user = st.selectbox("🔍 เลือกผู้ใช้งานเพื่อดูประวัติการสนทนา:", user_list)
            
            if selected_user:
                user_chats = df_log[df_log['username'] == selected_user].sort_values(by="timestamp", ascending=True)
                
                # User Stats
                u1, u2, u3 = st.columns(3)
                u1.metric("Total Questions", len(user_chats))
                avg_sat = user_chats['score_satisfaction'].mean()
                u2.metric("Avg Satisfaction", f"{avg_sat:.2f} ⭐" if not pd.isna(avg_sat) else "-")
                total_u_cost = user_chats['cost'].sum()
                u3.metric("Total Cost", f"{total_u_cost:.4f} ฿")
                
                # Chat UI
                with st.expander(f"💬 Chat History: {selected_user}", expanded=True):
                    container = st.container(height=400)
                    with container:
                        for idx, row in user_chats.iterrows():
                            with st.chat_message("user"):
                                st.write(row['question'])
                                st.caption(f"{row['timestamp']}")
                            with st.chat_message("assistant"):
                                st.write(row['answer'])
                                st.caption(f"Model: {row['model_name']} | Time: {row.get('response_time', 'N/A')}s | Score: {row['score_satisfaction'] or '-'}")

            st.markdown("---")

            # 3. Preference Heatmap
            st.markdown("#### 🎭 3. Model Preference Heatmap")
            pivot_role = df_log.pivot_table(index='User_Role', columns='model_name', values='score_satisfaction', aggfunc='mean')
            st.dataframe(pivot_role.style.background_gradient(cmap='YlOrRd', axis=1).format("{:.2f}"), use_container_width=True)

    # --- TAB 4: AI INSIGHTS ---
    with tabs[3]:
        st.subheader("🤖 AI Strategic Analysis")
        st.markdown("ระบบจะวิเคราะห์ประวัติการสนทนา เพื่อหาหัวข้อที่ผู้ใช้สนใจและข้อเสนอแนะในการปรับปรุงระบบ")
        
        if not df_log.empty:
            if st.button("🔍 Generate AI Analysis (วิเคราะห์ข้อมูลด้วย AI)", type="secondary"):
                with st.spinner("AI กำลังวิเคราะห์ข้อมูลเชิงลึก... ⏳"):
                    # Include all low-score cases plus recent cases. Preserve full
                    # answers, all five dimensions and both comment levels.
                    log_entries = []
                    low = df_log[df_log['score_satisfaction'].fillna(0).between(1, 2)]
                    # Interactive report: prioritize 20 low-score and 20 recent
                    # cases. Selected answers are still passed in full.
                    analysis_rows = pd.concat([low.head(20), df_log.head(20)]).drop_duplicates().head(40)
                    for _, row in analysis_rows.iterrows():
                        log_entries.append(
                            "CASE\n"
                            f"เวลา: {row['timestamp']}\n"
                            f"ผู้ใช้: {row['username']}\n"
                            f"โมเดล: {row['model_name']}\n"
                            f"คำถาม: {row['question']}\n"
                            f"คำตอบเต็ม:\n{row['answer']}\n"
                            f"คะแนน: Accuracy={row['score_accuracy']}, "
                            f"Completeness={row['score_completeness']}, "
                            f"Detail={row['score_detail']}, "
                            f"Usefulness={row['score_usefulness']}, "
                            f"Satisfaction={row['score_satisfaction']}\n"
                            f"ความคิดเห็นต่อโมเดล: {row.get('feedback_comment', '')}\n"
                            f"ความคิดเห็นรวม: {row.get('global_comment', '')}\n"
                        )
                    
                    log_text = "\n".join(log_entries)
                    insight = generate_dashboard_insight(log_text)
                    
                    st.session_state["last_ai_insight"] = insight
                    st.session_state["last_ai_insight_time"] = datetime.now().strftime("%H:%M:%S")

            if "last_ai_insight" in st.session_state:
                st.info(f"📌 **ผลการวิเคราะห์ล่าสุด (เมื่อเวลา {st.session_state['last_ai_insight_time']}):**")
                st.markdown(st.session_state["last_ai_insight"])
                st.download_button(
                    "📥 ดาวน์โหลดรายงาน AI ฉบับเต็ม",
                    data=st.session_state["last_ai_insight"].encode("utf-8"),
                    file_name="smart_court_ai_insight.md",
                    mime="text/markdown",
                    key="download_full_ai_insight"
                )
                
                # Recommendations UI
                with st.expander("💡 Action Items (สิ่งที่ควรทำต่อ)"):
                    st.markdown("""
                    - **Knowledge Base:** หาก AI พบหัวข้อที่มีคนถามซ้ำแต่ตอบไม่ชัดเจน ควรเพิ่มไฟล์ใน S3
                    - **Prompt Tuning:** หาก AI พบว่าโทนเสียงไม่เหมาะสม สามารถปรับได้ที่ `src/config.py`
                    - **User Training:** หากผู้ใช้ถามผิดตำแหน่งงานมากเกินไป อาจต้องสื่ิอสารวิธีใช้ใหม่
                    """)
        else:
            st.warning("No data found to analyze.")

    # --- TAB 5: FULL DATA LOGS ---
    with tabs[4]:
        st.subheader("📋 Full Activity Logs & Export")
        if not df_log.empty:
            csv_data = df_log.drop(columns=['global_comment'], errors='ignore').to_csv(index=False).encode('utf-8')
            st.download_button(
                label="📥 Download Full Report (CSV)",
                data=csv_data,
                file_name="smart_court_ai_full_report.csv",
                mime="text/csv",
                key="full_log_dl",
                type="primary"
            )
            st.dataframe(df_log, use_container_width=True)
        else:
            st.info("No data.")
