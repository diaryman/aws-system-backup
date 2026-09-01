# src/ui.py
import streamlit as st
import html

# ==========================================
# 🎨 THEME & CSS
# ==========================================

def load_custom_css(theme_mode="Modern Dark"):
    """
    Injects custom CSS based on the selected theme with Clean Minimalist Design.
    """
    if "Light" in theme_mode:
        bg_color = "#f8fafc" # Slate-50
        text_color = "#0f172a" # Slate-900
        
        # Surfaces
        card_bg = "#ffffff"
        card_border = "1px solid #e2e8f0" # Slate-200
        card_border_hover = "#cbd5e1" # Slate-300
        card_shadow = "0 1px 3px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.04)"
        
        user_bubble_bg = "#2563eb" # Blue-600
        user_bubble_text = "#ffffff"
        
        sidebar_bg = "#ffffff"
        input_bg = "#ffffff"
        border_color = "#e2e8f0"
        
        button_bg = "#ffffff"
        button_hover_bg = "#f1f5f9" # Slate-100
        button_hover_border = "#cbd5e1"
        button_hover_text = "#0f172a"
        
    else: # Dark Mode
        bg_color = "#0f172a" # Slate-900
        text_color = "#f8fafc" # Slate-50
        
        # Surfaces
        card_bg = "#1e293b" # Slate-800
        card_border = "1px solid #334155" # Slate-700
        card_border_hover = "#475569" # Slate-600
        card_shadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
        
        user_bubble_bg = "#3b82f6" # Blue-500
        user_bubble_text = "#ffffff"
        
        sidebar_bg = "#1e293b" # Slate-800
        input_bg = "#1e293b"
        border_color = "#334155"
        
        button_bg = "#1e293b"
        button_hover_bg = "#334155" # Slate-700
        button_hover_border = "#475569"
        button_hover_text = "#f8fafc"

    st.markdown(f"""
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
    <!-- Bootstrap JS Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap');
        
        /* Global Reset */
        .stApp {{ background-color: {bg_color}; background-image: none !important; }}
        html, body, [class*="css"], .stMarkdown, .stText, p {{ font-family: 'Inter', 'Sarabun', sans-serif !important; color: {text_color} !important; }}
        h1, h2, h3, h4, h5, h6 {{ font-family: 'Inter', 'Sarabun', sans-serif !important; color: {text_color} !important; font-weight: 600; }}
        
        /* Animations */
        @keyframes slideIn {{
            from {{ opacity: 0; transform: translateY(10px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}
        
        /* Minimalist Card */
        .response-card {{ 
            background-color: {card_bg};
            border: {card_border};
            border-radius: 12px; 
            box-shadow: {card_shadow};
            margin-bottom: 16px; 
            color: {text_color}; 
            overflow: hidden; 
            transition: border-color 0.2s, box-shadow 0.2s;
            animation: slideIn 0.3s ease-out;
        }}
        .response-card:hover {{ 
            border-color: {card_border_hover}; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }}
        
        .card-content {{ padding: 20px; line-height: 1.7; }}
        
        .card-header {{ 
            background: rgba(0,0,0,0.02); 
            padding: 10px 16px; 
            border-bottom: {card_border}; 
            display: flex; justify-content: space-between; align-items: center; 
        }}
        
        /* Badges */
        .model-badge {{ 
            display: inline-flex; align-items: center;
            padding: 4px 10px; border-radius: 6px; 
            font-size: 0.8rem; font-weight: 600; 
            color: white !important; 
        }}
        
        /* User Bubble */
        .user-bubble {{ 
            background-color: {user_bubble_bg}; 
            color: {user_bubble_text} !important; 
            padding: 10px 16px; 
            border-radius: 16px 16px 4px 16px; 
            margin-left: auto; width: fit-content; max-width: 80%; text-align: left; 
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            animation: slideIn 0.2s ease-out;
            font-size: 0.95rem;
            line-height: 1.5;
        }}
        
        /* Inputs & Sidebar */
        .stChatInput textarea {{ 
            background-color: {input_bg} !important; 
            border-radius: 20px !important; 
            border: 1px solid {border_color} !important; 
            color: {text_color} !important; 
            padding: 10px 15px !important;
        }}
        .stChatInput textarea:focus {{
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
        }}
        
        [data-testid="stSidebar"] {{ 
            background-color: {sidebar_bg}; 
            border-right: 1px solid {border_color}; 
        }}
        
        /* Sidebar Input Visibility Improvements */
        [data-testid="stSidebar"] input {{
            color: {text_color} !important;
            border: 1px solid {border_color} !important;
            background-color: {card_bg} !important;
            border-radius: 8px !important;
            padding: 8px !important;
        }}
        [data-testid="stSidebar"] div[data-baseweb="select"] > div {{
            color: {text_color} !important;
            border: 1px solid {border_color} !important;
            background-color: {card_bg} !important;
            border-radius: 8px !important;
        }}
        [data-testid="stSidebar"] div[data-baseweb="select"] span {{
            color: {text_color} !important;
        }}
        
        /* Modern Button Styling */
        div.stButton > button {{
            background-color: {button_bg} !important;
            border: 1px solid {border_color} !important;
            color: {text_color} !important;
            border-radius: 8px !important;
            padding: 8px 16px !important;
            box-shadow: none !important;
            transition: all 0.2s ease !important;
            font-weight: 500 !important;
            font-size: 0.9rem !important;
        }}
        div.stButton > button:hover {{
            background-color: {button_hover_bg} !important;
            border-color: {button_hover_border} !important;
            color: {button_hover_text} !important;
        }}
        div.stButton > button:active {{
            transform: scale(0.98);
        }}
    </style>
    """, unsafe_allow_html=True)

def render_header():
    st.markdown("""
        <div class="text-center py-4 border-bottom mb-4">
            <div class="fs-1 mb-2">⚖️</div>
            <h2 class="fw-bold mb-1" style="font-size: 1.8rem; letter-spacing: -0.5px;">Smart Court AI</h2>
            <p class="text-muted mb-0" style="font-size: 0.95rem;">
                <span class="badge bg-secondary-subtle text-secondary border px-2 py-1 me-1">ระบบทดสอบ</span> 
                ผู้ช่วยอัจฉริยะศาลปกครอง ถาม - ตอบ ข้อมูลทั่วไปเกี่ยวกับคดีปกครอง ด้วย AI
            </p>
        </div>
    """, unsafe_allow_html=True)

def render_welcome_screen():
    st.markdown("""
        <div class="text-center py-5 px-3" style="animation: slideIn 0.5s ease-out;">
            <div class="display-5 mb-3 text-secondary">💬</div>
            <h3 class="fw-semibold mb-2">สวัสดีครับ/ค่ะ ยินดีต้อนรับสู่ Smart Court AI</h3>
            <p class="text-muted lead" style="font-size: 1.1rem; max-width: 600px; margin: 0 auto 20px;">
                เริ่มต้นใช้งานโดยการเลือกคำถามแนะนำด้านล่าง หรือพิมพ์คำถามเกี่ยวกับคดีปกครองที่ช่องแชทด้านล่างได้ทันที
            </p>
            <div class="d-inline-flex align-items-center gap-1 text-muted" style="font-size: 0.85rem;">
                <i class="bi bi-shield-check text-success"></i> 
                <span>ระบบจะประมวลผลคำตอบโดยอิงจากฐานคลังความรู้กฎหมายของศาลปกครอง</span>
            </div>
        </div>
    """, unsafe_allow_html=True)

def render_user_message(content):
    safe_content = html.escape(content)
    st.markdown(f"""<div class="user-bubble">{safe_content}</div>""", unsafe_allow_html=True)

def render_copy_button(text_to_copy, unique_key):
    """
    Renders a small Copy button using Javascript with Bootstrap styling.
    """
    # Escape single quotes and newlines for JS safety
    safe_text = text_to_copy.replace("'", "\\'").replace("\n", "\\n").replace('"', '\\"')
    
    html_code = f"""
    <div class="d-flex justify-content-end align-items-center mt-2">
        <button onclick="copyToClipboard_{unique_key}()" class="btn btn-sm btn-outline-secondary" style="
            font-size: 0.8rem; 
            border-radius: 8px;
            transition: all 0.3s;">
            <i class="bi bi-clipboard"></i> Copy
        </button>
        <span id="msg_{unique_key}" class="ms-2 text-success" style="font-size: 0.8rem; display: none;">
            <i class="bi bi-check-circle-fill"></i> Copied!
        </span>
    </div>

    <script>
    function copyToClipboard_{unique_key}() {{
        const text = '{safe_text}';
        navigator.clipboard.writeText(text).then(function() {{
            const msg = document.getElementById('msg_{unique_key}');
            msg.style.display = 'inline';
            setTimeout(function() {{ msg.style.display = 'none'; }}, 2000);
        }}, function(err) {{
            console.error('Async: Could not copy text: ', err);
        }});
    }}
    </script>
    """
    st.components.v1.html(html_code, height=40)

def render_result_card(res_data, kb_name, side="neutral"):
    """Renders the standard result card for a model response with new UI and visual hierarchy."""
    color = res_data['config']['color']
    
    # Define styles based on side
    if side == "left":
        card_style = "border-top: 4px solid #3b82f6;"
        header_badge = "bg-primary-subtle text-primary border border-primary-subtle"
        side_icon = "👈"
    elif side == "right":
        card_style = "border-top: 4px solid #10b981;"
        header_badge = "bg-success-subtle text-success border border-success-subtle"
        side_icon = "👉"
    else:
        card_style = "border-top: 4px solid #64748b;"
        header_badge = "bg-secondary-subtle text-secondary border border-secondary-subtle"
        side_icon = ""

    # Answer Section wrapper
    st.markdown(f"""
    <div class="response-card shadow-sm" style="{card_style}">
        <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-2" style="background: rgba(0,0,0,0.01);">
            <div class="d-flex align-items-center gap-2">
                <span class="badge" style="background-color: {color}; color: white; font-size: 0.8rem; padding: 5px 10px;">{res_data['model']}</span>
                <span class="text-muted" style="font-size:0.8rem;">{side_icon} <strong>{side.upper()}</strong></span>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="badge {header_badge}">{kb_name}</span>
                <span class="badge bg-light text-dark border-0 text-muted" style="font-size: 0.75rem;"><i class="bi bi-clock"></i> {res_data['time']:.2f}s</span>
            </div>
        </div>
        <div class="card-content" style="font-size: 0.95rem; line-height: 1.6;">
            <div class="text-break" style="margin-top:0px;">{res_data['answer']}</div>
        </div>
    """, unsafe_allow_html=True)
    
    # 2. Citations Section
    if res_data.get("citations"):
        st.markdown(f"<div class='px-3 pb-3'>", unsafe_allow_html=True)
        st.markdown(f"<div class='mb-2 pb-1 border-bottom'><small class='text-muted fw-bold'><i class='bi bi-book'></i> อ้างอิงจาก (Sources)</small></div>", unsafe_allow_html=True)
        for fname, snippet in res_data['citations'].items():
            with st.expander(f"📄 {fname}", expanded=False):
                st.caption(f'"{snippet}"')
        st.markdown("</div>", unsafe_allow_html=True)

    # Footer Cost
    st.markdown(f"""
        <div class="d-flex justify-content-end align-items-center px-3 py-2 bg-light bg-opacity-25 border-top" style="font-size: 0.75rem;">
            <span class="text-muted"><i class="bi bi-cpu"></i> Cost: <strong>{res_data['cost']:.4f} THB</strong></span>
        </div>
    </div>
    """, unsafe_allow_html=True)
