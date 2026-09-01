
import google.generativeai as genai
import os
import streamlit as st
from src.utils import load_secret

# Load Key
try:
    # Try loading from secrets via streamlit logic or env
    api_key = load_secret("GEMINI_API_KEY")
    if not api_key:
        print("❌ API Key not found!")
        exit(1)
        
    genai.configure(api_key=api_key)
    
    print("🔍 Listing Available Models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
            
except Exception as e:
    print(f"❌ Error: {e}")
