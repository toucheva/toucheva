---
name: comfy-render
description: วิธีส่งงานไป ComfyUI API (Wan 2.2 I2V, InfiniteTalk) จาก shotlist ใช้เมื่อต้องแก้หรือเพิ่ม workflow
---
- Workflow เก็บใน workflows/*.json (Export (API) จาก ComfyUI)
- scripts/comfy.py: โหลด json → แทนค่า node ตาม map ใน workflows/nodemap.json (image, audio, prompt, seed, frames) → POST /prompt → รอ /history → ดาวน์โหลดผล
- type=talk → workflows/infinitetalk.json ; type=action → workflows/wan22_i2v.json
- ความละเอียดเริ่มต้น 480x832, 81 เฟรม (~5 วิ ที่ 16fps); อัปสเกลทีหลัง
