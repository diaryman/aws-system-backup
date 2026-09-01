"""Deterministic safety rules for court jurisdiction and public contact answers."""

from __future__ import annotations

import csv
import os
import re


OFFICIAL_CONTACT_URL = "https://www.admincourt.go.th/contact-us"
OFFICIAL_JURISDICTION_URL = (
    "https://www.admincourt.go.th/admincourt/admincourt-jurisdiction"
)
CENTRAL_ADDRESS = (
    "ศาลปกครองและสำนักงานศาลปกครอง เลขที่ 120 หมู่ที่ 3 "
    "ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร 10210"
)
CENTRAL_PHONE = "0 2141 1111"
CALL_CENTER = "1355"
CENTRAL_EMAIL = "saraban@admincourt.go.th"

ALLOWED_COURTS = {
    "ศาลปกครองสูงสุด",
    "ศาลปกครองกลาง",
    "ศาลปกครองเชียงใหม่",
    "ศาลปกครองสงขลา",
    "ศาลปกครองนครราชสีมา",
    "ศาลปกครองขอนแก่น",
    "ศาลปกครองพิษณุโลก",
    "ศาลปกครองระยอง",
    "ศาลปกครองนครศรีธรรมราช",
    "ศาลปกครองอุดรธานี",
    "ศาลปกครองอุบลราชธานี",
    "ศาลปกครองเพชรบุรี",
    "ศาลปกครองนครสวรรค์",
    "ศาลปกครองสุพรรณบุรี",
    "ศาลปกครองภูเก็ต",
    "ศาลปกครองยะลา",
}


def _load_province_map() -> dict[str, str]:
    paths = (
        "/app/data/court_jurisdiction_official.csv",
        os.path.join("data", "court_jurisdiction_official.csv"),
    )
    for path in paths:
        try:
            with open(path, encoding="utf-8-sig", newline="") as handle:
                return {
                    row["จังหวัด"].strip(): row["ศาลปกครองที่มีเขตอำนาจ"].strip()
                    for row in csv.DictReader(handle)
                    if row.get("จังหวัด") and row.get("ศาลปกครองที่มีเขตอำนาจ")
                }
        except OSError:
            continue
    return {}


PROVINCE_TO_COURT = _load_province_map()


def _load_court_contacts() -> dict[str, dict[str, str]]:
    paths = (
        "/app/data/court_contacts_official.csv",
        os.path.join("data", "court_contacts_official.csv"),
    )
    for path in paths:
        try:
            with open(path, encoding="utf-8-sig", newline="") as handle:
                return {
                    row["ชื่อศาล"].strip(): {
                        "address": row.get("ที่อยู่", "").strip(),
                        "phone": row.get("โทรศัพท์", "").strip(),
                        "fax": row.get("โทรสาร", "").strip(),
                        "website": row.get("เว็บไซต์", "").strip(),
                        "verified_at": row.get("วันที่ตรวจสอบ", "").strip(),
                    }
                    for row in csv.DictReader(handle)
                    if row.get("ชื่อศาล")
                }
        except OSError:
            continue
    return {}


COURT_CONTACTS = _load_court_contacts()
CONTACT_TERMS = ("ที่อยู่", "เบอร์", "โทร", "ติดต่อ", "อยู่ที่ไหน", "ตั้งอยู่")
DEADLINE_TERMS = ("ระยะเวลาฟ้อง", "วันสุดท้าย", "กี่วัน", "หมดอายุ", "100 วัน", "90 วัน")
DEFINITIVE_DEADLINE_RE = re.compile(
    r"(ไม่สามารถ.{0,30}ฟ้อง|ฟ้องไม่ได้|หมดสิทธิ|ขาดอายุความ|"
    r"เกินกำหนด.{0,30}(?:จึง|ทำให้).{0,30}(?:ฟ้องไม่ได้|ไม่สามารถ))"
)
COURT_NAME_RE = re.compile(r"ศาลปกครอง[\u0E00-\u0E7F]+")


def _mentioned_province(question: str) -> tuple[str, str] | tuple[None, None]:
    for province, court in PROVINCE_TO_COURT.items():
        if province in question:
            return province, court
    return None, None


def _contact_fallback(province: str | None, court: str | None) -> str:
    lead = ""
    if province and court:
        requested_name = f"ศาลปกครอง{province}"
        if requested_name not in ALLOWED_COURTS and requested_name != court:
            lead = (
                f"ไม่มีศาลที่เปิดทำการในชื่อ “{requested_name}” "
                f"จังหวัด{province}อยู่ในเขตอำนาจของ **{court}**\n\n"
            )
        else:
            lead = f"จังหวัด{province}อยู่ในเขตอำนาจของ **{court}**\n\n"

    contact = COURT_CONTACTS.get(court or "")
    if contact:
        fax_line = (
            f"- โทรสาร: **{contact['fax']}**\n"
            if contact.get("fax") and contact["fax"] != "-"
            else ""
        )
        return (
            lead
            + f"ข้อมูลติดต่อ **{court}** จากเว็บไซต์ศาลปกครอง:\n"
            + f"- ที่อยู่: {contact['address']}\n"
            + f"- โทรศัพท์: **{contact['phone']}**\n"
            + fax_line
            + f"- เว็บไซต์: {contact['website']}\n"
            + f"- ตรวจสอบข้อมูลวันที่: {contact['verified_at']}\n\n"
            + f"แหล่งข้อมูล: {OFFICIAL_JURISDICTION_URL}"
        )

    return (
        lead
        + "ขณะนี้คลังข้อมูลยังไม่มีข้อมูลติดต่อรายศาลที่ยืนยันได้ "
        "จึงไม่ขอระบุข้อมูลโดยคาดเดา\n\n"
        f"ช่องทางทางการที่ยืนยันได้:\n"
        f"- Call Center ศาลปกครอง: **{CALL_CENTER}**\n"
        f"- โทรศัพท์สำนักงานศาลปกครองส่วนกลาง: **{CENTRAL_PHONE}**\n"
        f"- อีเมล: **{CENTRAL_EMAIL}**\n"
        f"- ที่อยู่ส่วนกลาง: {CENTRAL_ADDRESS}\n"
        f"- เว็บไซต์: {OFFICIAL_CONTACT_URL}\n\n"
        f"แหล่งเขตอำนาจ: {OFFICIAL_JURISDICTION_URL}"
    )


def enforce_answer_safety(question: str, answer: str, context: str = "") -> str:
    """Replace unsupported high-risk claims with deterministic safe responses."""
    question = question or ""
    answer = answer or ""
    province, court = _mentioned_province(question)
    if not court:
        court = next((name for name in ALLOWED_COURTS if name in question), None)

    if any(term in question for term in CONTACT_TERMS):
        if court in COURT_CONTACTS:
            return _contact_fallback(province, court)
        named_courts = set(COURT_NAME_RE.findall(answer))
        contains_unapproved = any(name not in ALLOWED_COURTS for name in named_courts)
        contains_unverified_contact = bool(
            re.search(r"(เลขที่\s*\d|โทร(?:ศัพท์)?\s*[:：]?\s*0\d)", answer)
        )
        nonexistent_requested = bool(
            province
            and f"ศาลปกครอง{province}" not in ALLOWED_COURTS
            and f"ศาลปกครอง{province}" in question
        )
        if contains_unapproved or contains_unverified_contact or nonexistent_requested:
            return _contact_fallback(province, court)

    if (
        any(term in question for term in DEADLINE_TERMS)
        and DEFINITIVE_DEADLINE_RE.search(answer)
    ):
        return (
            "หลักทั่วไปตามมาตรา 49 แห่งพระราชบัญญัติจัดตั้งศาลปกครองและ"
            "วิธีพิจารณาคดีปกครอง พ.ศ. 2542 กำหนดระยะเวลาฟ้องโดยทั่วไปภายใน "
            "90 วันนับแต่วันที่รู้หรือควรรู้ถึงเหตุแห่งการฟ้องคดี\n\n"
            "อย่างไรก็ตาม ยังไม่สามารถฟันธงว่ากรณีนี้หมดสิทธิฟ้องหรือระบุ"
            "วันสุดท้ายได้ เพราะต้องตรวจวันรับทราบคำสั่ง ขั้นตอนและผลการอุทธรณ์ "
            "รวมถึงข้อเท็จจริงหรือข้อยกเว้นที่เกี่ยวข้อง โปรดตรวจสอบเอกสารกับ"
            f"เจ้าหน้าที่ผ่าน Call Center ศาลปกครอง {CALL_CENTER}\n\n"
            "คำตอบนี้เป็นหลักเกณฑ์ทั่วไป ไม่ใช่การคำนวณระยะเวลาสำหรับคดีเฉพาะราย"
        )

    return answer
