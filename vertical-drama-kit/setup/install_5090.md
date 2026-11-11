# ติดตั้งบน PC RTX 5090 32GB

> RTX 50 ซีรีส์ต้องใช้ PyTorch ที่รองรับ CUDA 12.8+ — ComfyUI Portable รุ่นล่าสุดรองรับแล้ว

## Windows (ง่ายสุด)
1. อัปเดตไดรเวอร์ NVIDIA ล่าสุด
2. ดาวน์โหลด **ComfyUI Portable (NVIDIA)** จาก github.com/comfyanonymous/ComfyUI/releases แตกไฟล์
3. ติดตั้ง **ComfyUI-Manager** (มีมาให้ในรุ่นใหม่) → ใช้ Manager ติดตั้ง custom nodes:
   - `ComfyUI-WanVideoWrapper` (kijai) — Wan 2.2, InfiniteTalk
   - `ComfyUI-VideoHelperSuite` — โหลด/บันทึกวิดีโอ
   - `ComfyUI-KJNodes`
   - `ComfyUI-LatentSyncWrapper` (ตัวเลือก)
4. โหลดโมเดลผ่าน Manager → Model Manager หรือจาก Hugging Face:
   - Wan 2.2 I2V A14B (high + low noise) **fp8_scaled** → `models/diffusion_models/`
   - Wan 2.1 VAE → `models/vae/`
   - umt5_xxl fp8 text encoder → `models/text_encoders/`
   - Wan 2.2 Lightning/LightX2V LoRA (4-step) → `models/loras/`
   - InfiniteTalk (Wan 2.1 base + InfiniteTalk weights + wav2vec2) — ตามหน้า WanVideoWrapper
5. เปิด workflow ตัวอย่างจาก `custom_nodes/ComfyUI-WanVideoWrapper/example_workflows/`

## เสียงพากย์ไทย: F5-TTS-THAI
```bash
python -m venv f5env && f5env\Scripts\activate      # Linux: source f5env/bin/activate
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu128
pip install f5-tts-th      # หรือ clone repo F5-TTS-THAI ตามคู่มือใน GitHub
f5-tts_webui               # เปิดหน้าเว็บ ใส่ voice_ref.wav + ข้อความอ้างอิง + บทที่จะพูด
```
ตั้ง: seed คงที่, speed 1.0, ใช้ voice_ref เดิมทุกครั้ง

## เทรน LoRA ตัวละคร: AI Toolkit (ostris)
```bash
git clone https://github.com/ostris/ai-toolkit && cd ai-toolkit
python -m venv venv && venv\Scripts\activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
pip install -r requirements.txt
```
- ข้อมูล: 20–40 ภาพจาก ChatGPT (หลายมุม/แสง/อารมณ์, เสื้อผ้าหลัก), แคปชันขึ้นต้นด้วยคำเรียก เช่น `mali_char`
- 32GB เทรน Wan 2.2 LoRA ได้ (โหมด low VRAM / fp8), ~2000–3000 steps, rank 16–32
- ทดสอบด้วยการเจน 5 ช็อตหันหน้า/ยิ้ม ก่อนใช้จริง

## Linux
ใช้ขั้นตอนเดียวกัน: `git clone ComfyUI`, สร้าง venv, ติดตั้ง torch cu128, `pip install -r requirements.txt`, `python main.py --listen`
แล้วเปิดจาก Mac ผ่าน `http://<ip-pc>:8188` ได้เลย
