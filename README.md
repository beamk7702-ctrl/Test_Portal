# Web-Based Student Grade Reporting System

## รันบนเครื่องตัวเอง (ต้องมี Node.js ติดตั้งไว้ก่อน — เช็คด้วย `node -v`, แนะนำ v18 ขึ้นไป)

```bash
npm install
npm run dev
```

จะได้ลิงก์ประมาณ `http://localhost:5173` เปิดในเบราว์เซอร์ได้เลย

ข้อมูลตอนนี้เก็บด้วย `localStorage` ของเบราว์เซอร์ (แทน `window.storage` ที่มีแค่ใน Claude.ai) —
ข้อมูลจะอยู่แค่ในเครื่อง/เบราว์เซอร์เดียว ยังไม่ sync ข้ามอุปกรณ์ จนกว่าจะต่อ Supabase เสร็จ

## Build เป็นไฟล์สำหรับขึ้นเว็บจริง

```bash
npm run build
```

จะได้โฟลเดอร์ `dist/` ที่เป็น static ไฟล์ล้วนๆ เอาโฟลเดอร์นี้ไปวางบนโฮสต์ไหนก็ได้

## วิธี deploy ขึ้นเว็บจริง (ฟรี ง่ายสุด)

### ตัวเลือก A: Vercel
1. สมัคร/ล็อกอิน https://vercel.com ด้วย GitHub
2. Push โปรเจคนี้ขึ้น GitHub repo ใหม่
3. ใน Vercel กด "Add New Project" > เลือก repo นี้ > กด Deploy (Vercel จะรัน `npm run build` ให้เองอัตโนมัติ)
4. ได้ลิงก์ `.vercel.app` ใช้งานได้ทันที

### ตัวเลือก B: Netlify (ลากวาง ไม่ต้องมี Git ก็ได้)
1. รัน `npm run build` ในเครื่องตัวเองก่อน จะได้โฟลเดอร์ `dist/`
2. เข้า https://app.netlify.com/drop แล้วลากโฟลเดอร์ `dist/` ไปวาง
3. ได้ลิงก์ใช้งานได้ทันที

## โครงสร้างไฟล์
```
school-portal-project/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx    <- จุดเริ่มโปรแกรม + polyfill window.storage ด้วย localStorage
    └── App.jsx     <- ตัวแอปทั้งหมด (หน้าล็อกอิน, แดชบอร์ด, ทุกหน้า)
```

## หมายเหตุสำคัญ
เวอร์ชันนี้ยังใช้ข้อมูลจำลอง (mock data) เก็บผ่าน localStorage — เมื่อการต่อ Supabase เสร็จสมบูรณ์
(รอแก้ปัญหาชื่อคอลัมน์ที่มีช่องว่างในตารางก่อน) จะอัปเดต `src/App.jsx` ให้คุยกับ Supabase จริง
แทนที่ localStorage ให้ครับ — ตอนนั้นข้อมูลจะ sync ข้ามอุปกรณ์ได้จริงและมีระบบล็อกอินจริง
