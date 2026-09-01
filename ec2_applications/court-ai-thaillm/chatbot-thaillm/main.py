import streamlit as st
import concurrent.futures
import pandas as pd
import time
import threading

from src.config import MODELS, KNOWLEDGE_BASES
from src.utils import check_secrets
from src.ui import load_custom_css, render_header, render_user_message, render_result_card, render_welcome_screen, render_copy_button, render_sidebar_header
from src.services import retrieve_context, call_single_model, generate_related_questions
from src.database import ensure_db_initialized, save_conversation, load_history, save_feedback, get_response_id, get_stats, save_conversation_comment
from src.admin import render_admin_dashboard
from src.export import export_conversation_to_pdf, export_history_to_csv
from streamlit.runtime.scriptrunner import add_script_run_ctx, get_script_run_ctx

# 1. Setup Page
st.set_page_config(page_title="Smart Court AI", page_icon="⚖️", layout="wide")

# 2. Check Secrets & DB
check_secrets()
ensure_db_initialized()

# 3. Initialize Session State
if "messages" not in st.session_state:
    st.session_state.messages = []
    
# Check Query Params for Auto-Login (Persistence)
query_params = st.query_params
restored_user = query_params.get("user", None)

if "username_confirmed" not in st.session_state:
    # If user exists in URL, restore session
    if restored_user:
        st.session_state.username = restored_user
        st.session_state.username_confirmed = True
        st.session_state.last_activity = time.time()
    else:
        st.session_state.username_confirmed = False

if "username" not in st.session_state:
    st.session_state.username = ""
if "last_activity" not in st.session_state:
    st.session_state.last_activity = time.time()

# 3.5 Check Session Timeout (15 Minutes)
SESSION_TIMEOUT = 45 * 60  # 45 minutes in seconds

if st.session_state.username_confirmed:
    current_time = time.time()
    elapsed = current_time - st.session_state.last_activity
    
    if elapsed > SESSION_TIMEOUT:
        # Session Expired
        st.session_state.username_confirmed = False
        st.session_state.username = ""
        st.session_state.messages = []
        if "user" in st.query_params:
            del st.query_params["user"]
        st.warning("⏳ หมดเวลาการใช้งาน (Session Timeout) เนื่องจากไม่มีการใช้งานเกิน 15 นาที")
        st.stop()
    else:
        st.session_state.last_activity = current_time
        if st.session_state.username:
             st.query_params["user"] = st.session_state.username

# 4. Load Global CSS
if not st.session_state.username_confirmed:
    load_custom_css("☀️ Official Light")

# ==========================================
# 🔐 LOGIN SCREEN
# ==========================================
# ==========================================
# 🔐 PREMIUM LOGIN SCREEN
# ==========================================
if not st.session_state.username_confirmed:
    # Use a centered layout with a wider middle column
    _, central_col, _ = st.columns([0.5, 3, 0.5])
    
    with central_col:
        st.markdown("<br/><br/>", unsafe_allow_html=True)
        # Wrap the whole login form in a premium glass card
        st.markdown("""
        <div class="glass-card" style="padding: 40px; text-align: center;">
            <div style='font-size: 80px; margin-bottom: 10px;'>⚖️</div>
            <h1 style='margin-bottom: 0;'>Smart Court AI</h1>
            <p style='font-size: 1.2rem; opacity: 0.8; margin-bottom: 40px;'>
               Smart Assistant for the Administrative Court of Thailand<br/>
               <span style="font-size: 0.9rem; font-weight: normal;">(Powered by 4 Advanced Thai LLM Models)</span>
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        # We can't put interactive Streamlit widgets inside a div, so we use a container with border=False
        # and rely on the background style we just set above if possible, or just place them after.
        # Streamlit containers now support styling via st.container(border=True)
        
        st.markdown("<br/>", unsafe_allow_html=True)
        with st.container(border=True):
            st.markdown("### 👤 ลงชื่อเข้าใช้งาน (Sign In)")
            
            # 1. Position Selection
            position_opts = ["ตุลาการศาลปกครอง", "พนักงานคดีปกครอง", "เจ้าหน้าที่ศาลปกครอง", "อื่นๆ"]
            selected_pos = st.selectbox("1. เลือกตำแหน่ง (Position):", position_opts, key="login_pos")
            
            final_role = selected_pos
            if selected_pos == "อื่นๆ":
                 final_role = st.text_input("ระบุตำแหน่ง (Specify Position):", placeholder="โปรดระบุ...", key="login_pos_other")
            
            # 2. Level Selection (Conditional)
            # Conditions: Show if NOT "ตุลาการศาลปกครอง"
            selected_level = ""
            if selected_pos != "ตุลาการศาลปกครอง":
                level_opts = ["ปฏิบัติการ", "ชำนาญการ", "ชำนาญการพิเศษ", "เชี่ยวชาญ"]
                selected_level = st.selectbox("2. เลือกระดับ (Level):", level_opts, key="login_level")
            
            # 3. Agency Selection
            if selected_pos == "ตุลาการศาลปกครอง":
                agency_opts = ["ศาลปกครอง"]
            else:
                agency_opts = [
                    "สำนักงานศาลปกครองสูงสุด", 
                    "สำนักงานศาลปกครองกลาง", 
                    "สำนักงานศาลปกครองในภูมิภาค", 
                    "สำนักวิจัยและวิชาการ", 
                    "สำนักส่งเสริมงานคดีปกครอง"
                ]
            if selected_pos == "อื่นๆ":
                agency_opts.append("อื่นๆ")

            selected_agency = st.selectbox("3. เลือกหน่วยงาน (Agency):", agency_opts, key="login_agency")

            final_agency = selected_agency
            if selected_agency == "อื่นๆ":
                final_agency = st.text_input(
                    "ระบุชื่อหน่วยงาน (Specify Agency):",
                    placeholder="โปรดระบุ...",
                    key="login_agency_other"
                )
            
            # Sub-text
            st.markdown("<p style='font-size: 0.8rem; color: gray; margin-top: 20px;'>ระบบจะเก็บข้อมูลการใช้งานและผลประเมินเพื่อใช้ในการพัฒนาระบบ</p>", unsafe_allow_html=True)
            
            if st.button("🚀 เข้าสู่ระบบ (Start Session)", type="primary", use_container_width=True):
                # Validation
                if not final_role.strip():
                    st.warning("⚠️ กรุณาระบุตำแหน่ง (Please specify your position)")
                elif not final_agency.strip():
                    st.warning("⚠️ กรุณาระบุชื่อหน่วยงาน (Please specify your agency)")
                else:
                    # Construct Username/ID
                    # Format: Position (Level) @ Agency  OR  Position @ Agency
                    if selected_level:
                        user_id_str = f"{final_role.strip()} ({selected_level}) - {final_agency.strip()}"
                    else:
                        user_id_str = f"{final_role.strip()} - {final_agency.strip()}"
                        
                    st.session_state.username = user_id_str
                    st.session_state.username_confirmed = True
                    st.session_state.last_activity = time.time()
                    st.query_params["user"] = user_id_str
                    st.rerun()
    st.stop()

# ==========================================
# 🏗️ SIDEBAR (Logged In)
# ==========================================
else:
    with st.sidebar:
        render_sidebar_header(st.session_state.username)
        
        st.markdown("### ⚙️ Settings")
        
        # Default temperature (Admin can override via Admin panel)
        temp_val = st.session_state.get('admin_temp', 0.3)
        with st.expander("⚙️ ตั้งค่า (Settings)", expanded=False):
            theme_choice = st.radio("Theme Mode", ["🌙 Modern Dark", "☀️ Official Light"], index=1, label_visibility="collapsed")
            load_custom_css(theme_choice)
            
            st.text_input("ชื่อผู้ใช้งาน (User)", value=st.session_state.username, disabled=True)
            username = st.session_state.username
            
    
        st.markdown("---")
    
        # Knowledge Base Selection
        st.markdown("##### 📚 คลังข้อมูล (Knowledge Base)")
        kb_name = st.selectbox("เลือกแหล่งข้อมูล", list(KNOWLEDGE_BASES.keys()), index=0, key="kb_select")
        kb_id = KNOWLEDGE_BASES[kb_name]
        
        st.markdown("---")
        if st.button("🚪 ลงชื่อออก (Logout)", use_container_width=True, type="secondary"):
            st.session_state.username_confirmed = False
            st.session_state.username = ""
            st.session_state.messages = []
            if "user" in st.query_params:
                del st.query_params["user"]
            st.rerun()

        st.info(f"ระบบจะใช้ **{kb_name}** ในการค้นหาคำตอบสำหรับทั้ง 4 โมเดล")

        st.markdown("---")
        
        # Log Viewer
        if "system_logs" not in st.session_state:
            st.session_state.system_logs = []

        # Model Selection
        st.markdown("##### 🤖 เลือกโมเดลที่ต้องการ (Select Models)")
        all_model_names = list(MODELS.keys())
        default_models = all_model_names[:4]
        
        selected_models = st.multiselect(
            "เลือกโมเดลเพื่อเปรียบเทียบ",
            options=all_model_names,
            default=default_models,
            key="selected_models",
            label_visibility="collapsed"
        )
        
        if not selected_models:
            st.warning("⚠️ กรุณาเลือกอย่างน้อย 1 โมเดล")
            st.stop()

        st.markdown("---")
        
        # Admin Login Section
        with st.expander("🔐 ผู้ดูแลระบบ (Admin Access)"):
            if not st.session_state.get("is_admin"):
                admin_pass = st.text_input("รหัสผ่าน (Password)", type="password", key="admin_pass_login")
                if st.button("เข้าสู่ระบบ (Login)", key="btn_admin_login"):
                    if admin_pass == "Admin1234":
                        st.session_state.is_admin = True
                        st.success("✅ เข้าสู่ระบบสำเร็จ")
                        st.rerun()
                    else:
                        st.error("❌ รหัสผ่านไม่ถูกต้อง")
            else:
                st.success("✅ ท่านอยู่ในสถานะ Admin")
                st.markdown("---")
                st.caption("🌡️ ความสร้างสรรค์ (Temperature)")
                temp_val = st.slider("Temperature", 0.0, 1.0, temp_val, key="admin_temp", label_visibility="collapsed")
                st.caption(f"ค่าปัจจุบัน: {temp_val:.2f} | สูง = สร้างสรรค์มากขึ้น")
                st.markdown("---")
                st.caption("🛠️ System Logs (ล่าสุด 10 รายการ)")
                if st.button("Clear Logs", type="secondary", use_container_width=True, key="clear_logs_admin"):
                    st.session_state.system_logs = []
                    st.rerun()
                if not st.session_state.system_logs:
                    st.caption("No logs yet.")
                else:
                    for log in reversed(st.session_state.system_logs[-10:]):
                        st.text(log)
                        st.divider()
                st.markdown("---")
                if st.button("ออกจากระบบ (Logout Admin)", key="btn_admin_logout"):
                    st.session_state.is_admin = False
                    st.rerun()

    # ==========================================
    # 🖥️ MAIN CONTENT (Logged In)
    # ==========================================
    
    # Feedback Callback Logic
    def handle_feedback(response_id, acc, comp, det, use, sat, comment):
        if response_id:
            try:
                save_feedback(
                    response_id, 
                    accuracy=acc, 
                    completeness=comp, 
                    detail=det, 
                    usefulness=use, 
                    satisfaction=sat, 
                    comment=comment
                )
                st.toast(f"✅ บันทึกผลประเมินเรียบร้อย", icon="⭐")
            except Exception as e:
                st.error(f"Error saving feedback: {e}")

    # Main Tabs
    tab_chat, tab_hist, tab_admin = st.tabs([
        "💬 สนทนา (Smart Chat)", 
        "📜 ประวัติ (History)", 
        "📊 แอดมิน (Admin Insights)"
    ])
    
    def get_grid_cols(n_models):
        if n_models == 1: return st.columns(1)
        elif n_models == 2: return st.columns(2)
        else: return st.columns(2) + st.columns(2)

    # --- Tab 1: Chat ---
    with tab_chat:
        chat_container = st.container()
        
        # Ensure Welcome Screen Placeholder is managed
        welcome_ph = st.empty()
        
        prompt = None
        if 'auto_run_prompt' in st.session_state:
            prompt = st.session_state['auto_run_prompt']
            del st.session_state['auto_run_prompt']
        
        # Show Welcome Screen ONLY if history is empty and no active prompt
        if len(st.session_state.messages) == 0 and not prompt:
            with welcome_ph.container():
                render_welcome_screen()
                s_cols = st.columns(3)
                questions = [
                    "ขั้นตอนการยื่นฟ้องคดีปกครองทำอย่างไร?",
                    "ศาลปกครองมีอำนาจพิจารณาคดีประเภทใดบ้าง?",
                    "การขอทุเลาการบังคับตามคำสั่งทางปกครองคืออะไร?"
                ]
                for i, q in enumerate(questions):
                    with s_cols[i]:
                        if st.button(q, use_container_width=True, key=f"welcome_q_{i}"):
                            st.session_state['auto_run_prompt'] = q
                            st.rerun()
        else:
            welcome_ph.empty() # Fix Phantom Text
        
        # Render Chat History
        for msg_idx, msg in enumerate(st.session_state.messages):
            if msg["role"] == "user":
                render_user_message(msg["content"])
            else:
                results = msg.get("results", {})
                models_to_show = [m for m in selected_models if m in results]
                
                if not models_to_show:
                    st.warning("⚠️ ประวัตินี้ไม่มีโมเดลที่ท่านเลือกในปัจจุบัน")
                    continue

                cols = get_grid_cols(len(models_to_show))
                
                for i, m_key in enumerate(models_to_show):
                    res = results[m_key]
                    with cols[i]:
                        render_result_card(res, kb_name)
                        
                        # Unified Feedback System (5 Dimensions ONLY)
                        with st.expander("⭐ ประเมินคำตอบ (Rate)"):
                            f_uid = f"{msg_idx}_{m_key}_{res.get('db_id')}"
                            
                            st.caption("1. ความถูกต้อง (Accuracy)")
                            s_acc = st.feedback("stars", key=f"acc_{f_uid}")
                            
                            st.caption("2. ความครบถ้วน (Completeness)")
                            s_comp = st.feedback("stars", key=f"comp_{f_uid}")
                            
                            st.caption("3. ความละเอียด (Detail)")
                            s_det = st.feedback("stars", key=f"det_{f_uid}")
                            
                            st.caption("4. มีประโยชน์ (Usefulness)")
                            s_use = st.feedback("stars", key=f"use_{f_uid}")
                            
                            st.caption("5. ความพึงพอใจภาพรวม (Satisfaction)")
                            s_sat = st.feedback("stars", key=f"sat_{f_uid}")

                            response_comment = st.text_area(
                                "ข้อเสนอแนะหรือคำตอบที่ควรเป็น (สำหรับโมเดลนี้)",
                                placeholder="ระบุข้อความที่ผิด สิ่งที่ขาด หรือคำตอบที่ถูกต้อง...",
                                height=100,
                                key=f"comment_{f_uid}"
                            )
                            
                            if st.button("ส่งผลประเมิน", key=f"btn_{f_uid}", use_container_width=True):
                                v_acc = (s_acc + 1) if s_acc is not None else 0
                                v_comp = (s_comp + 1) if s_comp is not None else 0
                                v_det = (s_det + 1) if s_det is not None else 0
                                v_use = (s_use + 1) if s_use is not None else 0
                                v_sat = (s_sat + 1) if s_sat is not None else 0
                                
                                handle_feedback(
                                    res.get('db_id'), 
                                    v_acc, v_comp, v_det, v_use, v_sat, 
                                    response_comment
                                )
                                st.session_state['needs_feedback'] = False
                                st.rerun()
                            
                        render_copy_button(res['answer'], f"hist_{i}_{len(str(results))}")

                # Global Comment for this Turn (Outside Model Loop)
                if msg.get("conversation_id"):
                     st.markdown("---")
                     with st.expander("💬 ข้อเสนอแนะเพิ่มเติม / คำตอบที่ถูกต้อง (สำหรับคำถามนี้)"):
                         c_key = f"g_comment_{msg_idx}_{msg['conversation_id']}"
                         
                         default_comment = msg.get("comment", "")
                         
                         g_comment = st.text_area("ระบุคำตอบที่ถูกต้อง หรือข้อเสนอแนะ:", value=default_comment, key=c_key)
                         
                         if st.button("บันทึกข้อเสนอแนะ", key=f"btn_{c_key}"):
                             save_conversation_comment(msg['conversation_id'], g_comment)
                             st.toast("✅ บันทึกข้อเสนอแนะเรียบร้อย")
                
                # Render Suggested Questions (if any)
                suggestions = msg.get("suggestions", [])
                if suggestions:
                    st.write("---")
                    st.caption("💡 คำถามที่เกี่ยวข้อง (Suggested Questions):")
                    s_cols = st.columns(len(suggestions))
                    for si, s_q in enumerate(suggestions):
                        with s_cols[si]:
                            if st.button(s_q, key=f"sugg_{msg_idx}_{si}", use_container_width=True):
                                st.session_state['auto_run_prompt'] = s_q
                                st.rerun()

        # User Input
        _chat_input = st.chat_input("พิมพ์คำถามของคุณที่นี่...")

        if prompt := (prompt or _chat_input):
            # Clear welcome screen instantly (optimistic)
            welcome_ph.empty()
            
            st.session_state.messages.append({"role": "user", "content": prompt})
            render_user_message(prompt)
            
            # Prepare Dynamic Layout
            n_models = len(selected_models)
            cols = get_grid_cols(n_models)
            placeholders = []
            
            for col in cols:
                placeholders.append(col.empty())
            
            # Threading Helper
            main_ctx = get_script_run_ctx()
            def task_with_ctx(func, *args, **kwargs):
                add_script_run_ctx(threading.current_thread(), main_ctx)
                return func(*args, **kwargs)

            # 1. Retrieve Context
            with st.spinner(f"🔍 กำลังค้นหาข้อมูลจาก {kb_name}..."):
                ctx_text, citation_details = retrieve_context(prompt, kb_id)
                
            # 2. Call Models
            with st.spinner("⚡ AI กำลังประมวลผลและสร้างคำตอบ (AI is thinking)..."):
                with concurrent.futures.ThreadPoolExecutor(max_workers=n_models) as executor:
                    futures = {}
                    for i, m_key in enumerate(selected_models):
                        future = executor.submit(task_with_ctx, call_single_model, m_key, prompt, ctx_text, citation_details, temp_val, st.session_state.messages[:-1], placeholders[i])
                        futures[future] = m_key, i 
                        
                    results = {}
                    for future in concurrent.futures.as_completed(futures):
                        res = future.result()
                        m_key, idx = futures[future]
                        results[res['model']] = res
                        
                        placeholders[idx].empty()
                        with cols[idx]:
                            render_result_card(res, kb_name)
                            render_copy_button(res['answer'], f"live_{idx}")
            
            # 3. Save to DB
            responses_list = [results[m] for m in selected_models if m in results]
            
            if username:
                conv_id = save_conversation(username, prompt, responses_list, kb_name)
                # Attach IDs
                for res in results.values():
                    res['db_id'] = get_response_id(conv_id, res['model'])

            # Flag: ต้องการ feedback ก่อนถามต่อ
            st.session_state['needs_feedback'] = True

            # 4. Generate Suggestions (Post-Response)
            suggestions = []
            with st.spinner("💡 กำลังคิดคำถามแนะนำ (Thinking next questions)..."):
                model_for_sugg = selected_models[0] if selected_models else "Typhoon"
                suggestions = generate_related_questions(prompt, ctx_text, model_name=model_for_sugg)
                
            if not suggestions:
                st.toast("⚠️ ไม่สามารถสร้างคำถามแนะนำได้ (API Error or Empty)", icon="⚠️")

            # 5. Save to State
            st.session_state.messages.append({
                "role": "assistant",
                "results": results,
                "kb_name": kb_name,
                "conversation_id": conv_id if username else None,
                "suggestions": suggestions
            })
            
            # 6. Rerun
            st.rerun()

    # --- Tab 2: History ---
    with tab_hist:
        st.subheader(f"📜 ประวัติการใช้งาน: {username}")
        if st.button("🔄 รีเฟรชข้อมูล"): st.rerun()
        
        history = load_history(username, limit=20)
        stats = get_stats(username)
        
        if history:
            col_s1, col_s2, col_s3 = st.columns(3)
            col_s1.metric("ประวัติการสนทนา", f"{stats['total_conversations']} ครั้ง")
            col_s2.metric("ค่าใช้จ่ายรวม", f"{stats['total_cost']:.2f} THB")
            
            search_q = st.text_input("🔍 ค้นหาประวัติ", "")
            
            for conv in history:
                if search_q and search_q not in conv['question']: continue
                
                with st.expander(f"🕒 {conv['timestamp']} | ❓ {conv['question'][:50]}..."):
                    st.write(f"**Question:** {conv['question']}")
                    st.caption(f"Knowledge Base: {conv['knowledge_base']}")
                    
                    e_col1, e_col2 = st.columns([1, 4])
                    with e_col1:
                        pdf_data = export_conversation_to_pdf(conv)
                        st.download_button(
                            label="📥 Export PDF",
                            data=pdf_data,
                            file_name=f"chat_{conv['id']}.pdf",
                            mime="application/pdf",
                            key=f"dl_{conv['id']}"
                        )
                    
                    st.markdown("<br/>", unsafe_allow_html=True)
                    h_cols = st.columns(2) + st.columns(2)
                    for i, resp in enumerate(conv['responses']):
                        if i < 4:
                            with h_cols[i]:
                                st.markdown(f"**{resp['model_name']}**")
                                st.info(resp['answer'])
                                
                                if resp.get('score_satisfaction'):
                                    st.markdown(f"""
                                    <div style="font-size: 0.8em; color: #666; background: #f0f2f6; padding: 5px; border-radius: 5px;">
                                    <b>⭐ การประเมิน:</b><br/>
                                    แม่นยำ: {resp['score_accuracy']} | 
                                    ครบถ้วน: {resp['score_completeness']} | 
                                    รายละเอียด: {resp['score_detail']} | 
                                    มีประโยชน์: {resp['score_usefulness']} | 
                                    พอใจรวม: {resp['score_satisfaction']}
                                    </div>
                                    """, unsafe_allow_html=True)
                                
                                st.caption(f"Cost: {resp['cost']} THB")
                    
                    if conv['comment']:
                        st.markdown("---")
                        st.markdown("**💬 ข้อเสนอแนะเพิ่มเติม / คำตอบที่แนะนำ:**")
                        st.success(conv['comment'])
            
            st.markdown("---")
            csv_data = export_history_to_csv(history)
            st.download_button(
                label="📊 Download Full History (CSV)",
                data=csv_data,
                file_name=f"history_{username}.csv",
                mime="text/csv",
                use_container_width=True
            )
        else:
            st.info("ยังไม่มีประวัติการใช้งาน")

    # --- Tab 3: Admin Insights ---
    with tab_admin:
        if st.session_state.get("is_admin"):
            render_admin_dashboard()
        else:
            st.warning("🔒 ส่วนนี้สงวนสิทธิ์สำหรับผู้ดูแลระบบ (Admin Only)")
            st.info("กรุณาเข้าสู่ระบบ Admin ผ่านเมนูทางซ้ายมือ (Sidebar) > 🔐 ผู้ดูแลระบบ")
