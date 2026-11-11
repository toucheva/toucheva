สคริปต์ที่ให้ Claude Code เขียนในขั้นที่ 4 ของคู่มือ:
- comfy.py        ส่ง workflow ไป ComfyUI API แล้วรอผล
- tts.py          เจนเสียงทุกบรรทัด dialogue ใน shotlist ด้วย F5-TTS-THAI
- keyframe.py     (ตัวเลือก) เจน keyframe อัตโนมัติด้วย Qwen-Image-Edit ใน ComfyUI
- run_episode.py  tts → render ทุกช็อต → อัปเดต status
- qc.py           ตรวจไฟล์ครบ/ความยาว/ทำ .srt
