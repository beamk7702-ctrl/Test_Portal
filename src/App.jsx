/* ============================================================
 *  School Portal — Single File Edition
 *  React 18 · localStorage · PDF Export (html2canvas + jsPDF via CDN)
 *  วางไฟล์นี้เป็น src/App.jsx แล้วรันได้เลย ไม่ต้องลง dependency เพิ่ม
 * ============================================================ */
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================
 * 1) CONFIG & UTILS
 * ========================================================== */
const APP_NAME = "วิทยาลัยอาชีวศึกษาเทคนิคบริหารธุรกิจกรุงเทพ";
const APP_SHORT = "BTAC Portal";
const CREDIT_PER_SUBJECT = 1.5;
const STORAGE_KEY = "sp_portal_v1";
const SESSION_KEY = "sp_session_v1";

const SUBJECTS = [
  "คณิตศาสตร์ธุรกิจ",
  "ภาษาไทยเพื่ออาชีพ",
  "ภาษาอังกฤษเทคนิค",
  "การบัญชีเบื้องต้น",
  "คอมพิวเตอร์ธุรกิจ",
  "การตลาดดิจิทัล",
  "วิทยาศาสตร์เพื่อพัฒนาอาชีพ",
  "พลศึกษาเพื่อสุขภาพ",
];
const CLASSES = ["ปวช.2/1", "ปวช.2/2"];

const genId = (p = "id") =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function scoreToPoint(s) {
  const n = Number(s) || 0;
  if (n >= 80) return 4;
  if (n >= 75) return 3.5;
  if (n >= 70) return 3;
  if (n >= 65) return 2.5;
  if (n >= 60) return 2;
  if (n >= 55) return 1.5;
  if (n >= 50) return 1;
  return 0;
}
function thaiDate(d) {
  try {
    return new Date(d).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (n) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const daysUntil = (d) =>
  Math.ceil((new Date(d).getTime() - new Date(todayISO()).getTime()) / 86400000);

function gpaOf(list) {
  if (!list.length) return "-";
  const pts = list.reduce(
    (s, g) => s + scoreToPoint(g.score) * CREDIT_PER_SUBJECT,
    0
  );
  return (pts / (list.length * CREDIT_PER_SUBJECT)).toFixed(2);
}

/* ============================================================
 * 2) SEED DATA
 * ========================================================== */
function buildSeed() {
  const academicYears = [
    { id: "y67", label: "2567" },
    { id: "y68", label: "2568" },
  ];
  const terms = [
    { id: "t671", academicYearId: "y67", termNumber: 1, isCurrent: false },
    { id: "t672", academicYearId: "y67", termNumber: 2, isCurrent: false },
    { id: "t681", academicYearId: "y68", termNumber: 1, isCurrent: true },
  ];

  const names = [
    "ณัฐวุฒิ ใจดี",
    "ปาริชาต ศรีสุข",
    "ธนกฤต วงศ์คำ",
    "พิมพ์ชนก แสงทอง",
    "อริสา บุญมาก",
    "กิตติพงษ์ ทองแท้",
    "ชลธิชา ปานทอง",
    "ภูริช เกียรติก้อง",
  ];
  const students = names.map((n, i) => ({
    id: `stu${i + 1}`,
    studentCode: `68${1001 + i}`,
    name: n,
    class: CLASSES[i % 2],
    number: Math.floor(i / 2) + 1,
    major: "เทคโนโลยีธุรกิจดิจิทัล",
    phone: `08${i}-555-01${i}${i}`,
  }));

  const teachers = [
    { id: "tch1", name: "ครูสมชาย รักเรียน", subject: "คณิตศาสตร์ธุรกิจ", advisorClass: "ปวช.2/1" },
    { id: "tch2", name: "ครูมาลี ใจงาม", subject: "การบัญชีเบื้องต้น", advisorClass: "ปวช.2/2" },
  ];

  const users = [
    { id: "u_admin", username: "admin", password: "1234", role: "admin", name: "ผู้ดูแลระบบ", refId: null },
    { id: "u_t1", username: "teacher", password: "1234", role: "teacher", name: teachers[0].name, refId: "tch1" },
    { id: "u_t2", username: "teacher2", password: "1234", role: "teacher", name: teachers[1].name, refId: "tch2" },
    ...students.map((s) => ({
      id: `u_${s.id}`,
      username: s.studentCode,
      password: "1234",
      role: "student",
      name: s.name,
      refId: s.id,
    })),
  ];

  const grades = [];
  terms.forEach((t, ti) => {
    students.forEach((s, si) => {
      SUBJECTS.forEach((sub, bi) => {
        if (t.isCurrent && bi > 5) return; // เทอมปัจจุบันยังกรอกไม่ครบ
        grades.push({
          id: genId("g"),
          studentId: s.id,
          termId: t.id,
          subject: sub,
          score: 55 + ((si * 7 + bi * 11 + ti * 5) % 41),
        });
      });
    });
  });

  const assignments = [
    { id: "a1", class: "ปวช.2/1", subject: "คณิตศาสตร์ธุรกิจ", title: "แบบฝึกหัดบทที่ 3 ดอกเบี้ยทบต้น", detail: "ทำข้อ 1–10 ส่งเป็นไฟล์ PDF", dueDate: addDays(5), teacherId: "tch1" },
    { id: "a2", class: "ปวช.2/1", subject: "คอมพิวเตอร์ธุรกิจ", title: "ออกแบบโปสเตอร์ Canva", detail: "หัวข้อ: ประชาสัมพันธ์กิจกรรมวิทยาลัย", dueDate: addDays(-2), teacherId: "tch1" },
    { id: "a3", class: "ปวช.2/2", subject: "การบัญชีเบื้องต้น", title: "งบทดลอง ประจำเดือน", detail: "ใช้แบบฟอร์มที่แจกในคาบ", dueDate: addDays(9), teacherId: "tch2" },
  ];

  const submissions = [
    { id: "sub1", assignmentId: "a2", studentId: "stu1", fileName: "poster_ณัฐวุฒิ.pdf", submittedAt: addDays(-3), status: "graded", score: 18 },
  ];

  const attendance = [];
  for (let d = 9; d >= 0; d--) {
    const date = addDays(-d);
    const wd = new Date(date).getDay();
    if (wd === 0 || wd === 6) continue;
    students.forEach((s, si) => {
      const r = (si * 3 + d * 5) % 17;
      attendance.push({
        id: genId("at"),
        date,
        class: s.class,
        studentId: s.id,
        status: r === 0 ? "absent" : r === 5 ? "late" : "present",
      });
    });
  }

  const announcements = [
    { id: "n1", title: "ประกาศปิดภาคเรียนที่ 1/2568", body: "นักเรียนทุกระดับชั้นหยุดเรียนวันที่ 10–20 ตุลาคม 2568", date: addDays(-1) },
    { id: "n2", title: "กิจกรรมกีฬาสี", body: "ซ้อมพิธีเปิดวันศุกร์ที่จะถึงนี้ เวลา 13.00 น. ณ สนามกีฬากลาง", date: addDays(-4) },
  ];

  return {
    academicYears,
    terms,
    students,
    teachers,
    users,
    grades,
    assignments,
    submissions,
    attendance,
    announcements,
    siteContent: { schoolName: APP_NAME },
  };
}

/* ============================================================
 * 3) STORAGE ADAPTER
 *    👉 จุดเดียวที่ต้องแก้ถ้าจะย้ายไป Supabase / API จริง
 * ========================================================== */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("load failed", e);
  }
  const seed = buildSeed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}
async function saveState(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  // await sbSaveState(next);   // <-- ต่อ Supabase ตรงนี้
  return next;
}
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveSession(s) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

/* ============================================================
 * 4) PDF EXPORT ENGINE
 * ========================================================== */
const PDF_CDN = {
  html2canvas: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  jspdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
};
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("โหลดไลบรารีไม่สำเร็จ"));
    document.body.appendChild(s);
  });
}
async function ensurePdfLibs() {
  if (!window.html2canvas) await loadScript(PDF_CDN.html2canvas);
  if (!window.jspdf) await loadScript(PDF_CDN.jspdf);
  if (!window.html2canvas || !window.jspdf) throw new Error("PDF libs not ready");
}
const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

async function exportNodeToPDF(node, filename = "document.pdf") {
  if (!node) throw new Error("ไม่พบเนื้อหาที่จะบันทึก");
  await ensurePdfLibs();

  const prevW = node.style.width;
  const prevMaxW = node.style.maxWidth;
  node.style.width = "794px";
  node.style.maxWidth = "794px";
  node.classList.add("sp-pdf-rendering");
  document.body.classList.add("sp-pdf-busy");

  let canvas;
  try {
    canvas = await window.html2canvas(node, {
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: 794,
      scrollX: 0,
      scrollY: 0,
      logging: false,
    });
  } finally {
    node.style.width = prevW;
    node.style.maxWidth = prevMaxW;
    node.classList.remove("sp-pdf-rendering");
    document.body.classList.remove("sp-pdf-busy");
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210, pageH = 297, m = 8;
  const imgW = pageW - m * 2;
  const imgH = (canvas.height * imgW) / canvas.width;
  const img = canvas.toDataURL("image/jpeg", 0.92);

  let left = imgH, pos = m;
  pdf.addImage(img, "JPEG", m, pos, imgW, imgH, undefined, "FAST");
  left -= pageH - m * 2;
  while (left > 0) {
    pos = left - imgH + m;
    pdf.addPage();
    pdf.addImage(img, "JPEG", m, pos, imgW, imgH, undefined, "FAST");
    left -= pageH - m * 2;
  }

  if (isIOS()) {
    const url = URL.createObjectURL(pdf.output("blob"));
    const w = window.open(url, "_blank");
    if (!w) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    pdf.save(filename);
  }
}

function usePdfExport() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const exportPdf = async (node, filename) => {
    setBusy(true);
    setError("");
    try {
      await exportNodeToPDF(node, filename);
    } catch (e) {
      console.error(e);
      setError("สร้าง PDF ไม่สำเร็จ กำลังเปิดหน้าพิมพ์แทน...");
      setTimeout(() => window.print(), 600);
    } finally {
      setBusy(false);
    }
  };
  return { exportPdf, busy, error };
}

/* ============================================================
 * 5) ICONS (inline SVG — ไม่ต้องลง lucide)
 * ========================================================== */
const Ico = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const IconHome = (p) => <Ico {...p} d={<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 10v10h14V10" /></>} />;
const IconGrade = (p) => <Ico {...p} d={<><path d="M4 3h12l4 4v14H4z" /><path d="M8 12h8M8 16h5" /></>} />;
const IconTask = (p) => <Ico {...p} d={<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8 12 3 3 5-6" /></>} />;
const IconCal = (p) => <Ico {...p} d={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>} />;
const IconUser = (p) => <Ico {...p} d={<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>} />;
const IconGear = (p) => <Ico {...p} d={<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>} />;
const IconOut = (p) => <Ico {...p} d={<><path d="M9 21H5V3h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>} />;
const IconMenu = (p) => <Ico {...p} d={<><path d="M3 6h18M3 12h18M3 18h18" /></>} />;
const IconBell = (p) => <Ico {...p} d={<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>} />;

/* ============================================================
 * 6) GLOBAL STYLE
 * ========================================================== */
function GlobalStyle() {
  return (
    <style>{`
:root{
  --bg:#f1f5f9; --card:#ffffff; --ink:#0f172a; --muted:#64748b;
  --line:#e2e8f0; --brand:#1e3a8a; --brand2:#2563eb; --ok:#16a34a;
  --warn:#d97706; --bad:#dc2626; --radius:14px;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font-family:"Sarabun","Noto Sans Thai",system-ui,-apple-system,"Segoe UI",sans-serif;}
button{font-family:inherit;cursor:pointer}
input,select,textarea{font-family:inherit}

/* ---- Layout ---- */
.sp-app{display:flex;min-height:100vh}
.sp-sidebar{width:250px;background:#0b1b3d;color:#cbd5e1;padding:18px 14px;
  display:flex;flex-direction:column;gap:6px;position:sticky;top:0;height:100vh}
.sp-logo{display:flex;align-items:center;gap:10px;padding:6px 8px 16px;color:#fff}
.sp-logo-mark{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#2563eb,#60a5fa);
  display:grid;place-items:center;font-weight:800;font-size:15px;color:#fff;flex:none}
.sp-logo-text b{display:block;font-size:15px;line-height:1.2}
.sp-logo-text span{font-size:11px;color:#94a3b8}
.sp-nav-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;
  border:0;background:transparent;color:#cbd5e1;font-size:14.5px;text-align:left;width:100%}
.sp-nav-item:hover{background:#152a52;color:#fff}
.sp-nav-item.active{background:#2563eb;color:#fff;font-weight:600}
.sp-nav-sep{margin:12px 10px 6px;font-size:11px;letter-spacing:.09em;color:#64748b;text-transform:uppercase}
.sp-side-foot{margin-top:auto;border-top:1px solid #1e293b;padding-top:12px}

.sp-main{flex:1;min-width:0;display:flex;flex-direction:column}
.sp-topbar{background:#fff;border-bottom:1px solid var(--line);padding:12px 20px;
  display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:20}
.sp-burger{display:none;border:1px solid var(--line);background:#fff;border-radius:9px;padding:7px}
.sp-topbar-user{margin-left:auto;display:flex;align-items:center;gap:10px;font-size:14px}
.sp-avatar{width:34px;height:34px;border-radius:50%;background:var(--brand2);color:#fff;
  display:grid;place-items:center;font-weight:700;font-size:14px}
.sp-content{padding:22px;max-width:1180px;width:100%;margin:0 auto}

.sp-page-head{display:flex;align-items:center;justify-content:space-between;
  gap:14px;flex-wrap:wrap;margin-bottom:18px}
.sp-page-head h1{margin:0;font-size:22px;font-weight:800}
.sp-page-head p{margin:3px 0 0;font-size:13.5px;color:var(--muted)}

/* ---- Cards & grid ---- */
.sp-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:18px}
.sp-card h3{margin:0 0 12px;font-size:15.5px;font-weight:700}
.sp-grid{display:grid;gap:14px}
.sp-grid-4{grid-template-columns:repeat(4,1fr)}
.sp-grid-3{grid-template-columns:repeat(3,1fr)}
.sp-grid-2{grid-template-columns:repeat(2,1fr)}
.sp-stat{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:16px}
.sp-stat .lbl{font-size:12.5px;color:var(--muted)}
.sp-stat .val{font-size:26px;font-weight:800;margin-top:4px;color:var(--brand)}
.sp-stat .sub{font-size:12px;color:var(--muted);margin-top:2px}

/* ---- Form ---- */
.sp-inline-form{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sp-input,.sp-select,.sp-textarea{width:100%;padding:9px 11px;border:1px solid var(--line);
  border-radius:10px;font-size:14px;background:#fff;color:var(--ink)}
.sp-input:focus,.sp-select:focus,.sp-textarea:focus{outline:2px solid #bfdbfe;border-color:var(--brand2)}
.sp-field{margin-bottom:12px}
.sp-field label{display:block;font-size:13px;font-weight:600;margin-bottom:5px}
.sp-btn-primary,.sp-btn-ghost,.sp-btn-danger{display:inline-flex;align-items:center;gap:7px;
  padding:9px 15px;border-radius:10px;font-size:14px;font-weight:600;border:1px solid transparent}
.sp-btn-primary{background:var(--brand2);color:#fff}
.sp-btn-primary:hover{background:#1d4ed8}
.sp-btn-primary:disabled{opacity:.6;cursor:not-allowed}
.sp-btn-ghost{background:#fff;color:var(--ink);border-color:var(--line)}
.sp-btn-ghost:hover{background:#f8fafc}
.sp-btn-danger{background:#fee2e2;color:#b91c1c}

/* ---- Table ---- */
.sp-table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--radius);background:#fff}
.sp-table{width:100%;border-collapse:collapse;font-size:14px;min-width:520px}
.sp-table th{background:#f8fafc;text-align:left;padding:11px 13px;font-weight:700;
  font-size:13px;color:#475569;border-bottom:1px solid var(--line);white-space:nowrap}
.sp-table td{padding:11px 13px;border-bottom:1px solid #f1f5f9}
.sp-table tr:last-child td{border-bottom:0}
.sp-table tbody tr:hover{background:#f8fafc}

.sp-badge{display:inline-block;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:600}
.sp-badge.ok{background:#dcfce7;color:#166534}
.sp-badge.warn{background:#fef3c7;color:#92400e}
.sp-badge.bad{background:#fee2e2;color:#991b1b}
.sp-badge.info{background:#dbeafe;color:#1e40af}
.sp-empty{padding:26px;text-align:center;color:var(--muted);font-size:14px}

/* ---- Login ---- */
.sp-login{min-height:100vh;display:grid;place-items:center;padding:20px;
  background:linear-gradient(135deg,#0b1b3d,#1e3a8a 55%,#2563eb)}
.sp-login-card{width:100%;max-width:390px;background:#fff;border-radius:18px;padding:30px;
  box-shadow:0 24px 60px rgba(0,0,0,.32)}
.sp-login-card h2{margin:14px 0 4px;font-size:20px;text-align:center}
.sp-login-card .sub{text-align:center;color:var(--muted);font-size:13px;margin-bottom:22px}
.sp-demo{margin-top:16px;padding:12px;background:#f8fafc;border:1px dashed var(--line);
  border-radius:10px;font-size:12.5px;color:var(--muted);line-height:1.9}
.sp-err{background:#fee2e2;color:#b91c1c;padding:9px 12px;border-radius:9px;
  font-size:13px;margin-bottom:12px}

/* ---- Report document ---- */
.sp-grade-report-doc{background:#fff;border:1px solid var(--line);border-radius:var(--radius);
  padding:34px 30px;max-width:820px;margin:0 auto}
.sp-report-header{display:flex;gap:16px;align-items:center;justify-content:center;
  text-align:center;border-bottom:2px solid var(--brand);padding-bottom:14px;margin-bottom:18px}
.sp-report-seal{width:64px;height:64px;object-fit:contain;flex:none}
.sp-report-college-name{font-size:19px;font-weight:800;color:var(--brand)}
.sp-report-subtitle{font-size:13.5px;color:#475569;margin-top:2px}
.sp-report-student-info{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 20px;
  font-size:14px;margin-bottom:18px}
.sp-report-label{font-weight:700;color:#334155}
.sp-report-table{width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:18px}
.sp-report-table th,.sp-report-table td{border:1px solid #cbd5e1;padding:8px 10px}
.sp-report-table th{background:#f1f5f9;font-weight:700}
.sp-report-table td:not(:nth-child(2)){text-align:center}
.sp-report-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:26px}
.sp-report-summary-box{border:1px solid #cbd5e1;border-radius:9px;padding:11px;
  text-align:center;background:#f8fafc}
.sp-report-summary-label{font-size:12px;color:#475569}
.sp-report-summary-value{font-size:19px;font-weight:800;color:var(--brand);margin-top:3px}
.sp-report-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;
  margin-top:40px;text-align:center;font-size:13px}
.sp-report-sign-line .line{border-bottom:1px dotted #475569;margin-bottom:7px;height:34px}
.sp-report-date{text-align:right;font-size:12.5px;color:var(--muted);margin-top:22px}

/* ---- PDF rendering mode ---- */
.sp-pdf-rendering{background:#fff!important;color:#111!important;
  border-radius:0!important;box-shadow:none!important;margin:0!important}
.sp-pdf-rendering *{animation:none!important;transition:none!important;box-shadow:none!important;
  overflow:visible!important;max-height:none!important;color:#111!important;border-color:#cbd5e1!important}
.sp-pdf-rendering .sp-report-college-name,
.sp-pdf-rendering .sp-report-summary-value{color:#1e3a8a!important}
.sp-pdf-rendering .sp-report-table th{background:#f1f5f9!important}
.sp-pdf-rendering .sp-report-summary-box{background:#f8fafc!important}
.sp-pdf-rendering .sp-no-print{display:none!important}
body.sp-pdf-busy{overflow:hidden}

/* ---- Responsive ---- */
.sp-backdrop{display:none}
@media(max-width:1024px){
  .sp-grid-4{grid-template-columns:repeat(2,1fr)}
  .sp-grid-3{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:820px){
  .sp-sidebar{position:fixed;left:0;top:0;z-index:60;transform:translateX(-100%);
    transition:transform .22s ease}
  .sp-sidebar.open{transform:translateX(0)}
  .sp-burger{display:inline-flex}
  .sp-backdrop.show{display:block;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:50}
}
@media(max-width:640px){
  .sp-content{padding:16px}
  .sp-grid-4,.sp-grid-3,.sp-grid-2{grid-template-columns:1fr}
  .sp-report-student-info,.sp-report-summary{grid-template-columns:1fr 1fr}
  .sp-report-signatures{grid-template-columns:1fr;gap:26px}
  .sp-grade-report-doc{padding:20px 16px}
  .sp-page-head .sp-inline-form{width:100%}
  .sp-page-head .sp-inline-form>*{flex:1 1 140px}
}
@media print{
  .sp-sidebar,.sp-topbar,.sp-no-print{display:none!important}
  .sp-content{padding:0;max-width:none}
  .sp-grade-report-doc{border:0;padding:0}
  body{background:#fff}
}
    `}</style>
  );
}

/* ============================================================
 * 7) SHARED UI
 * ========================================================== */
const Stat = ({ label, value, sub }) => (
  <div className="sp-stat">
    <div className="lbl">{label}</div>
    <div className="val">{value}</div>
    {sub && <div className="sub">{sub}</div>}
  </div>
);

const Empty = ({ text = "ยังไม่มีข้อมูล" }) => <div className="sp-empty">{text}</div>;

function TermPicker({ data, value, onChange }) {
  const ordered = useMemo(() => orderTerms(data), [data]);
  return (
    <select className="sp-select" style={{ width: "auto" }} value={value}
      onChange={(e) => onChange(e.target.value)}>
      {ordered.length === 0 && <option value="">- ไม่มีเทอม -</option>}
      {ordered.map((t) => {
        const y = data.academicYears.find((yy) => yy.id === t.academicYearId);
        return (
          <option key={t.id} value={t.id}>
            ปีการศึกษา {y?.label} · เทอม {t.termNumber}
          </option>
        );
      })}
    </select>
  );
}

function orderTerms(data) {
  return [...data.terms].sort((a, b) => {
    const ya = data.academicYears.find((y) => y.id === a.academicYearId)?.label || "";
    const yb = data.academicYears.find((y) => y.id === b.academicYearId)?.label || "";
    if (ya !== yb) return ya.localeCompare(yb);
    return a.termNumber - b.termNumber;
  });
}

/* ============================================================
 * 8) LOGIN
 * ========================================================== */
function Login({ data, onLogin }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const found = data.users.find(
      (x) => x.username.trim() === u.trim() && x.password === p
    );
    if (!found) return setErr("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    setErr("");
    onLogin({ userId: found.id, role: found.role, refId: found.refId });
  };

  return (
    <div className="sp-login">
      <form className="sp-login-card" onSubmit={submit}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div className="sp-logo-mark" style={{ width: 52, height: 52, fontSize: 18 }}>SP</div>
        </div>
        <h2>{APP_SHORT}</h2>
        <div className="sub">{APP_NAME}</div>

        {err && <div className="sp-err">{err}</div>}

        <div className="sp-field">
          <label>ชื่อผู้ใช้ / รหัสนักเรียน</label>
          <input className="sp-input" value={u} onChange={(e) => setU(e.target.value)}
            placeholder="เช่น admin หรือ 681001" autoComplete="username" />
        </div>
        <div className="sp-field">
          <label>รหัสผ่าน</label>
          <input className="sp-input" type="password" value={p}
            onChange={(e) => setP(e.target.value)} autoComplete="current-password" />
        </div>

        <button className="sp-btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>
          เข้าสู่ระบบ
        </button>

        <div className="sp-demo">
          <b>บัญชีทดลอง</b> (รหัสผ่าน <b>1234</b> ทั้งหมด)<br />
          ผู้ดูแล: <b>admin</b> · ครู: <b>teacher</b> · นักเรียน: <b>681001</b>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
 * 9) STUDENT PAGES
 * ========================================================== */
function StudentDashboard({ data, student, go }) {
  const current = data.terms.find((t) => t.isCurrent);
  const myGrades = data.grades.filter((g) => g.studentId === student.id);
  const termGrades = current ? myGrades.filter((g) => g.termId === current.id) : [];
  const myAtt = data.attendance.filter((a) => a.studentId === student.id);
  const present = myAtt.filter((a) => a.status === "present").length;
  const rate = myAtt.length ? Math.round((present / myAtt.length) * 100) : 0;
  const myAssign = data.assignments.filter((a) => a.class === student.class);
  const submittedIds = new Set(
    data.submissions.filter((s) => s.studentId === student.id).map((s) => s.assignmentId)
  );
  const pending = myAssign.filter((a) => !submittedIds.has(a.id));

  return (
    <div>
      <div className="sp-page-head">
        <div>
          <h1>สวัสดี, {student.name.split(" ")[0]} 👋</h1>
          <p>{student.class} · เลขที่ {student.number} · รหัส {student.studentCode}</p>
        </div>
      </div>

      <div className="sp-grid sp-grid-4" style={{ marginBottom: 18 }}>
        <Stat label="GPA เทอมปัจจุบัน" value={gpaOf(termGrades)} sub={`${termGrades.length} รายวิชา`} />
        <Stat label="GPAX สะสม" value={gpaOf(myGrades)} sub={`${myGrades.length} รายวิชาสะสม`} />
        <Stat label="อัตราการเข้าเรียน" value={`${rate}%`} sub={`มาเรียน ${present}/${myAtt.length} วัน`} />
        <Stat label="งานค้างส่ง" value={pending.length} sub="รายการ" />
      </div>

      <div className="sp-grid sp-grid-2">
        <div className="sp-card">
          <h3>📌 งานที่ต้องส่ง</h3>
          {pending.length === 0 ? (
            <Empty text="ส่งงานครบแล้ว เยี่ยมมาก! 🎉" />
          ) : (
            pending.slice(0, 4).map((a) => {
              const d = daysUntil(a.dueDate);
              return (
                <div key={a.id} style={{
                  display: "flex", justifyContent: "space-between", gap: 10,
                  padding: "10px 0", borderBottom: "1px solid #f1f5f9",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{a.subject}</div>
                  </div>
                  <span className={`sp-badge ${d < 0 ? "bad" : d <= 3 ? "warn" : "info"}`}>
                    {d < 0 ? `เลย ${Math.abs(d)} วัน` : d === 0 ? "วันนี้" : `อีก ${d} วัน`}
                  </span>
                </div>
              );
            })
          )}
          <button className="sp-btn-ghost" style={{ marginTop: 12 }} onClick={() => go("assignments")}>
            ดูงานทั้งหมด
          </button>
        </div>

        <div className="sp-card">
          <h3>📢 ประกาศจากวิทยาลัย</h3>
          {data.announcements.length === 0 ? <Empty /> : data.announcements.map((n) => (
            <div key={n.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>{n.body}</div>
              <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>{thaiDate(n.date)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StudentGrades({ data, student }) {
  const ordered = useMemo(() => orderTerms(data), [data]);
  const [termId, setTermId] = useState(
    data.terms.find((t) => t.isCurrent)?.id || ordered[0]?.id || ""
  );
  const term = data.terms.find((t) => t.id === termId) || ordered[0];
  const year = term ? data.academicYears.find((y) => y.id === term.academicYearId) : null;
  const idx = ordered.findIndex((t) => t.id === term?.id);

  const all = data.grades.filter((g) => g.studentId === student.id);
  const termGrades = term ? all.filter((g) => g.termId === term.id) : [];
  const cumIds = new Set(ordered.slice(0, idx + 1).map((t) => t.id));
  const cum = all.filter((g) => cumIds.has(g.termId));

  const reportRef = useRef(null);
  const { exportPdf, busy, error } = usePdfExport();

  const handleExport = () => {
    const fname = `ใบเกรด_${student.studentCode}_ปี${year?.label || "-"}_เทอม${term?.termNumber || "-"}.pdf`;
    exportPdf(reportRef.current, fname);
  };

  return (
    <div>
      <div className="sp-page-head sp-no-print">
        <div>
          <h1>ผลการเรียน</h1>
          <p>ใบรายงานผลการเรียนรายภาคเรียน</p>
        </div>
        <div className="sp-inline-form">
          <TermPicker data={data} value={termId} onChange={setTermId} />
          <button className="sp-btn-primary" type="button" onClick={handleExport} disabled={busy}>
            <IconGrade size={16} /> {busy ? "กำลังสร้าง PDF..." : "บันทึก PDF"}
          </button>
          <button className="sp-btn-ghost" type="button" onClick={() => window.print()}>พิมพ์</button>
        </div>
      </div>

      {error && (
        <div className="sp-no-print" style={{ margin: "0 0 12px", fontSize: 14, color: "#b45309" }}>
          {error}
        </div>
      )}

      <div className="sp-grade-report-doc" ref={reportRef}>
        <div className="sp-report-header">
          <div className="sp-logo-mark" style={{ width: 58, height: 58, fontSize: 19 }}>SP</div>
          <div>
            <div className="sp-report-college-name">{data.siteContent?.schoolName || APP_NAME}</div>
            <div className="sp-report-subtitle">ใบรายงานผลการเรียนรายภาคเรียน (ACADEMIC RECORD)</div>
            <div className="sp-report-subtitle">
              ปีการศึกษา {year?.label || "-"} · ภาคเรียนที่ {term?.termNumber || "-"}
            </div>
          </div>
        </div>

        <div className="sp-report-student-info">
          <div><span className="sp-report-label">ชื่อ-นามสกุล:</span> {student.name}</div>
          <div><span className="sp-report-label">รหัสประจำตัว:</span> {student.studentCode}</div>
          <div><span className="sp-report-label">ระดับชั้น/กลุ่ม:</span> {student.class}</div>
          <div><span className="sp-report-label">เลขที่:</span> {student.number}</div>
          <div><span className="sp-report-label">สาขาวิชา:</span> {student.major}</div>
        </div>

        <table className="sp-report-table">
          <thead>
            <tr>
              <th style={{ width: 56 }}>ลำดับ</th>
              <th>ชื่อรายวิชา</th>
              <th style={{ width: 80 }}>หน่วยกิต</th>
              <th style={{ width: 96 }}>คะแนน</th>
              <th style={{ width: 96 }}>ผลการเรียน</th>
            </tr>
          </thead>
          <tbody>
            {termGrades.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>
                ยังไม่มีข้อมูลคะแนนในภาคเรียนนี้
              </td></tr>
            ) : termGrades.map((g, i) => (
              <tr key={g.id}>
                <td>{i + 1}</td>
                <td>{g.subject}</td>
                <td>{CREDIT_PER_SUBJECT.toFixed(1)}</td>
                <td>{g.score}/100</td>
                <td>{scoreToPoint(g.score).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="sp-report-summary">
          <div className="sp-report-summary-box">
            <div className="sp-report-summary-label">หน่วยกิตประจำภาค</div>
            <div className="sp-report-summary-value">{(termGrades.length * CREDIT_PER_SUBJECT).toFixed(1)}</div>
          </div>
          <div className="sp-report-summary-box">
            <div className="sp-report-summary-label">GPA ประจำภาค</div>
            <div className="sp-report-summary-value">{gpaOf(termGrades)}</div>
          </div>
          <div className="sp-report-summary-box">
            <div className="sp-report-summary-label">หน่วยกิตสะสม</div>
            <div className="sp-report-summary-value">{(cum.length * CREDIT_PER_SUBJECT).toFixed(1)}</div>
          </div>
          <div className="sp-report-summary-box">
            <div className="sp-report-summary-label">GPAX สะสม</div>
            <div className="sp-report-summary-value">{gpaOf(cum)}</div>
          </div>
        </div>

        <div className="sp-report-signatures">
          <div className="sp-report-sign-line"><div className="line" /><div>ครูที่ปรึกษา</div></div>
          <div className="sp-report-sign-line"><div className="line" /><div>หัวหน้างานทะเบียนและวัดผล</div></div>
          <div className="sp-report-sign-line"><div className="line" /><div>ผู้อำนวยการสถานศึกษา</div></div>
        </div>
        <div className="sp-report-date">ออกเอกสาร ณ วันที่ {thaiDate(new Date())}</div>
      </div>
    </div>
  );
}

function StudentAssignments({ data, student, persist }) {
  const [busyId, setBusyId] = useState(null);
  const list = data.assignments
    .filter((a) => a.class === student.class)
    .map((a) => ({ ...a, d: daysUntil(a.dueDate) }))
    .sort((a, b) => a.d - b.d);

  const subOf = (aid) =>
    data.submissions.find((s) => s.assignmentId === aid && s.studentId === student.id);

  async function handleFile(assignmentId, e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusyId(assignmentId);
    try {
      const existing = subOf(assignmentId);
      const record = {
        fileName: file.name,
        fileSize: file.size,
        submittedAt: todayISO(),
        status: "submitted",
      };
      const next = existing
        ? data.submissions.map((s) => (s.id === existing.id ? { ...s, ...record } : s))
        : [...data.submissions, { id: genId("sub"), assignmentId, studentId: student.id, ...record }];
      await persist({ ...data, submissions: next });
    } catch (err) {
      alert(err.message || "อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="sp-page-head">
        <div>
          <h1>งานที่ได้รับมอบหมาย</h1>
          <p>ห้อง {student.class} · ทั้งหมด {list.length} รายการ</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="sp-card"><Empty text="ยังไม่มีงานมอบหมาย" /></div>
      ) : (
        <div className="sp-grid" style={{ gap: 12 }}>
          {list.map((a) => {
            const sub = subOf(a.id);
            const late = a.d < 0 && !sub;
            return (
              <div className="sp-card" key={a.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 15.5 }}>{a.title}</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>
                      {a.subject} · กำหนดส่ง {thaiDate(a.dueDate)}
                    </div>
                    <div style={{ fontSize: 13.5, marginTop: 8 }}>{a.detail}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {sub ? (
                      <span className={`sp-badge ${sub.status === "graded" ? "ok" : "info"}`}>
                        {sub.status === "graded" ? `ตรวจแล้ว ${sub.score ?? "-"} คะแนน` : "ส่งแล้ว"}
                      </span>
                    ) : (
                      <span className={`sp-badge ${late ? "bad" : "warn"}`}>
                        {late ? "เลยกำหนด" : "ยังไม่ส่ง"}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <label className="sp-btn-primary" style={{ margin: 0 }}>
                    {busyId === a.id ? "กำลังอัปโหลด..." : sub ? "ส่งใหม่อีกครั้ง" : "เลือกไฟล์เพื่อส่งงาน"}
                    <input type="file" hidden disabled={busyId === a.id}
                      onChange={(e) => handleFile(a.id, e)} />
                  </label>
                  {sub && (
                    <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                      📎 {sub.fileName} · ส่งเมื่อ {thaiDate(sub.submittedAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudentAttendance({ data, student }) {
  const rows = data.attendance
    .filter((a) => a.studentId === student.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const count = (s) => rows.filter((r) => r.status === s).length;
  const label = { present: ["มาเรียน", "ok"], late: ["สาย", "warn"], absent: ["ขาด", "bad"] };

  return (
    <div>
      <div className="sp-page-head">
        <div><h1>ประวัติการเข้าเรียน</h1><p>บันทึกย้อนหลัง {rows.length} วัน</p></div>
      </div>

      <div className="sp-grid sp-grid-3" style={{ marginBottom: 18 }}>
        <Stat label="มาเรียน" value={count("present")} sub="วัน" />
        <Stat label="มาสาย" value={count("late")} sub="วัน" />
        <Stat label="ขาดเรียน" value={count("absent")} sub="วัน" />
      </div>

      <div className="sp-table-wrap">
        <table className="sp-table">
          <thead><tr><th>วันที่</th><th>ห้องเรียน</th><th>สถานะ</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={3}><Empty /></td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td>{thaiDate(r.date)}</td>
                <td>{r.class}</td>
                <td><span className={`sp-badge ${label[r.status][1]}`}>{label[r.status][0]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentProfile({ student }) {
  const rows = [
    ["ชื่อ-นามสกุล", student.name],
    ["รหัสประจำตัว", student.studentCode],
    ["ระดับชั้น", student.class],
    ["เลขที่", student.number],
    ["สาขาวิชา", student.major],
    ["เบอร์โทรศัพท์", student.phone],
  ];
  return (
    <div>
      <div className="sp-page-head"><h1>ข้อมูลส่วนตัว</h1></div>
      <div className="sp-card" style={{ maxWidth: 560 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{
            display: "flex", justifyContent: "space-between", gap: 12,
            padding: "11px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14,
          }}>
            <span style={{ color: "var(--muted)" }}>{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * 10) TEACHER PAGES
 * ========================================================== */
function TeacherDashboard({ data, teacher }) {
  const myStudents = data.students.filter((s) => s.class === teacher.advisorClass);
  const myAssign = data.assignments.filter((a) => a.teacherId === teacher.id);
  const todayAtt = data.attendance.filter(
    (a) => a.date === todayISO() && a.class === teacher.advisorClass
  );
  const waiting = data.submissions.filter(
    (s) => s.status === "submitted" && myAssign.some((a) => a.id === s.assignmentId)
  );

  return (
    <div>
      <div className="sp-page-head">
        <div>
          <h1>แดชบอร์ดครู</h1>
          <p>{teacher.name} · ครูที่ปรึกษา {teacher.advisorClass} · วิชา {teacher.subject}</p>
        </div>
      </div>
      <div className="sp-grid sp-grid-4" style={{ marginBottom: 18 }}>
        <Stat label="นักเรียนในที่ปรึกษา" value={myStudents.length} sub="คน" />
        <Stat label="งานที่มอบหมาย" value={myAssign.length} sub="รายการ" />
        <Stat label="รอตรวจ" value={waiting.length} sub="ชิ้นงาน" />
        <Stat label="เช็กชื่อวันนี้" value={todayAtt.length ? "เรียบร้อย" : "ยังไม่เช็ก"} />
      </div>

      <div className="sp-card">
        <h3>รายชื่อนักเรียน {teacher.advisorClass}</h3>
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead><tr><th>เลขที่</th><th>รหัส</th><th>ชื่อ-นามสกุล</th><th>GPAX</th></tr></thead>
            <tbody>
              {myStudents.map((s) => (
                <tr key={s.id}>
                  <td>{s.number}</td>
                  <td>{s.studentCode}</td>
                  <td>{s.name}</td>
                  <td>{gpaOf(data.grades.filter((g) => g.studentId === s.id))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeacherGrades({ data, persist }) {
  const ordered = useMemo(() => orderTerms(data), [data]);
  const [termId, setTermId] = useState(data.terms.find((t) => t.isCurrent)?.id || ordered[0]?.id || "");
  const [cls, setCls] = useState(CLASSES[0]);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(false);

  const students = data.students
    .filter((s) => s.class === cls)
    .sort((a, b) => a.number - b.number);

  const getScore = (sid) => {
    if (draft[sid] !== undefined) return draft[sid];
    const g = data.grades.find(
      (x) => x.studentId === sid && x.termId === termId && x.subject === subject
    );
    return g ? String(g.score) : "";
  };

  async function saveAll() {
    let next = [...data.grades];
    students.forEach((s) => {
      const raw = draft[s.id];
      if (raw === undefined) return;
      const score = Math.max(0, Math.min(100, Number(raw) || 0));
      const i = next.findIndex(
        (x) => x.studentId === s.id && x.termId === termId && x.subject === subject
      );
      if (raw === "") {
        if (i >= 0) next.splice(i, 1);
      } else if (i >= 0) {
        next[i] = { ...next[i], score };
      } else {
        next.push({ id: genId("g"), studentId: s.id, termId, subject, score });
      }
    });
    await persist({ ...data, grades: next });
    setDraft({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div>
      <div className="sp-page-head">
        <div><h1>บันทึกผลการเรียน</h1><p>กรอกคะแนนเต็ม 100 ระบบคำนวณเกรดอัตโนมัติ</p></div>
        <div className="sp-inline-form">
          <TermPicker data={data} value={termId} onChange={(v) => { setTermId(v); setDraft({}); }} />
          <select className="sp-select" style={{ width: "auto" }} value={cls}
            onChange={(e) => { setCls(e.target.value); setDraft({}); }}>
            {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="sp-select" style={{ width: "auto" }} value={subject}
            onChange={(e) => { setSubject(e.target.value); setDraft({}); }}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="sp-btn-primary" onClick={saveAll}>บันทึก</button>
        </div>
      </div>

      {saved && (
        <div className="sp-badge ok" style={{ marginBottom: 12, display: "inline-block" }}>
          ✓ บันทึกเรียบร้อยแล้ว
        </div>
      )}

      <div className="sp-table-wrap">
        <table className="sp-table">
          <thead>
            <tr><th style={{ width: 70 }}>เลขที่</th><th>ชื่อ-นามสกุล</th>
              <th style={{ width: 140 }}>คะแนน</th><th style={{ width: 100 }}>เกรด</th></tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const v = getScore(s.id);
              return (
                <tr key={s.id}>
                  <td>{s.number}</td>
                  <td>{s.name}</td>
                  <td>
                    <input className="sp-input" type="number" min="0" max="100" value={v}
                      placeholder="-" onChange={(e) =>
                        setDraft((d) => ({ ...d, [s.id]: e.target.value }))} />
                  </td>
                  <td><b>{v === "" ? "-" : scoreToPoint(v).toFixed(1)}</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeacherAssignments({ data, teacher, persist }) {
  const blank = { title: "", subject: teacher.subject, class: teacher.advisorClass, detail: "", dueDate: addDays(7) };
  const [form, setForm] = useState(blank);
  const mine = data.assignments.filter((a) => a.teacherId === teacher.id);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function create(e) {
    e.preventDefault();
    if (!form.title.trim()) return alert("กรุณากรอกชื่องาน");
    await persist({
      ...data,
      assignments: [...data.assignments, { id: genId("a"), teacherId: teacher.id, ...form }],
    });
    setForm(blank);
  }
  async function remove(id) {
    if (!window.confirm("ลบงานนี้?")) return;
    await persist({
      ...data,
      assignments: data.assignments.filter((a) => a.id !== id),
      submissions: data.submissions.filter((s) => s.assignmentId !== id),
    });
  }

  return (
    <div>
      <div className="sp-page-head"><h1>จัดการงานมอบหมาย</h1></div>

      <div className="sp-grid sp-grid-2">
        <form className="sp-card" onSubmit={create}>
          <h3>➕ สร้างงานใหม่</h3>
          <div className="sp-field">
            <label>ชื่องาน</label>
            <input className="sp-input" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="sp-field">
            <label>รายวิชา</label>
            <select className="sp-select" value={form.subject} onChange={(e) => set("subject", e.target.value)}>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="sp-field">
            <label>ห้องเรียน</label>
            <select className="sp-select" value={form.class} onChange={(e) => set("class", e.target.value)}>
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="sp-field">
            <label>กำหนดส่ง</label>
            <input className="sp-input" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </div>
          <div className="sp-field">
            <label>รายละเอียด</label>
            <textarea className="sp-textarea" rows={3} value={form.detail} onChange={(e) => set("detail", e.target.value)} />
          </div>
          <button className="sp-btn-primary" type="submit">สร้างงาน</button>
        </form>

        <div className="sp-card">
          <h3>📋 งานของฉัน ({mine.length})</h3>
          {mine.length === 0 ? <Empty /> : mine.map((a) => {
            const subs = data.submissions.filter((s) => s.assignmentId === a.id);
            const total = data.students.filter((s) => s.class === a.class).length;
            return (
              <div key={a.id} style={{ padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                      {a.class} · {a.subject} · ส่งภายใน {thaiDate(a.dueDate)}
                    </div>
                    <span className="sp-badge info" style={{ marginTop: 6, display: "inline-block" }}>
                      ส่งแล้ว {subs.length}/{total}
                    </span>
                  </div>
                  <button className="sp-btn-danger" onClick={() => remove(a.id)}>ลบ</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TeacherAttendance({ data, teacher, persist }) {
  const [date, setDate] = useState(todayISO());
  const [cls, setCls] = useState(teacher.advisorClass);
  const [saved, setSaved] = useState(false);

  const students = data.students.filter((s) => s.class === cls).sort((a, b) => a.number - b.number);
  const statusOf = (sid) =>
    data.attendance.find((a) => a.studentId === sid && a.date === date)?.status || "present";

  async function mark(sid, status) {
    const i = data.attendance.findIndex((a) => a.studentId === sid && a.date === date);
    let next = [...data.attendance];
    if (i >= 0) next[i] = { ...next[i], status };
    else next.push({ id: genId("at"), date, class: cls, studentId: sid, status });
    await persist({ ...data, attendance: next });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const opts = [["present", "มา", "ok"], ["late", "สาย", "warn"], ["absent", "ขาด", "bad"]];

  return (
    <div>
      <div className="sp-page-head">
        <div><h1>เช็กชื่อเข้าเรียน</h1><p>บันทึกอัตโนมัติทันทีที่กด</p></div>
        <div className="sp-inline-form">
          <input className="sp-input" type="date" style={{ width: "auto" }}
            value={date} onChange={(e) => setDate(e.target.value)} />
          <select className="sp-select" style={{ width: "auto" }} value={cls} onChange={(e) => setCls(e.target.value)}>
            {CLASSES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {saved && <div className="sp-badge ok" style={{ marginBottom: 12, display: "inline-block" }}>✓ บันทึกแล้ว</div>}

      <div className="sp-table-wrap">
        <table className="sp-table">
          <thead><tr><th style={{ width: 70 }}>เลขที่</th><th>ชื่อ-นามสกุล</th><th style={{ width: 240 }}>สถานะ</th></tr></thead>
          <tbody>
            {students.map((s) => {
              const cur = statusOf(s.id);
              return (
                <tr key={s.id}>
                  <td>{s.number}</td>
                  <td>{s.name}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {opts.map(([val, txt]) => (
                        <button key={val} type="button"
                          className={cur === val ? "sp-btn-primary" : "sp-btn-ghost"}
                          style={{ padding: "5px 12px", fontSize: 13 }}
                          onClick={() => mark(s.id, val)}>
                          {txt}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
 * 11) ADMIN PAGES
 * ========================================================== */
function AdminDashboard({ data }) {
  const cur = data.terms.find((t) => t.isCurrent);
  const y = cur ? data.academicYears.find((x) => x.id === cur.academicYearId) : null;
  return (
    <div>
      <div className="sp-page-head">
        <div><h1>ภาพรวมระบบ</h1>
          <p>ภาคเรียนปัจจุบัน: ปีการศึกษา {y?.label || "-"} เทอม {cur?.termNumber || "-"}</p></div>
      </div>
      <div className="sp-grid sp-grid-4" style={{ marginBottom: 18 }}>
        <Stat label="นักเรียนทั้งหมด" value={data.students.length} sub="คน" />
        <Stat label="ครูผู้สอน" value={data.teachers.length} sub="คน" />
        <Stat label="บัญชีผู้ใช้" value={data.users.length} sub="บัญชี" />
        <Stat label="รายการคะแนน" value={data.grades.length} sub="รายการ" />
      </div>

      <div className="sp-card">
        <h3>สรุป GPAX รายห้อง</h3>
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead><tr><th>ห้องเรียน</th><th>จำนวนนักเรียน</th><th>GPAX เฉลี่ย</th></tr></thead>
            <tbody>
              {CLASSES.map((c) => {
                const st = data.students.filter((s) => s.class === c);
                const ids = new Set(st.map((s) => s.id));
                const gs = data.grades.filter((g) => ids.has(g.studentId));
                return (
                  <tr key={c}><td>{c}</td><td>{st.length}</td><td><b>{gpaOf(gs)}</b></td></tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminUsers({ data, persist }) {
  const [q, setQ] = useState("");
  const list = data.users.filter(
    (u) => u.name.includes(q) || u.username.includes(q)
  );

  async function resetPw(id) {
    if (!window.confirm("รีเซ็ตรหัสผ่านเป็น 1234 ?")) return;
    await persist({
      ...data,
      users: data.users.map((u) => (u.id === id ? { ...u, password: "1234" } : u)),
    });
    alert("รีเซ็ตเรียบร้อย");
  }
  async function remove(id) {
    if (!window.confirm("ลบบัญชีนี้ถาวร?")) return;
    await persist({ ...data, users: data.users.filter((u) => u.id !== id) });
  }

  const roleLabel = { admin: ["ผู้ดูแล", "bad"], teacher: ["ครู", "info"], student: ["นักเรียน", "ok"] };

  return (
    <div>
      <div className="sp-page-head">
        <div><h1>จัดการบัญชีผู้ใช้</h1><p>ทั้งหมด {data.users.length} บัญชี</p></div>
        <input className="sp-input" style={{ width: 240 }} placeholder="ค้นหาชื่อหรือชื่อผู้ใช้..."
          value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="sp-table-wrap">
        <table className="sp-table">
          <thead><tr><th>ชื่อผู้ใช้</th><th>ชื่อ-นามสกุล</th><th>สิทธิ์</th><th style={{ width: 190 }}>จัดการ</th></tr></thead>
          <tbody>
            {list.length === 0 ? <tr><td colSpan={4}><Empty text="ไม่พบบัญชี" /></td></tr> : list.map((u) => (
              <tr key={u.id}>
                <td><code>{u.username}</code></td>
                <td>{u.name}</td>
                <td><span className={`sp-badge ${roleLabel[u.role][1]}`}>{roleLabel[u.role][0]}</span></td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="sp-btn-ghost" style={{ padding: "5px 10px", fontSize: 13 }}
                      onClick={() => resetPw(u.id)}>รีเซ็ตรหัส</button>
                    <button className="sp-btn-danger" style={{ padding: "5px 10px", fontSize: 13 }}
                      onClick={() => remove(u.id)}>ลบ</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAcademic({ data, persist }) {
  const [yearLabel, setYearLabel] = useState("");
  const ordered = orderTerms(data);

  async function addYear(e) {
    e.preventDefault();
    if (!yearLabel.trim()) return;
    await persist({
      ...data,
      academicYears: [...data.academicYears, { id: genId("y"), label: yearLabel.trim() }],
    });
    setYearLabel("");
  }
  async function addTerm(yearId, n) {
    if (data.terms.some((t) => t.academicYearId === yearId && t.termNumber === n))
      return alert("มีเทอมนี้อยู่แล้ว");
    await persist({
      ...data,
      terms: [...data.terms, { id: genId("t"), academicYearId: yearId, termNumber: n, isCurrent: false }],
    });
  }
  async function setCurrent(id) {
    await persist({
      ...data,
      terms: data.terms.map((t) => ({ ...t, isCurrent: t.id === id })),
    });
  }
  async function resetAll() {
    if (!window.confirm("ล้างข้อมูลทั้งหมดและกลับไปใช้ข้อมูลตัวอย่าง?")) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  return (
    <div>
      <div className="sp-page-head"><h1>ปีการศึกษา & ภาคเรียน</h1></div>

      <div className="sp-grid sp-grid-2">
        <div className="sp-card">
          <h3>ปีการศึกษา</h3>
          <form className="sp-inline-form" onSubmit={addYear} style={{ marginBottom: 14 }}>
            <input className="sp-input" style={{ flex: 1 }} placeholder="เช่น 2569"
              value={yearLabel} onChange={(e) => setYearLabel(e.target.value)} />
            <button className="sp-btn-primary" type="submit">เพิ่ม</button>
          </form>
          {data.academicYears.map((y) => (
            <div key={y.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "1px solid #f1f5f9",
            }}>
              <b>ปีการศึกษา {y.label}</b>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2].map((n) => (
                  <button key={n} className="sp-btn-ghost" style={{ padding: "4px 10px", fontSize: 13 }}
                    onClick={() => addTerm(y.id, n)}>+ เทอม {n}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sp-card">
          <h3>ภาคเรียน</h3>
          {ordered.map((t) => {
            const y = data.academicYears.find((x) => x.id === t.academicYearId);
            return (
              <div key={t.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14,
              }}>
                <span>ปี {y?.label} · เทอม {t.termNumber}</span>
                {t.isCurrent ? (
                  <span className="sp-badge ok">ภาคเรียนปัจจุบัน</span>
                ) : (
                  <button className="sp-btn-ghost" style={{ padding: "4px 10px", fontSize: 13 }}
                    onClick={() => setCurrent(t.id)}>ตั้งเป็นปัจจุบัน</button>
                )}
              </div>
            );
          })}
          <button className="sp-btn-danger" style={{ marginTop: 16 }} onClick={resetAll}>
            ⟲ ล้างข้อมูลทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * 12) NAV CONFIG
 * ========================================================== */
const NAV = {
  student: [
    { key: "home", label: "หน้าหลัก", Icon: IconHome },
    { key: "grades", label: "ผลการเรียน", Icon: IconGrade },
    { key: "assignments", label: "งานที่ได้รับ", Icon: IconTask },
    { key: "attendance", label: "การเข้าเรียน", Icon: IconCal },
    { key: "profile", label: "ข้อมูลส่วนตัว", Icon: IconUser },
  ],
  teacher: [
    { key: "home", label: "แดชบอร์ด", Icon: IconHome },
    { key: "grades", label: "บันทึกคะแนน", Icon: IconGrade },
    { key: "assignments", label: "งานมอบหมาย", Icon: IconTask },
    { key: "attendance", label: "เช็กชื่อ", Icon: IconCal },
  ],
  admin: [
    { key: "home", label: "ภาพรวมระบบ", Icon: IconHome },
    { key: "users", label: "บัญชีผู้ใช้", Icon: IconUser },
    { key: "academic", label: "ปีการศึกษา", Icon: IconGear },
  ],
};

/* ============================================================
 * 13) APP
 * ========================================================== */
export default function App() {
  const [data, setData] = useState(null);
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("home");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setData(loadState());
    setSession(loadSession());
  }, []);

  const persist = async (next) => {
    setData(next);
    await saveState(next);
  };

  const handleLogin = (s) => {
    setSession(s);
    saveSession(s);
    setPage("home");
  };
  const handleLogout = () => {
    setSession(null);
    saveSession(null);
    setPage("home");
  };

  if (!data) return <><GlobalStyle /><div className="sp-empty">กำลังโหลด...</div></>;
  if (!session) return <><GlobalStyle /><Login data={data} onLogin={handleLogin} /></>;

  const user = data.users.find((u) => u.id === session.userId);
  if (!user) {
    saveSession(null);
    return <><GlobalStyle /><Login data={data} onLogin={handleLogin} /></>;
  }

  const student = user.role === "student" ? data.students.find((s) => s.id === user.refId) : null;
  const teacher = user.role === "teacher" ? data.teachers.find((t) => t.id === user.refId) : null;
  const nav = NAV[user.role] || [];

  const go = (k) => { setPage(k); setNavOpen(false); };

  let body = null;
  if (user.role === "student" && student) {
    if (page === "home") body = <StudentDashboard data={data} student={student} go={go} />;
    else if (page === "grades") body = <StudentGrades data={data} student={student} />;
    else if (page === "assignments") body = <StudentAssignments data={data} student={student} persist={persist} />;
    else if (page === "attendance") body = <StudentAttendance data={data} student={student} />;
    else if (page === "profile") body = <StudentProfile student={student} />;
  } else if (user.role === "teacher" && teacher) {
    if (page === "home") body = <TeacherDashboard data={data} teacher={teacher} />;
    else if (page === "grades") body = <TeacherGrades data={data} persist={persist} />;
    else if (page === "assignments") body = <TeacherAssignments data={data} teacher={teacher} persist={persist} />;
    else if (page === "attendance") body = <TeacherAttendance data={data} teacher={teacher} persist={persist} />;
  } else if (user.role === "admin") {
    if (page === "home") body = <AdminDashboard data={data} />;
    else if (page === "users") body = <AdminUsers data={data} persist={persist} />;
    else if (page === "academic") body = <AdminAcademic data={data} persist={persist} />;
  }
  if (!body) body = <Empty text="ไม่พบหน้าที่ต้องการ" />;

  const roleName = { student: "นักเรียน", teacher: "ครูผู้สอน", admin: "ผู้ดูแลระบบ" }[user.role];

  return (
    <>
      <GlobalStyle />
      <div className="sp-app">
        <div className={`sp-backdrop ${navOpen ? "show" : ""}`} onClick={() => setNavOpen(false)} />

        <aside className={`sp-sidebar ${navOpen ? "open" : ""}`}>
          <div className="sp-logo">
            <div className="sp-logo-mark">SP</div>
            <div className="sp-logo-text">
              <b>{APP_SHORT}</b>
              <span>ระบบสารสนเทศนักเรียน</span>
            </div>
          </div>

          <div className="sp-nav-sep">เมนู{roleName}</div>
          {nav.map(({ key, label, Icon }) => (
            <button key={key} className={`sp-nav-item ${page === key ? "active" : ""}`}
              onClick={() => go(key)}>
              <Icon size={17} /> {label}
            </button>
          ))}

          <div className="sp-side-foot">
            <button className="sp-nav-item" onClick={handleLogout}>
              <IconOut size={17} /> ออกจากระบบ
            </button>
          </div>
        </aside>

        <div className="sp-main">
          <header className="sp-topbar">
            <button className="sp-burger sp-no-print" onClick={() => setNavOpen((v) => !v)}>
              <IconMenu size={18} />
            </button>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {nav.find((n) => n.key === page)?.label || APP_SHORT}
            </div>
            <div className="sp-topbar-user sp-no-print">
              <IconBell size={18} />
              <div style={{ textAlign: "right", lineHeight: 1.25 }}>
                <div style={{ fontWeight: 600 }}>{user.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{roleName}</div>
              </div>
              <div className="sp-avatar">{user.name.slice(0, 1)}</div>
            </div>
          </header>

          <main className="sp-content">{body}</main>
        </div>
      </div>
    </>
  );
}
