# Prompt Templates

## 1) ChatGPT — Character Sheet (ทำครั้งเดียวต่อตัวละคร)
```
Create a character reference sheet on a plain white background, photorealistic, cinematic lighting.
Character: [LOCKED DESCRIPTION]
Outfit: [OUTFIT A]
Layout in one image: front view, 3/4 view, side profile, full body standing,
and 3 close-up expressions (neutral, angry, crying). Same face in every panel. No text.
```

## 2) ChatGPT — คีย์เฟรมแต่ละช็อต (แนบ sheet.png ทุกครั้ง)
```
Use the attached character sheet. Keep the face, hair and mole exactly identical.
Vertical 9:16 photorealistic film still, shot on 35mm, shallow depth of field.
Character: [LOCKED DESCRIPTION], wearing [OUTFIT].
Scene: [สถานที่ + เวลา + แสง]
Action/emotion: [ท่าทาง + อารมณ์]
Camera: [close-up / medium / wide], eye level.
No text, no watermark.
```
เคล็ดลับ: ถ้ามี 2 ตัวละครในภาพ แนบ sheet ทั้งสองและระบุซ้าย/ขวาชัดเจน

## 3) ChatGPT — แตกบทเป็น Shot list
```
แปลงบทตอนนี้เป็นตาราง CSV คอลัมน์:
shot,duration_sec,type(talk/action),character,outfit,camera,scene,action_emotion,dialogue_th
ข้อกำหนด: ทุกช็อต 3–5 วินาที, ช็อตแรกต้องเป็นฮุกแรง, ช็อตสุดท้ายจบค้าง,
ช็อตพูด 1 ช็อตมีคนพูดคนเดียว ไม่เกิน 1 ประโยค
```

## 4) Wan 2.2 I2V (ช็อตไม่พูด) — prompt เน้นการเคลื่อนไหว ไม่ต้องบรรยายหน้า
```
[mali_char] slowly turns her head toward the door, eyes widening in shock,
subtle hair movement, static camera, cinematic, realistic motion
```
Negative: `deformed face, extra fingers, morphing, flicker, blurry, text, watermark`

## 5) InfiniteTalk (ช็อตพูด)
```
A woman speaking emotionally to someone off-camera, natural head movement, static camera
```
อินพุต: คีย์เฟรม + ไฟล์เสียงของประโยคนั้น
