import concurrent.futures
import json
import random
import re
import sqlite3
import sys
import time
import uuid
from datetime import datetime

from src.config import KNOWLEDGE_BASES
from src.services import call_single_model, get_aws_runtime, retrieve_context


DB_PATH = "/app/data/logs.db"
TEST_RUN_ID = f"SYNTHETIC-{datetime.now():%Y%m%d-%H%M%S}-{uuid.uuid4().hex[:6]}"
random.seed(20260720)

ROLES = [
    "ประชาชน", "ทนายความ", "นิติกร", "เจ้าหน้าที่รัฐ", "นักศึกษา",
    "อาจารย์", "ผู้ประกอบการ", "ข้าราชการบำนาญ", "ผู้บริหาร", "สื่อมวลชน",
]
AGENCIES = [
    "บุคคลทั่วไป", "องค์กรปกครองส่วนท้องถิ่น", "กระทรวงมหาดไทย",
    "มหาวิทยาลัย", "สำนักงานกฎหมาย", "รัฐวิสาหกิจ", "บริษัทเอกชน",
    "โรงพยาบาลของรัฐ", "สถานศึกษา", "หน่วยงานอื่นๆ",
]
PROVINCES = [
    "เชียงใหม่", "เชียงราย", "สงขลา", "ภูเก็ต", "นครราชสีมา",
    "ขอนแก่น", "พิษณุโลก", "ระยอง", "อุดรธานี", "อุบลราชธานี",
    "เพชรบุรี", "นครสวรรค์", "สุพรรณบุรี", "ยะลา", "กรุงเทพมหานคร",
    "นนทบุรี", "ปทุมธานี", "ชลบุรี", "สุราษฎร์ธานี", "นครศรีธรรมราช",
]
TEMPLATES = [
    "ประชาชนในจังหวัด{province}ต้องติดต่อศาลปกครองใด และมีช่องทางติดต่ออะไรบ้าง",
    "หากได้รับคำสั่งทางปกครองที่เห็นว่าไม่ชอบด้วยกฎหมาย มีหลักเกณฑ์การฟ้องคดีอย่างไร",
    "การยื่นฟ้องคดีปกครองทางอิเล็กทรอนิกส์มีขั้นตอนทั่วไปอย่างไร",
    "คดีพิพาทเกี่ยวกับการละเลยต่อหน้าที่ของหน่วยงานรัฐอยู่ในอำนาจศาลปกครองหรือไม่",
    "ระยะเวลาฟ้องคดีปกครองมีหลักเกณฑ์ทั่วไปอย่างไร และเริ่มนับเมื่อใด",
    "ผู้ฟ้องคดีปกครองจำเป็นต้องมีทนายความหรือไม่",
    "การขอทุเลาการบังคับตามคำสั่งทางปกครองหมายถึงอะไร",
    "เอกสารเบื้องต้นที่ใช้ยื่นคำฟ้องคดีปกครองมีอะไรบ้าง",
    "หากหน่วยงานรัฐไม่ตอบหนังสือร้องเรียน ประชาชนมีช่องทางตามกฎหมายปกครองอย่างไร",
    "ค่าธรรมเนียมศาลปกครองมีหลักเกณฑ์อย่างไร และกรณีใดอาจได้รับยกเว้น",
]


def make_cases():
    cases = []
    for i in range(100):
        template = TEMPLATES[i % len(TEMPLATES)]
        province = PROVINCES[(i * 7) % len(PROVINCES)]
        cases.append({
            "index": i + 1,
            "username": f"[SYNTHETIC] {ROLES[i % len(ROLES)]} - {AGENCIES[(i * 3) % len(AGENCIES)]}",
            "question": template.format(province=province),
        })
    return cases


def parse_json(text):
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("judge did not return JSON")
    return json.loads(match.group(0))


def judge_pair(question, context, left_answer, right_answer):
    prompt = f"""
ประเมินคำตอบสองคำตอบจากหลักฐานที่ให้ โดยใช้คะแนนจำนวนเต็ม 1-5 เท่านั้น
มิติ: accuracy, completeness, detail, usefulness, satisfaction
ห้ามให้คะแนนตามชื่อโมเดล ให้พิจารณาความถูกต้อง การไม่แต่งชื่อศาล/กฎหมาย
ความครบถ้วน การอ้างอิง เหตุผล ความตรงประเด็น และประโยชน์ต่อประชาชน
ตอบ JSON เท่านั้น:
{{"left":{{"accuracy":1,"completeness":1,"detail":1,"usefulness":1,"satisfaction":1}},
"right":{{"accuracy":1,"completeness":1,"detail":1,"usefulness":1,"satisfaction":1}},
"comment_left":"...","comment_right":"..."}}

คำถาม: {question}
หลักฐาน:
{context}
คำตอบซ้าย:
{left_answer}
คำตอบขวา:
{right_answer}
"""
    runtime = get_aws_runtime()
    response = runtime.converse(
        modelId="us.anthropic.claude-sonnet-4-6",
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={"maxTokens": 900, "temperature": 0.0},
    )
    return parse_json(response["output"]["message"]["content"][0]["text"])


def run_case(case):
    started = time.time()
    kb_id = next(iter(KNOWLEDGE_BASES.values()))
    context, _ = retrieve_context(case["question"], kb_id)
    left = call_single_model("Gemini", case["question"], context, {}, temperature=0.1)
    right = call_single_model("Claude 4.6 Sonnet", case["question"], context, {}, temperature=0.1)
    scores = judge_pair(case["question"], context, left["answer"], right["answer"])
    return {
        **case,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "kb": next(iter(KNOWLEDGE_BASES.keys())),
        "left": left,
        "right": right,
        "scores": scores,
        "elapsed": time.time() - started,
    }


def feedback_string(score, comment):
    return (
        f"[Acc:{score['accuracy']} Comp:{score['completeness']} "
        f"Det:{score['detail']} Use:{score['usefulness']} "
        f"Sat:{score['satisfaction']}] Suggestion: {comment}"
    )


def save_result(result):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    left_score = result["scores"]["left"]
    right_score = result["scores"]["right"]
    cur.execute("""
        INSERT INTO logs (
            timestamp, username, question,
            kb_left, model_left, answer_left, feedback_left, cost_left, time_left,
            kb_right, model_right, answer_right, feedback_right, cost_right, time_right,
            is_synthetic, test_run_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    """, (
        result["timestamp"], result["username"], result["question"],
        result["kb"], "Gemini", result["left"]["answer"],
        feedback_string(left_score, result["scores"].get("comment_left", "")),
        result["left"].get("cost", 0), result["left"].get("time", 0),
        result["kb"], "Claude", result["right"]["answer"],
        feedback_string(right_score, result["scores"].get("comment_right", "")),
        result["right"].get("cost", 0), result["right"].get("time", 0),
        TEST_RUN_ID,
    ))
    log_id = cur.lastrowid
    for side, model, score, comment in (
        ("left", "Gemini", left_score, result["scores"].get("comment_left", "")),
        ("right", "Claude", right_score, result["scores"].get("comment_right", "")),
    ):
        cur.execute("""
            INSERT INTO feedback_evaluations (
                log_id, response_side, model_name, score_accuracy,
                score_completeness, score_detail, score_usefulness,
                score_satisfaction, comment, rubric_version, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synthetic-judge-v1', ?)
        """, (
            log_id, side, model, score["accuracy"], score["completeness"],
            score["detail"], score["usefulness"], score["satisfaction"],
            comment, result["timestamp"],
        ))
    conn.commit()
    conn.close()


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    columns = {row[1] for row in cur.execute("PRAGMA table_info(logs)")}
    if "is_synthetic" not in columns:
        cur.execute("ALTER TABLE logs ADD COLUMN is_synthetic INTEGER NOT NULL DEFAULT 0")
    if "test_run_id" not in columns:
        cur.execute("ALTER TABLE logs ADD COLUMN test_run_id TEXT")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_logs_synthetic_run ON logs(is_synthetic, test_run_id)")
    conn.commit()
    conn.close()

    print(f"TEST_RUN_ID={TEST_RUN_ID}", flush=True)
    failures = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        future_map = {executor.submit(run_case, case): case for case in make_cases()}
        completed = 0
        for future in concurrent.futures.as_completed(future_map):
            case = future_map[future]
            try:
                result = future.result()
                save_result(result)
                completed += 1
                print(f"OK {completed}/100 persona={case['index']} elapsed={result['elapsed']:.1f}s", flush=True)
            except Exception as exc:
                failures += 1
                print(f"ERROR persona={case['index']} {exc}", file=sys.stderr, flush=True)
    print(f"DONE completed={completed} failures={failures} run={TEST_RUN_ID}", flush=True)


if __name__ == "__main__":
    main()
