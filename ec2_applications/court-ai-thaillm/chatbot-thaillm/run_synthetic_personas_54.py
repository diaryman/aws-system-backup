import concurrent.futures
import random
import sqlite3
import time
import uuid
from datetime import datetime

from src.config import KNOWLEDGE_BASES, MODELS
from src.services import call_single_model, retrieve_context

DB_PATH = "/app/data/court_ai.db"
RUN_ID = f"SYNTHETIC-EXEC-{datetime.now():%Y%m%d-%H%M%S}-{uuid.uuid4().hex[:6]}"
random.seed(54016020296)

POSITIONS = ["ตุลาการศาลปกครอง", "พนักงานคดีปกครอง", "เจ้าหน้าที่ศาลปกครอง"]
LEVELS = ["ปฏิบัติการ", "ชำนาญการ", "ชำนาญการพิเศษ", "เชี่ยวชาญ"]
AGENCIES = [
    "ศาลปกครอง", "สำนักงานศาลปกครองสูงสุด", "สำนักงานศาลปกครองกลาง",
    "สำนักงานศาลปกครองในภูมิภาค", "สำนักวิจัยและวิชาการ",
    "สำนักส่งเสริมงานคดีปกครอง",
]
PROVINCES = [
    "เชียงใหม่", "เชียงราย", "สงขลา", "ภูเก็ต", "นครราชสีมา", "ขอนแก่น",
    "พิษณุโลก", "ระยอง", "อุดรธานี", "อุบลราชธานี", "เพชรบุรี",
    "นครสวรรค์", "สุพรรณบุรี", "ยะลา", "กรุงเทพมหานคร", "นนทบุรี",
    "ปทุมธานี", "ชลบุรี", "สุราษฎร์ธานี", "นครศรีธรรมราช",
]
QUESTIONS = [
    "จังหวัด{province}อยู่ในเขตอำนาจของศาลปกครองใด และติดต่อได้อย่างไร",
    "หลักเกณฑ์ทั่วไปในการฟ้องคดีเมื่อได้รับคำสั่งทางปกครองที่ไม่ชอบด้วยกฎหมายคืออะไร",
    "การยื่นคำฟ้องคดีปกครองทางอิเล็กทรอนิกส์มีขั้นตอนอย่างไร",
    "กรณีหน่วยงานรัฐละเลยต่อหน้าที่สามารถเป็นคดีปกครองได้หรือไม่",
    "ระยะเวลาฟ้องคดีปกครองมีหลักเกณฑ์และข้อยกเว้นอย่างไร",
    "ผู้ฟ้องคดีปกครองจำเป็นต้องแต่งตั้งทนายความหรือไม่",
    "การขอทุเลาการบังคับตามคำสั่งทางปกครองมีความหมายและหลักเกณฑ์อย่างไร",
    "เอกสารเบื้องต้นที่ใช้ยื่นคำฟ้องคดีปกครองมีอะไรบ้าง",
    "หากหน่วยงานรัฐไม่ตอบหนังสือร้องเรียน มีหลักเกณฑ์ทางกฎหมายปกครองอย่างไร",
    "ค่าธรรมเนียมศาลปกครองและการขอยกเว้นมีหลักเกณฑ์อย่างไร",
]
MODEL_ORDER = [
    "OpenThaiGPT 8B v7.2", "Pathumma Qwen3 8B", "Typhoon-S 8B", "THaLLE 8B",
]
BASE_SCORES = {
    "OpenThaiGPT 8B v7.2": (5, 5, 4, 5, 5),
    "Pathumma Qwen3 8B": (4, 4, 4, 5, 4),
    "Typhoon-S 8B": (4, 4, 3, 4, 4),
    "THaLLE 8B": (3, 3, 3, 4, 3),
}
COMMENTS = {
    "OpenThaiGPT 8B v7.2": "คำตอบมีความถูกต้อง ครบถ้วน อธิบายเป็นลำดับ และนำไปใช้ทำความเข้าใจได้ดี",
    "Pathumma Qwen3 8B": "คำตอบตรงประเด็นและมีประโยชน์ แต่รายละเอียดหรือแหล่งอ้างอิงบางส่วนยังเพิ่มได้",
    "Typhoon-S 8B": "คำตอบเข้าใจง่ายในภาพรวม แต่เหตุผลและการอ้างอิงยังไม่ละเอียดสม่ำเสมอ",
    "THaLLE 8B": "คำตอบให้แนวทางพื้นฐานได้ แต่ยังขาดรายละเอียด ความครบถ้วน และหลักฐานสนับสนุนบางประเด็น",
}


def persona(index):
    pos = POSITIONS[index % len(POSITIONS)]
    if pos == "ตุลาการศาลปกครอง":
        return f"{pos} - ศาลปกครอง"
    level = LEVELS[(index // 3) % len(LEVELS)]
    agency = AGENCIES[(index * 5 + index // 6) % len(AGENCIES)]
    return f"{pos} ({level}) - {agency}"


def adjusted_scores(model, index):
    base = list(BASE_SCORES[model])
    # Small deterministic variation while preserving the requested aggregate order.
    if index % 5 == 0:
        base[(index // 5) % 5] = max(1, base[(index // 5) % 5] - 1)
    return base


def ask_model(model, question, context, citations):
    return call_single_model(model, question, context, citations, temperature=0.2)


def save_case(index, username, question, responses):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cur.execute("""
        INSERT INTO conversations (
            timestamp, username, question, knowledge_base, user_comment,
            is_synthetic, test_run_id
        ) VALUES (?, ?, ?, ?, ?, 1, ?)
    """, (
        timestamp, username, question, next(iter(KNOWLEDGE_BASES.keys())),
        f"[ผลจำลองระบบทดสอบ] Persona {index:03d} | {RUN_ID}", RUN_ID,
    ))
    conversation_id = cur.lastrowid
    for model in MODEL_ORDER:
        response = responses[model]
        cur.execute("""
            INSERT INTO responses (conversation_id, model_name, answer, cost, response_time)
            VALUES (?, ?, ?, ?, ?)
        """, (
            conversation_id, model, response.get("answer", ""),
            response.get("cost", 0.0), response.get("time", 0.0),
        ))
        response_id = cur.lastrowid
        scores = adjusted_scores(model, index)
        cur.execute("""
            INSERT INTO feedback (
                response_id, feedback_type, score_accuracy, score_completeness,
                score_detail, score_usefulness, score_satisfaction, comment, created_at
            ) VALUES (?, 'synthetic_test', ?, ?, ?, ?, ?, ?, ?)
        """, (response_id, *scores, COMMENTS[model], timestamp))
    conn.commit()
    conn.close()


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    columns = {row[1] for row in cur.execute("PRAGMA table_info(conversations)")}
    if "is_synthetic" not in columns:
        cur.execute("ALTER TABLE conversations ADD COLUMN is_synthetic INTEGER NOT NULL DEFAULT 0")
    if "test_run_id" not in columns:
        cur.execute("ALTER TABLE conversations ADD COLUMN test_run_id TEXT")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_conversations_test_run ON conversations(is_synthetic, test_run_id)")
    conn.commit()
    conn.close()

    print(f"TEST_RUN_ID={RUN_ID}", flush=True)
    kb_id = next(iter(KNOWLEDGE_BASES.values()))
    for i in range(100):
        question = QUESTIONS[i % len(QUESTIONS)].format(province=PROVINCES[(i * 7) % len(PROVINCES)])
        started = time.time()
        context, citations = retrieve_context(question, kb_id)
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            future_map = {
                executor.submit(ask_model, model, question, context, citations): model
                for model in MODEL_ORDER
            }
            responses = {future_map[f]: f.result() for f in concurrent.futures.as_completed(future_map)}
        save_case(i + 1, persona(i), question, responses)
        print(f"OK {i + 1}/100 elapsed={time.time() - started:.1f}s", flush=True)
    print(f"DONE completed=100 failures=0 run={RUN_ID}", flush=True)


if __name__ == "__main__":
    main()
