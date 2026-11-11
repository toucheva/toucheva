# ขั้นตอนตั้งโปรเจกต์ใน Claude Code

## ไฟล์อะไรอยู่ที่ไหน
| ไฟล์ | หน้าที่ | Claude โหลดเมื่อไหร่ |
|---|---|---|
| `CLAUDE.md` (ราก) | กฎหลักของโปรเจกต์ (แทน "agents.md") | ทุกครั้งที่เริ่มเซสชัน → **เขียนให้สั้น** |
| `.claude/settings.json` | โมเดลเริ่มต้น + สิทธิ์อนุญาต/ห้าม | อัตโนมัติ |
| `.claude/agents/*.md` | ผู้ช่วยย่อย (subagent) แยกงาน กำหนดโมเดลแยกได้ | เมื่อถูกเรียก |
| `.claude/commands/*.md` | คำสั่งลัด เช่น `/new-episode ep01` | เมื่อพิมพ์ `/` |
| `.claude/skills/*/SKILL.md` | ความรู้เฉพาะทาง โหลดเฉพาะตอนจำเป็น | เมื่อเกี่ยวข้อง → ประหยัดโทเค็น |

## เลือกโมเดล
- **Sonnet 5.5 = ค่าเริ่มต้น** (ตั้งใน settings.json) — เขียนบท เขียนสคริปต์ คุมงาน พอเหลือเฟือ
- **Haiku 5.5 = subagent งานรัน/ตรวจ** (render-runner, qc-checker) — ถูกสุด
- **Opus 5.5 = เฉพาะ** วาง Series Bible ทั้งซีซัน หรือดีบักที่ Sonnet แก้ไม่ได้ → พิมพ์ `/model opus` แล้วสลับกลับ `/model sonnet`

## ขั้นตอน (ทำบน PC 5090 ที่ติดตั้ง ComfyUI แล้ว)
1. คัดลอกโฟลเดอร์ `claude-project-template` ไปเป็นโปรเจกต์ใหม่ → `git init` → เปิด `claude` ในโฟลเดอร์นั้น
2. ใส่ workflow: เปิด ComfyUI → โหลด workflow Wan 2.2 I2V และ InfiniteTalk ที่รันผ่านแล้ว → **Export (API)** → บันทึกเป็น `workflows/wan22_i2v.json`, `workflows/infinitetalk.json`
3. (Opus) สั่ง: `ช่วยเขียน series/bible.md แนวตระกูลเจ้าสัวไทยเชื้อสายจีน 30 ตอน และ bible ตัวละครหลัก 3 ตัวจาก TEMPLATE`
4. (Sonnet) สั่ง: `อ่าน scripts/README.md และ skill comfy-render แล้วเขียนสคริปต์ทั้ง 5 ตัว ทดสอบกับช็อตเดียวก่อน`
5. ทำตัวละคร: เจน Character Sheet ใน ChatGPT → วางใน `characters/<name>/sheet.png` + อัด `voice_ref.wav`
6. `/new-episode ep01` → ได้บท + shotlist + รายการ prompt keyframe
7. เจน keyframe ใน ChatGPT วางที่ `episodes/ep01/shots/sNN.png` (หรือรัน keyframe.py ให้อัตโนมัติ)
8. `/render ep01` → เสียง + วิดีโอทุกช็อต + QC อัตโนมัติ
9. ย้าย `episodes/ep01/clips` + `.srt` ไป Mac ตัดต่อ
10. ทำซ้ำ 6–9 ทุกตอน

## เทคนิคประหยัดโทเค็น
- งานหนักอยู่ในสคริปต์ Python → Claude แค่สั่งรันแล้วอ่านผลสั้น ๆ
- `/clear` เมื่อขึ้นตอนใหม่ (ทุกอย่างที่ต้องรู้อยู่ในไฟล์ ไม่ต้องอยู่ในแชท)
- `/compact` เมื่อแชทยาว
- ใช้ subagent → log ยาวไม่เข้ามาในบริบทหลัก
- ห้ามสั่ง "ดูภาพทุกช็อต" — ให้ดูเฉพาะช็อตที่ QC ไม่ผ่าน

## ข้อจำกัดที่ต้องรู้
- **ChatGPT แบบสมาชิกสั่งอัตโนมัติจาก Claude Code ไม่ได้** (ไม่มี API) — ขั้นที่ 7 ต้องทำมือ
  ถ้าอยากอัตโนมัติ 100%: ใช้ Qwen-Image-Edit / Flux Kontext บน 5090 (ฟรี) โดยป้อน sheet.png เป็นภาพอ้างอิง
  หรือใช้ OpenAI API (เสียเงินแยกต่อภาพ)
- ตรวจหน้าตัวละครยังต้องใช้ตาคน — ให้ AI คัดกรองเบื้องต้นได้ แต่ตัดสินใจสุดท้ายเอง
