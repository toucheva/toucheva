/**
 * รวมผลลัพธ์จาก vite build ให้เป็นไฟล์ HTML ไฟล์เดียว
 * ฝัง CSS และ JS ลงในไฟล์ทั้งหมด เปิดจากเครื่องได้เลยโดยไม่ต้องมีเซิร์ฟเวอร์
 *
 * ได้สองไฟล์:
 *   dist-single/rai-dee.html        ไฟล์เต็ม ดับเบิลคลิกเล่นได้
 *   dist-single/rai-dee.body.html   เนื้อหาอย่างเดียว สำหรับเอาไปฝังในหน้าอื่น
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const out = 'dist-single';
mkdirSync(out, { recursive: true });

let html = readFileSync(join(dist, 'index.html'), 'utf8');
const assets = readdirSync(join(dist, 'assets'));

const cssFile = assets.find((f) => f.endsWith('.css'));
const jsFile = assets.find((f) => f.endsWith('.js'));
if (!cssFile || !jsFile) throw new Error('ไม่พบไฟล์ที่ build ไว้ — รัน npm run build ก่อน');

const css = readFileSync(join(dist, 'assets', cssFile), 'utf8');
const js = readFileSync(join(dist, 'assets', jsFile), 'utf8');

// แทนที่ลิงก์ไปยังไฟล์ภายนอกด้วยเนื้อหาจริง
html = html.replace(
  new RegExp(`<link[^>]*rel="stylesheet"[^>]*href="[^"]*${cssFile}"[^>]*>`),
  `<style>\n${css}\n</style>`,
);
html = html.replace(
  new RegExp(`<script[^>]*src="[^"]*${jsFile}"[^>]*></script>`),
  `<script type="module">\n${js}\n</script>`,
);

if (html.includes('assets/')) throw new Error('ยังมีลิงก์ไปไฟล์ภายนอกเหลืออยู่');

writeFileSync(join(out, 'rai-dee.html'), html);

// เวอร์ชันเนื้อหาอย่างเดียว: ตัด doctype/html/head/body ออก แต่ต้องเก็บ title link และ style ทั้งก้อนไว้
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));

// ดึงทั้งบล็อก ไม่ใช่กรองทีละบรรทัด ไม่งั้นเนื้อใน <style> จะหายไปทั้งหมด
const blocks = [
  ...(head.match(/<title>[\s\S]*?<\/title>/g) ?? []),
  ...(head.match(/<link\b[^>]*>/g) ?? []),
  ...(head.match(/<style>[\s\S]*?<\/style>/g) ?? []),
];
// vite วาง <script type="module"> ไว้ใน <head> จึงต้องดึงออกมาต่อท้ายเนื้อหา
// สคริปต์ต้องอยู่หลังมาร์กอัป ไม่งั้นหา element ไม่เจอตอนรัน
const headScripts = head.match(/<script\b[^>]*>[\s\S]*?<\/script>/g) ?? [];
const bodyScripts = body.match(/<script\b[^>]*>[\s\S]*?<\/script>/g) ?? [];
const markup = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').trim();
const bodyOnly = `${blocks.join('\n')}\n${markup}\n${[...headScripts, ...bodyScripts].join('\n')}\n`;
if (!/<style>[\s\S]{500,}<\/style>/.test(bodyOnly)) throw new Error('สไตล์หายไปจากไฟล์เนื้อหา');
if (!/<script type="module">[\s\S]{500,}<\/script>/.test(bodyOnly)) throw new Error('สคริปต์หายไปจากไฟล์เนื้อหา');
writeFileSync(join(out, 'rai-dee.body.html'), bodyOnly);

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} kB`;
console.log(`✓ dist-single/rai-dee.html       ${kb(html)}  (เปิดจากเครื่องได้เลย)`);
console.log(`✓ dist-single/rai-dee.body.html  ${kb(readFileSync(join(out, 'rai-dee.body.html'), 'utf8'))}  (เนื้อหาอย่างเดียว)`);
