# 📚 คลังข้อมูล AI ศาลปกครอง — Catalog

*สร้างเมื่อ: 2026-06-06 02:01*

---
## 📊 สถิติรวม

| รายการ | จำนวน |
|--------|-------|
| ไฟล์ต้นฉบับใน S3 | 560 ไฟล์ |
| RAG Chunks ทั้งหมด | 1,014 chunks |
| Knowledge Graph Entities | 24 nodes |
| Chunk Size | 500 tokens (~350 คำ) |

---
## 📁 RAG Files

| ไฟล์ | แหล่งข้อมูล | เอกสาร | คำอธิบาย |
|------|------------|--------|---------|
| `01_kb_docs_chunks.jsonl` | `kb_docs/` | 18 | เอกสารกฎหมายและขั้นตอน |
| `02_faq_pairs.jsonl` | `faq/` | 509 | ถาม-ตอบ FAQ |
| `03_law_chunks.jsonl` | `root/*.txt/*.doc` | 7 | ข้อมูลกฎหมายหลัก |
| `04_manual_merged.jsonl` | `Administrative litigation manual_text/` | 236 | คู่มือดำเนินคดีแยกหน้า |
| `05_qa_media.jsonl` | `QA_FB/` | 158 | ถาม-ตอบจากสื่อ |

---
## 🗺️ Knowledge Graph

| Entity Type | จำนวน | ไฟล์ |
|-------------|-------|------|
| Courts (ศาลปกครอง) | 9 | `knowledge_graph/entities/courts.json` |
| Laws (กฎหมาย) | 4 | `knowledge_graph/entities/laws.json` |
| Procedures (ขั้นตอน) | 6 | `knowledge_graph/entities/procedures.json` |
| Case Types (ประเภทคดี) | 5 | `knowledge_graph/entities/case_types.json` |
| Relations | 27 | `knowledge_graph/knowledge_graph.json` |

---
## 💡 การใช้งาน

### สำหรับ RAG Pipeline
```python
import json

# Load all chunks
chunks = []
for fname in ['01_kb_docs_chunks.jsonl', '02_faq_pairs.jsonl', '03_law_chunks.jsonl',
              '04_manual_merged.jsonl', '05_qa_media.jsonl']:
    with open(f'output/rag_ready/{fname}', 'r', encoding='utf-8') as f:
        chunks.extend([json.loads(line) for line in f])

# Each chunk has: id, source, category, title, text, metadata
print(f'Total chunks: {len(chunks)}')
```

### สำหรับ Knowledge Graph
```python
with open('output/knowledge_graph/knowledge_graph.json', 'r', encoding='utf-8') as f:
    kg = json.load(f)

courts = kg['entities']['courts']
laws = kg['entities']['laws']
relations = kg['relations']
```