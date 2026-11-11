# Vertical Drama Studio — กฎของโปรเจกต์

## เป้าหมาย
ผลิตซีรีส์แนวตั้ง 9:16 ตอนละ 60–120 วินาที ลุคเอเชียสมจริง (ไทยเชื้อสายจีน) พากย์ไทย

## เครื่องมือ (Claude ห้ามเปลี่ยนเองโดยไม่ถาม)
- Keyframe: ChatGPT (คนทำมือ) หรือ ComfyUI Qwen-Image-Edit (อัตโนมัติ) — ดู scripts/keyframe.py
- Video: ComfyUI API ที่ http://127.0.0.1:8188 — Wan 2.2 I2V (action), InfiniteTalk (talk)
- Voice: F5-TTS-THAI — scripts/tts.py
- Edit: Mac (DaVinci/CapCut) — Claude แค่เตรียมไฟล์ + ซับ .srt

## โครงสร้างไฟล์
- characters/<name>/bible.md, sheet.png, voice_ref.wav, lora.safetensors
- episodes/epXX/script.md, shotlist.csv, shots/, audio/, clips/, out/
- workflows/*.json = ComfyUI workflow แบบ API format (ห้ามแก้ด้วยมือ ให้แก้ผ่าน scripts)

## กฎความสม่ำเสมอ (สำคัญที่สุด)
1. คำบรรยายหน้าตาใช้ "Locked Description" จาก bible.md เท่านั้น ห้ามแต่งเพิ่ม
2. ทุกช็อตตัวละครต้องเป็น Image-to-Video จาก keyframe ที่อนุมัติแล้ว
3. เสียง: voice_ref.wav + seed จาก bible.md ทุกครั้ง
4. ช็อตละ 3–5 วินาที, พูดคนเดียวต่อช็อต, ไม่เกิน 1 ประโยค
5. ช็อตแรกต้องเป็นฮุก ช็อตสุดท้ายต้องค้าง

## กฎประหยัดโทเค็น
- ห้ามอ่านไฟล์ภาพ/วิดีโอ/เสียง/โฟลเดอร์ models ทั้งก้อน — ใช้สคริปต์รายงานผลเป็นข้อความสั้น
- งานซ้ำ (เรนเดอร์ทั้งตอน) ให้รัน `python scripts/run_episode.py epXX` ทีเดียว ไม่สั่งทีละช็อต
- อัปเดตสถานะใน shotlist.csv คอลัมน์ status แทนการเล่าในแชท
- ตอบสั้น สรุปเป็นตาราง ไม่ต้องอธิบายซ้ำ

## ห้ามทำ
- ห้ามลบไฟล์ใน characters/ หรือ out/
- ห้ามใช้หน้าคนจริง/ดารา
