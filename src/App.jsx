import { useState, useEffect, useRef, Fragment } from "react";
import {
  Calendar, ClipboardList, BookOpen, User, LogOut,
  Users, CheckSquare, Megaphone, Plus, Trash2, AlertCircle, Home,
  Table, X, Sun, Moon, FileText, HelpCircle, Send, MessageSquare,
  Award, Inbox, TrendingUp, Check, XCircle, Paperclip, Shield, Camera, ArrowLeft, GripVertical, Menu, Info, CalendarClock, MessageCircleWarning, Eye, EyeOff, RefreshCw, Bell, Download
} from "lucide-react";

const STORAGE_KEY = "smudphok:data";

const SUPABASE_URL = "https://bgkvofxmvujqcbxrkxya.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJna3ZvZnhtdnVqcWNieHJreHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjAxNjMsImV4cCI6MjEwMDczNjE2M30.4kWPT6fVvGT7bT4FHdTmwxefBTZpNNX60fYkpH-98cM";

async function sbRest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase error ${res.status}: ${text.slice(0, 300)}`);
  }
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}

async function sbGetState() {
  const rows = await sbRest(`app_state?id=eq.${STORAGE_KEY}&select=data`);
  return rows && rows[0] ? rows[0].data : null;
}

async function sbSaveState(data) {
  const rows = await sbRest(`app_state?id=eq.${STORAGE_KEY}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
  });
  if (!rows || rows.length === 0) {
    await sbRest("app_state", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ id: STORAGE_KEY, data }),
    });
  }
}

async function sbConditionalSave(mutatorFn, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rows = await sbRest(`app_state?id=eq.${STORAGE_KEY}&select=data,updated_at`);
    const currentRow = rows && rows[0];
    if (!currentRow) {
      const nextData = mutatorFn(SEED);
      try {
        await sbRest("app_state", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ id: STORAGE_KEY, data: nextData }),
        });
        return nextData;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
        continue;
      }
    }
    const nextData = mutatorFn(currentRow.data);
    const result = await sbRest(
      `app_state?id=eq.${STORAGE_KEY}&updated_at=eq.${encodeURIComponent(currentRow.updated_at)}`,
      { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ data: nextData, updated_at: new Date().toISOString() }) }
    );
    if (result && result.length > 0) {
      return nextData;
    }
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
  }
  throw new Error("บันทึกไม่สำเร็จ เนื่องจากมีคนบันทึกพร้อมกันหลายครั้งเกินไป กรุณาลองใหม่อีกครั้ง");
}

async function sbUploadFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("ไฟล์ใหญ่เกินไป (จำกัดไม่เกิน 10MB ต่อไฟล์)");
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/files/${encodeURIComponent(path)}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`อัปโหลดไฟล์ไม่สำเร็จ: ${text.slice(0, 200)}`);
  }
  const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/files/${encodeURIComponent(path)}`;
  return { fileUrl, fileName: file.name, fileSize: file.size, fileType: file.type };
}

function sbDownloadFile(fileUrl, fileName) {
  const a = document.createElement("a");
  a.href = fileUrl;
  a.download = fileName || "download";
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Utility: Export data to CSV with UTF-8 BOM for Thai Excel support
function exportToCSV(data, fileName = "export.csv") {
  if (!data || data.length === 0) {
    alert("ไม่มีข้อมูลสำหรับส่งออก");
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(","));
  for (const row of data) {
    const values = headers.map((header) => {
      const escaped = ("" + (row[header] ?? "")).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }
  const csvString = csvRows.join("\n");
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const LOGO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAb8BvwMBEQACEQEDEQH/xAAcAAEAAgMBAQEAAAAAAAAAAAAABgcDBAUBAgj/xABVEAABAwMBBAYGBgYIAwQIBwABAgMEAAURBhIhMUEHE1FhcYEUIjKRobEVI0JSwdEzQ2JygpIkNFOissLh8BZEk2Nzg9IXJTVFVHSUsyY2VWSE0/H/xAAbAQEAAwEBAQEAAAAAAAAAAAAAAQIEAwUGB//EADoRAAIBAwMBBQYFBAIBBQEAAAABAgMEERIhMUEFEyJRYRQycYGRoUJSsdHwFSPB4TNiQyRTcpLxgv/aAAwDAQACEQMRAD8AvGgFAKAUAoBQCgFAKAUAoBQCgFAKAUAoBQCgFAKAUAoBQCgFAKAUBozQGld7rBs8JUu4vpSYTzVxF7AOZ7qtCDm8RQK91V0k3K6lUe07UCFw2gfrVjvP2fAe+vUo2cIbz3ZRyIMSVEkk4JPEHtrZt5FRU5AoCQ6L1lefOlKY75fig/wBVPOUY7jxT5e6s9W2p1Odn5ls4Li0nrK2alQEsKLEwLK4rpG0O8H7Q7/lXVLeep78Fk8kkyK4kntAKAUAoBQCgFAKAUAoBQCgFAKAUAoBQCgFAKAUAoBQCgFAKAUAoBQCgFAKAUAoBQCgFAKAUAoB5mgGaAZoD2gFAKE8TQFV1jri3abQWR/SrgRlMds+z3rP2R8a0ULadX0RDZSd9vU+/TTKubxcWNyED2Gx2JHL8a9elShSWIlGzjV0IFQKAUAfTbC2nEOMrU24ghSVJPCk9oNMJrDBZukOk9j5qU7x++PxH3V51eyx4qf0LqRaUWU1LjomRXTOPL7Uq2047Z7jXp0LCvKnpTNSLh0h0jf8AQn2aW7u25O8n/lA/LhWunY15u3Jm0kjaWkZpZpYlQxUeR9kE7U/wBfvV+Vcm1l3+a5f5F5tG/wBOc/1F5v6J7o96U3Y6knd2qg25K1+S4Z+Pzru+zc2rOSJbN6H00s5B+kR45qA2o8q2v7CvzRkP4jZ0OaP0hS2xJtziFp3lpxW0hX+E+f50PZWfWOTYj9qNq01Dabm0TBeK3eW3Otoq/fSP4vCq+vZQ7XmGkja0g1TNSxUeW7t2o3p/7v0rNfl3R6UvQzYx8tL7J93q+Xf8A2v8AQ1R17f8AEj7/APE8/wC5/wAv6K9mU/Gj3H+VvR6f8j9j//Z";

async function persistentSet(key, value) {
  try {
    if (window.storage && typeof window.storage.set === "function") {
      await window.storage.set(key, value, false);
      return;
    }
  } catch (e) {}
  try { localStorage.setItem(key, value); } catch (e) {}
}

async function persistentGet(key) {
  try {
    if (window.storage && typeof window.storage.get === "function") {
      const res = await window.storage.get(key, false);
      return res ? res.value : null;
    }
  } catch (e) {}
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

async function persistentDelete(key) {
  try {
    if (window.storage && typeof window.storage.delete === "function") {
      await window.storage.delete(key, false);
      return;
    }
  } catch (e) {}
  try { localStorage.removeItem(key); } catch (e) {}
}

function genId(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function withAudit(data, actorUsername, action, entityType, entityId, before, after) {
  const entry = {
    id: genId("audit"), actorUsername, action, entityType, entityId,
    before: before ?? null, after: after ?? null,
    createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
  };
  return { ...data, auditLog: [...(data.auditLog || []), entry] };
}

function pushNotification(data, toUsername, type, title, body, relatedType, relatedId) {
  const notif = {
    id: genId("notif"), toUsername, type, title, body, isRead: false,
    createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    relatedType: relatedType || null, relatedId: relatedId || null,
  };
  return { ...data, notifications: [...(data.notifications || []), notif] };
}

const BANNED_WORDS = [
  "เหี้ย", "สัส", "สัตว์", "ไอ้สัตว์", "ตอแหล", "ระยำ", "อีดอก", "กะหรี่",
  "ควย", "หี", "เย็ด", "แม่มึง", "พ่อมึง", "ไอ้ควาย", "อีควาย", "ไอ้เหี้ย", "อีเหี้ย",
  "fuck", "shit", "bitch", "asshole", "cunt", "bastard", "dick", "whore", "slut",
];

function containsProfanity(text) {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((w) => lower.includes(w.toLowerCase()));
}

function fmtFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function scoreToPoint(score) {
  if (score >= 80) return 4;
  if (score >= 75) return 3.5;
  if (score >= 70) return 3;
  if (score >= 65) return 2.5;
  if (score >= 60) return 2;
  if (score >= 55) return 1.5;
  if (score >= 50) return 1;
  return 0;
}

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

const STATUS_META = {
  present: { label: "มา", color: "var(--accent)" },
  late: { label: "สาย", color: "#9A6A00" },
  absent: { label: "ขาด", color: "var(--accent2)" },
  leave: { label: "ลา", color: "#5B5FBF" },
};

const EVENT_META = {
  holiday: { label: "วันหยุด", color: "var(--accent2)" },
  activity: { label: "กิจกรรม", color: "var(--accent)" },
  exam: { label: "สอบ", color: "#9A6A00" },
};

const PERIOD_TIMES = ["08.30-09.25", "09.25-10.20", "10.20-11.15", "11.15-12.10", "12.10-13.05", "13.05-14.00", "14.00-14.55", "14.55-15.50"];
const DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
const LUNCH_INDEX = 4;

function buildAttendanceSeed() {
  const dates = ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24"];
  const patterns = {
    s1: {},
    s2: { "2026-07-15": "late", "2026-07-22": "absent" },
    s3: { "2026-07-14": "absent", "2026-07-21": "absent", "2026-07-17": "leave" },
    s4: { "2026-07-20": "late" },
  };
  const out = [];
  let idx = 1;
  for (const sid of ["s1", "s2", "s3", "s4"]) {
    for (const d of dates) {
      out.push({ id: "at" + idx++, studentId: sid, date: d, status: patterns[sid][d] || "present" });
    }
  }
  return out;
}

const SEED = {
  academicYears: [
    { id: "ay1", label: "2569", isCurrent: true },
  ],
  terms: [
    { id: "t1", academicYearId: "ay1", termNumber: 1, isCurrent: true, status: "open" },
    { id: "t2", academicYearId: "ay1", termNumber: 2, isCurrent: false, status: "open" },
  ],
  homeroomAssignments: [
    { class: "ปวส.2/3", teacherUsername: "kruping" },
  ],
  subjectTeacherAssignments: [
    { id: "sta1", teacherUsername: "kruping", subject: "วิเคราะห์และออกแบบระบบเชิงวัตถุ", class: "ปวส.2/3", termId: "t1" },
    { id: "sta2", teacherUsername: "kruping", subject: "การเป็นผู้ประกอบการ", class: "ปวส.2/3", termId: "t1" },
    { id: "sta3", teacherUsername: "kruping", subject: "เทคนิคการนำเสนอ", class: "ปวช.1/1", termId: "t1" },
  ],
  reportCards: [],
  gradeUnlockRequests: [],
  auditLog: [],
  notifications: [],
  notificationPrefs: {},
  users: [
    { username: "admin", password: "1234", role: "admin", name: "ผู้ดูแลระบบ", email: "admin@btad.ac.th" },
    { username: "kruping", password: "1234", role: "teacher", name: "ครูปิง สอนดี", email: "kruping@btad.ac.th" },
    { username: "std01", password: "1234", role: "student", studentId: "s1", email: "std01@btad.ac.th" },
    { username: "std02", password: "1234", role: "student", studentId: "s2", email: "std02@btad.ac.th" },
    { username: "std03", password: "1234", role: "student", studentId: "s3", email: "std03@btad.ac.th" },
    { username: "std04", password: "1234", role: "student", studentId: "s4", email: "std04@btad.ac.th" },
    { username: "peeranat_p", password: "1234", role: "student", studentId: "s5", email: "peeranat.p@gmail.com" },
    { username: "suchada.k", password: "1234", role: "student", studentId: "s6", email: "suchada.kaewsri@gmail.com" },
  ],
  students: [
    { id: "s1", name: "ณัฐวุฒิ ใจดี", class: "ปวส.2/3", number: 1, studentCode: "6621230001" },
    { id: "s2", name: "พิมพ์ชนก แสงทอง", class: "ปวส.2/3", number: 2, studentCode: "6621230002" },
    { id: "s3", name: "ธนกฤต วงศ์สุข", class: "ปวส.2/3", number: 3, studentCode: "6621230003" },
    { id: "s4", name: "กัญญาณัฐ ศรีสุข", class: "ปวส.2/3", number: 4, studentCode: "6621230004" },
    { id: "s5", name: "พีรนัฐ พูนสวัสดิ์", class: "ปวส.2/3", number: 5, studentCode: "6621230005" },
    { id: "s6", name: "สุชาดา แก้วศรี", class: "ปวส.2/3", number: 6, studentCode: "6621230006" },
  ],
  grades: [
    { id: "g1", studentId: "s1", subject: "คณิตศาสตร์", term: "เทอม 1/2569", score: 78, termId: "t1" },
    { id: "g2", studentId: "s1", subject: "ภาษาอังกฤษ", term: "เทอม 1/2569", score: 85, termId: "t1" },
    { id: "g3", studentId: "s1", subject: "วิทยาศาสตร์", term: "เทอม 1/2569", score: 72, termId: "t1" },
    { id: "g4", studentId: "s1", subject: "ภาษาไทย", term: "เทอม 1/2569", score: 90, termId: "t1" },
    { id: "g5", studentId: "s1", subject: "สังคมศึกษา", term: "เทอม 1/2569", score: 88, termId: "t1" },
    { id: "g6", studentId: "s2", subject: "คณิตศาสตร์", term: "เทอม 1/2569", score: 92, termId: "t1" },
    { id: "g7", studentId: "s2", subject: "ภาษาอังกฤษ", term: "เทอม 1/2569", score: 80, termId: "t1" },
    { id: "g8", studentId: "s2", subject: "วิทยาศาสตร์", term: "เทอม 1/2569", score: 88, termId: "t1" },
    { id: "g9", studentId: "s2", subject: "ภาษาไทย", term: "เทอม 1/2569", score: 76, termId: "t1" },
    { id: "g10", studentId: "s2", subject: "สังคมศึกษา", term: "เทอม 1/2569", score: 82, termId: "t1" },
    { id: "g11", studentId: "s3", subject: "คณิตศาสตร์", term: "เทอม 1/2569", score: 65, termId: "t1" },
    { id: "g12", studentId: "s3", subject: "ภาษาอังกฤษ", term: "เทอม 1/2569", score: 70, termId: "t1" },
    { id: "g13", studentId: "s3", subject: "วิทยาศาสตร์", term: "เทอม 1/2569", score: 60, termId: "t1" },
    { id: "g14", studentId: "s3", subject: "ภาษาไทย", term: "เทอม 1/2569", score: 75, termId: "t1" },
    { id: "g15", studentId: "s3", subject: "สังคมศึกษา", term: "เทอม 1/2569", score: 68, termId: "t1" },
    { id: "g16", studentId: "s4", subject: "คณิตศาสตร์", term: "เทอม 1/2569", score: 95, termId: "t1" },
    { id: "g17", studentId: "s4", subject: "ภาษาอังกฤษ", term: "เทอม 1/2569", score: 91, termId: "t1" },
    { id: "g18", studentId: "s4", subject: "วิทยาศาสตร์", term: "เทอม 1/2569", score: 89, termId: "t1" },
    { id: "g19", studentId: "s4", subject: "ภาษาไทย", term: "เทอม 1/2569", score: 93, termId: "t1" },
    { id: "g20", studentId: "s4", subject: "สังคมศึกษา", term: "เทอม 1/2569", score: 90, termId: "t1" },
  ],
  attendance: buildAttendanceSeed(),
  assignments: [
    { id: "a1", title: "ส่งรายงานการวิเคราะห์ระบบเชิงวัตถุ", subject: "วิเคราะห์และออกแบบระบบเชิงวัตถุ", class: "ปวส.2/3", dueDate: "2026-08-01", description: "ส่งรูปเล่มรายงานพร้อม Use Case Diagram" },
    { id: "a2", title: "แบบฝึกหัดคณิตศาสตร์และสถิติ บทที่ 4", subject: "คณิตศาสตร์และสถิติพื้นฐานอาชีพ", class: "ปวส.2/3", dueDate: "2026-08-02", description: "ทำแบบฝึกหัดข้อ 1-20 หน้า 88" },
    { id: "a3", title: "คลิปนำเสนอสินค้า (เทคนิคการนำเสนอ)", subject: "เทคนิคการนำเสนอ", class: "ปวส.2/3", dueDate: "2026-08-05", description: "อัดคลิปนำเสนอสินค้าสมมติ ความยาว 3-5 นาที" },
    { id: "a4", title: "ออกแบบสื่อดิจิทัลโปรโมทกิจกรรม", subject: "การผลิตสื่อดิจิทัลเพื่อธุรกิจดิจิทัล", class: "ปวส.2/3", dueDate: "2026-08-08", description: "ออกแบบโปสเตอร์/อินโฟกราฟิก ส่งเป็นไฟล์ภาพ" },
    { id: "a5", title: "แผนธุรกิจเบื้องต้น (การเป็นผู้ประกอบการ)", subject: "การเป็นผู้ประกอบการ", class: "ปวส.2/3", dueDate: "2026-08-10", description: "เขียนแผนธุรกิจอย่างย่อ 3-5 หน้า" },
    { id: "a6", title: "ความก้าวหน้าโครงงานเทคโนโลยีธุรกิจดิจิทัล 1", subject: "โครงงานด้านเทคโนโลยีธุรกิจดิจิทัล 1", class: "ปวส.2/3", dueDate: "2026-07-30", description: "ส่งรายงานความก้าวหน้าโครงงาน (ครั้งที่ 1)" },
    { id: "a7", title: "แบบฝึกหัดโปรแกรมมัลติมีเดีย", subject: "การใช้โปรแกรมมัลติมีเดีย", class: "ปวส.2/3", dueDate: "2026-08-12", description: "ตัดต่อวิดีโอสั้นความยาวไม่เกิน 1 นาที" },
  ],
  events: [
    { id: "e1", title: "วันเฉลิมพระชนมพรรษา ร.10", date: "2026-07-28", type: "holiday" },
    { id: "e2", title: "วันแม่แห่งชาติ", date: "2026-08-12", type: "holiday" },
    { id: "e3", title: "กีฬาสีประจำปี", date: "2026-08-20", type: "activity" },
    { id: "e4", title: "สอบกลางภาค", date: "2026-09-01", type: "exam" },
  ],
  announcements: [
    { id: "n1", title: "แจ้งเตรียมชุดกีฬาสี", body: "ให้นักเรียนทุกคนเตรียมชุดกีฬาสีของบ้านตนเองมาในวันที่ 20 ส.ค.", date: "2026-07-25" },
  ],
  timetables: [
    {
      id: "tt1",
      class: "ปวส.2/3",
      department: "เทคโนโลยีธุรกิจดิจิทัล",
      advisor: "อ.สราวุธ เชื้อทอง",
      room: "523",
      term: "เทอม 1/2569",
      schedule: {
        "จันทร์": [
          { code: "30200-2013", teacher: "อ.รัตนณี", room: "523" },
          { code: "30200-2013", teacher: "อ.รัตนณี", room: "523" },
          { code: "99602501", teacher: "อ.สิริพันธุ์", room: "523" },
          { code: "99602501", teacher: "อ.สิริพันธุ์", room: "523" },
          null,
          { code: "31910-2003", teacher: "อ.ดฤณ", room: "523" },
          { code: "31910-2003", teacher: "อ.ดฤณ", room: "523" },
          null,
        ],
        "อังคาร": [
          { code: "30000-1401", teacher: "อ.บุษกร", room: "523" },
          { code: "30000-1401", teacher: "อ.บุษกร", room: "523" },
          { code: "30001-1001", teacher: "อ.พชรภูมิ", room: "523" },
          { code: "30001-1001", teacher: "อ.พชรภูมิ", room: "523" },
          null, null, null, null,
        ],
        "พุธ": [
          { code: "30001-1001", teacher: "อ.พชรภูมิ", room: "523" },
          { code: "30001-1001", teacher: "อ.พชรภูมิ", room: "523" },
          { code: "30000-2002", teacher: "อ.ณิชกุล", room: "523" },
          { code: "30000-2002", teacher: "อ.ณิชกุล", room: "523" },
          null, null, null, null,
        ],
        "พฤหัสบดี": [
          { code: "31910-2018", teacher: "อ.วิชญ์เขจน์", room: "523" },
          { code: "31910-2018", teacher: "อ.วิชญ์เขจน์", room: "523" },
          { code: "31910-2030", teacher: "อ.สิทธิพร", room: "523" },
          { code: "31910-2030", teacher: "อ.สิทธิพร", room: "523" },
          null,
          { code: "HR", teacher: "อ.สราวุธ", room: "523" },
          { code: "30200-2013", teacher: "อ.รัตนณี", room: "523" },
          { code: "30200-2013", teacher: "อ.รัตนณี", room: "523" },
        ],
        "ศุกร์": [
          { code: "31910-2003", teacher: "อ.ดฤณ", room: "523" },
          { code: "31910-2003", teacher: "อ.ดฤณ", room: "523" },
          { code: "31910-2018", teacher: "อ.วิชญ์เวชน์", room: "523" },
          { code: "31910-2018", teacher: "อ.วิชญ์เวชน์", room: "523" },
          null,
          { code: "30000-1401", teacher: "อ.บุษกร", room: "523" },
          null, null,
        ],
      },
      legend: [
        { code: "30001-1001", name: "การเป็นผู้ประกอบการ" },
        { code: "30200-2013", name: "เทคนิคการนำเสนอ" },
        { code: "99602501", name: "การใช้โปรแกรมมัลติมีเดีย" },
        { code: "31910-2018", name: "การผลิตสื่อดิจิทัลเพื่อธุรกิจดิจิทัล" },
        { code: "31910-2003", name: "วิเคราะห์และออกแบบระบบเชิงวัตถุ" },
        { code: "HR", name: "Homeroom" },
        { code: "30000-2002", name: "กิจกรรมนันทนาการเพื่อธุรกิจดิจิทัล" },
        { code: "30000-1401", name: "คณิตศาสตร์และสถิติพื้นฐานอาชีพ" },
        { code: "31910-2030", name: "โครงงานด้านเทคโนโลยีธุรกิจดิจิทัล 1" },
      ],
    },
  ],
  materials: [
    { id: "m1", title: "สไลด์บทที่ 1 การเป็นผู้ประกอบการ", subject: "การเป็นผู้ประกอบการ", class: "ปวส.2/3", type: "slide", url: "https://example.com/slide1.pdf", uploadedAt: "2026-07-20" },
    { id: "m2", title: "เอกสารประกอบ การวิเคราะห์ระบบเชิงวัตถุ บทที่ 3", subject: "วิเคราะห์และออกแบบระบบเชิงวัตถุ", class: "ปวส.2/3", type: "doc", url: "https://example.com/doc3.pdf", uploadedAt: "2026-07-22" },
    { id: "m3", title: "คลิปย้อนหลัง คาบเทคนิคการนำเสนอ", subject: "เทคนิคการนำเสนอ", class: "ปวส.2/3", type: "video", url: "https://example.com/video1", uploadedAt: "2026-07-24" },
  ],
  quizzes: [
    {
      id: "q1",
      title: "แบบทดสอบย่อย: การเป็นผู้ประกอบการ บทที่ 1",
      subject: "การเป็นผู้ประกอบการ",
      class: "ปวส.2/3",
      questions: [
        { id: "qq1", text: "ผู้ประกอบการที่ดีควรมีคุณสมบัติใดเป็นอันดับแรก", choices: ["กล้าเสี่ยงอย่างมีเหตุผล", "หลีกเลี่ยงความเสี่ยงทุกชนิด", "รอโอกาสโดยไม่ลงมือทำ", "ทำตามคนอื่นเสมอ"], correctIndex: 0 },
        { id: "qq2", text: "แผนธุรกิจ (Business Plan) มีไว้เพื่ออะไร", choices: ["ใช้โชว์เพื่อน", "วางแผนและสื่อสารแนวทางธุรกิจ", "ไม่มีประโยชน์", "ใช้แทนบัญชีรายรับรายจ่าย"], correctIndex: 1 },
      ],
    },
  ],
  quizAttempts: [],
  submissions: [],
  leaveRequests: [],
  messages: [],
  assignmentComments: [],
  behaviorLogs: [
    { id: "b1", studentId: "s1", points: 5, reason: "ช่วยงานกิจกรรมวันไหว้ครู", date: "2026-07-10" },
  ],
  portfolioEntries: [
    { id: "p1", studentId: "s1", activity: "จิตอาสาทำความสะอาดชุมชน", hours: 4, date: "2026-07-05" },
  ],
  classes: [
    "ปวช.1/1", "ปวช.1/2", "ปวช.1/3", "ปวช.1/4", "ปวช.1/5",
    "ปวช.2/1", "ปวช.2/2", "ปวช.2/3", "ปวช.2/4", "ปวช.2/5",
    "ปวช.3/1", "ปวช.3/2", "ปวช.3/3", "ปวช.3/4", "ปวช.3/5",
    "ปวส.1/1", "ปวส.1/2", "ปวส.1/3", "ปวส.1/4", "ปวส.1/5",
    "ปวส.2/1", "ปวส.2/2", "ปวส.2/3", "ปวส.2/4", "ปวส.2/5",
  ],
  siteContent: {
    schoolName: "วิทยาลัยอาชีวศึกษาเทคนิคบริหารธุรกิจกรุงเทพ",
    tagline: "ระบบสมุดพกออนไลน์ · ติดตามผลการเรียนและกิจกรรมนักเรียน",
    projectName: "Web-Based Student Grade Reporting System",
    appShortName: "B.T.AD",
    aboutDescription: "ระบบสมุดพกออนไลน์สำหรับติดตามผลการเรียน การเข้าเรียน งานที่มอบหมาย ตารางเรียน และกิจกรรมของนักเรียน",
  },
};

function Stamp({ children, color = "var(--accent)", size = 56 }) {
  return (
    <div className="sp-stamp" style={{ "--stamp-color": color, width: size, height: size, fontSize: size * 0.24 }}>
      {children}
    </div>
  );
}

function Avatar({ name, size = 64, avatarDataUrl }) {
  if (avatarDataUrl) {
    return <img src={avatarDataUrl} alt={name} className="sp-avatar sp-avatar-img" style={{ width: size, height: size }} />;
  }
  const initials = name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("");
  return <div className="sp-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</div>;
}

function Marquee({ children }) {
  return (
    <div className="sp-marquee">
      <div className="sp-marquee-track">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </div>
    </div>
  );
}

function TimetableGrid({ tt }) {
  if (!tt) return null;
  return (
    <div className="sp-timetable-wrap">
      <table className="sp-table sp-timetable">
        <thead>
          <tr>
            <th>วัน / เวลา</th>
            {PERIOD_TIMES.map((t, i) => (
              <th key={i}>{t}<div className="sp-period-num">คาบ {i + 1}</div></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, dayIdx) => (
            <tr key={day}>
              <td className="sp-day-cell">{day}</td>
              {PERIOD_TIMES.map((_, pIdx) => {
                if (pIdx === LUNCH_INDEX) {
                  if (dayIdx === 0) return <td key={pIdx} rowSpan={DAYS.length} className="sp-lunch-cell">พักกลางวัน</td>;
                  return null;
                }
                const slot = tt.schedule && tt.schedule[day] ? tt.schedule[day][pIdx] : null;
                return (
                  <td key={pIdx} className="sp-timetable-cell">
                    {slot ? (
                      <>
                        <div className="sp-tt-code">{slot.code}</div>
                        <div className="sp-tt-teacher">{slot.teacher}</div>
                        <div className="sp-tt-room">{slot.room}</div>
                      </>
                    ) : <span className="sp-tt-empty">-</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {tt.legend && tt.legend.length > 0 && (
        <div className="sp-legend-grid">
          {tt.legend.map((l, i) => (
            <div key={i} className="sp-legend-item"><span className="sp-legend-dot" />{l.code} <span className="sp-legend-name">{l.name}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentTimetable({ data, student }) {
  const tt = (data.timetables || []).find((t) => t.class === student.class);
  return (
    <div>
      <h1>ตารางเรียน</h1>
      {!tt ? (
        <div className="sp-card"><div className="sp-empty">ยังไม่มีตารางเรียนสำหรับชั้น {student.class}</div></div>
      ) : (
        <>
          <div className="sp-card">
            <div className="sp-tt-header-grid">
              <div><div className="sp-stat-label">ชั้น</div><div className="sp-tt-header-value">{tt.class}</div></div>
              <div><div className="sp-stat-label">แผนก</div><div className="sp-tt-header-value">{tt.department || "-"}</div></div>
              <div><div className="sp-stat-label">ห้องประจำ</div><div className="sp-tt-header-value">{tt.room || "-"}</div></div>
              <div><div className="sp-stat-label">อาจารย์ที่ปรึกษา</div><div className="sp-tt-header-value">{tt.advisor || "-"}</div></div>
              <div><div className="sp-stat-label">ภาคเรียน</div><div className="sp-tt-header-value">{tt.term || "-"}</div></div>
            </div>
          </div>
          <div className="sp-card"><TimetableGrid tt={tt} /></div>
        </>
      )}
    </div>
  );
}

function TeacherMySchedule({ data, session }) {
  const mySlots = {};
  let totalPeriods = 0;
  DAYS.forEach((day) => { mySlots[day] = Array(8).fill(null); });

  (data.timetables || []).forEach((tt) => {
    DAYS.forEach((day) => {
      const daySlots = (tt.schedule && tt.schedule[day]) || [];
      daySlots.forEach((slot, pIdx) => {
        if (slot && slot.teacher === session.name) {
          mySlots[day][pIdx] = { code: slot.code, room: slot.room, class: tt.class };
          totalPeriods++;
        }
      });
    });
  });

  const teachingClasses = [...new Set(
    (data.timetables || []).flatMap((tt) =>
      DAYS.flatMap((day) => ((tt.schedule && tt.schedule[day]) || []).filter((s) => s && s.teacher === session.name).map(() => tt.class))
    )
  )];

  return (
    <div>
      <h1>ตารางสอนของฉัน</h1>
      <div className="sp-stats-grid">
        <div className="sp-card sp-stat"><div className="sp-stat-label">คาบสอนต่อสัปดาห์</div><div className="sp-stat-value">{totalPeriods}</div></div>
        <div className="sp-card sp-stat"><div className="sp-stat-label">จำนวนห้องที่สอน</div><div className="sp-stat-value">{teachingClasses.length}</div></div>
      </div>
      {totalPeriods === 0 ? (
        <div className="sp-card">
          <div className="sp-empty">ยังไม่พบคาบสอนที่ตรงกับชื่อบัญชีนี้ ("{session.name}") ในตารางเรียนของห้องใดเลย</div>
        </div>
      ) : (
        <div className="sp-card">
          <div className="sp-timetable-wrap">
            <table className="sp-table sp-timetable">
              <thead>
                <tr>
                  <th>วัน / เวลา</th>
                  {PERIOD_TIMES.map((t, i) => (
                    <th key={i}>{t}<div className="sp-period-num">คาบ {i + 1}</div></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dayIdx) => (
                  <tr key={day}>
                    <td className="sp-day-cell">{day}</td>
                    {PERIOD_TIMES.map((_, pIdx) => {
                      if (pIdx === LUNCH_INDEX) {
                        if (dayIdx === 0) return <td key={pIdx} rowSpan={DAYS.length} className="sp-lunch-cell">พักกลางวัน</td>;
                        return null;
                      }
                      const slot = mySlots[day][pIdx];
                      return (
                        <td key={pIdx} className="sp-timetable-cell">
                          {slot ? (
                            <>
                              <div className="sp-tt-code">{slot.code}</div>
                              <div className="sp-tt-teacher">ห้อง {slot.class}</div>
                              <div className="sp-tt-room">{slot.room}</div>
                            </>
                          ) : <span className="sp-tt-empty">-</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherTimetable({ data, persist }) {
  const classes = [...new Set([...(data.timetables || []).map((t) => t.class), ...data.students.map((s) => s.class)])];
  const [selectedClass, setSelectedClass] = useState(classes[0] || "");
  const [classInput, setClassInput] = useState("");
  const tt = (data.timetables || []).find((t) => t.class === selectedClass);

  const [department, setDepartment] = useState(tt ? tt.department : "");
  const [advisor, setAdvisor] = useState(tt ? tt.advisor : "");
  const [room, setRoom] = useState(tt ? tt.room : "");
  const [term, setTerm] = useState(tt ? tt.term : "เทอม 1/2569");

  useEffect(() => {
    setDepartment(tt ? tt.department || "" : "");
    setAdvisor(tt ? tt.advisor || "" : "");
    setRoom(tt ? tt.room || "" : "");
    setTerm(tt ? tt.term || "เทอม 1/2569" : "เทอม 1/2569");
  }, [selectedClass]);

  const [day, setDay] = useState(DAYS[0]);
  const [period, setPeriod] = useState(1);
  const [code, setCode] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [cellRoom, setCellRoom] = useState("");
  const [double, setDouble] = useState(false);

  const [legendCode, setLegendCode] = useState("");
  const [legendName, setLegendName] = useState("");

  function upsert(updater) {
    const list = data.timetables || [];
    const existing = list.find((t) => t.class === selectedClass);
    const base = existing || { id: genId("tt"), class: selectedClass, department: "", advisor: "", room: "", term: "เทอม 1/2569", schedule: {}, legend: [] };
    const nextTT = updater({ ...base });
    const nextList = existing ? list.map((t) => (t.class === selectedClass ? nextTT : t)) : [...list, nextTT];
    persist({ ...data, timetables: nextList });
  }

  function selectClass() {
    const name = classInput.trim();
    if (!name) return;
    setSelectedClass(name);
    setClassInput("");
  }

  function saveHeader() {
    if (!selectedClass) return;
    upsert((t) => ({ ...t, department, advisor, room, term }));
  }

  function saveCell() {
    if (!selectedClass || !code) return;
    upsert((t) => {
      const sched = { ...t.schedule };
      const slots = sched[day] ? [...sched[day]] : Array(8).fill(null);
      const entry = { code, teacher: teacherName, room: cellRoom };
      slots[period - 1] = entry;
      if (double) {
        let nextIdx = period;
        if (nextIdx === LUNCH_INDEX) nextIdx = LUNCH_INDEX + 1;
        if (nextIdx < 8) slots[nextIdx] = entry;
      }
      sched[day] = slots;
      return { ...t, schedule: sched };
    });
    setCode(""); setTeacherName(""); setCellRoom(""); setDouble(false);
  }

  function deleteCell() {
    if (!selectedClass) return;
    upsert((t) => {
      const sched = { ...t.schedule };
      const slots = sched[day] ? [...sched[day]] : Array(8).fill(null);
      slots[period - 1] = null;
      sched[day] = slots;
      return { ...t, schedule: sched };
    });
  }

  function addLegend() {
    if (!selectedClass || !legendCode || !legendName) return;
    upsert((t) => ({ ...t, legend: [...(t.legend || []), { code: legendCode, name: legendName }] }));
    setLegendCode(""); setLegendName("");
  }

  function removeLegend(idx) {
    upsert((t) => ({ ...t, legend: (t.legend || []).filter((_, i) => i !== idx) }));
  }

  return (
    <div>
      <h1>ตารางเรียน</h1>
      <div className="sp-card">
        <div className="sp-card-title">เลือก/สร้างตารางของชั้นเรียน</div>
        <div className="sp-inline-form">
          <select className="sp-select" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            {classes.length === 0 && <option value="">- ยังไม่มีชั้นเรียน -</option>}
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="sp-input" placeholder="พิมพ์ชื่อชั้นใหม่ เช่น ปวส.1/1" value={classInput} onChange={(e) => setClassInput(e.target.value)} />
          <button className="sp-btn-primary" type="button" onClick={selectClass}><Plus size={16} /> สร้าง/เลือก</button>
        </div>
      </div>

      {selectedClass && (
        <>
          <div className="sp-card">
            <div className="sp-card-title">ข้อมูลหัวตาราง — {selectedClass}</div>
            <div className="sp-form-grid">
              <div><label className="sp-label">แผนก</label><input className="sp-input" value={department} onChange={(e) => setDepartment(e.target.value)} /></div>
              <div><label className="sp-label">อาจารย์ที่ปรึกษา</label><input className="sp-input" value={advisor} onChange={(e) => setAdvisor(e.target.value)} /></div>
              <div><label className="sp-label">ห้องประจำ</label><input className="sp-input" value={room} onChange={(e) => setRoom(e.target.value)} /></div>
              <div><label className="sp-label">ภาคเรียน</label><input className="sp-input" value={term} onChange={(e) => setTerm(e.target.value)} /></div>
              <button className="sp-btn-primary" type="button" onClick={saveHeader}>บันทึกข้อมูลหัวตาราง</button>
            </div>
          </div>

          <div className="sp-card">
            <div className="sp-card-title">เพิ่ม/แก้ไขคาบเรียน</div>
            <div className="sp-form-grid">
              <div>
                <label className="sp-label">วัน</label>
                <select className="sp-select" value={day} onChange={(e) => setDay(e.target.value)}>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="sp-label">คาบที่</label>
                <select className="sp-select" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
                  {PERIOD_TIMES.map((_, i) => i !== LUNCH_INDEX && <option key={i} value={i + 1}>คาบ {i + 1} ({PERIOD_TIMES[i]})</option>)}
                </select>
              </div>
              <div><label className="sp-label">รหัสวิชา</label><input className="sp-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="เช่น 30001-1001" /></div>
              <div><label className="sp-label">ผู้สอน</label><input className="sp-input" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="เช่น อ.รัตนณี" /></div>
              <div><label className="sp-label">ห้องเรียน</label><input className="sp-input" value={cellRoom} onChange={(e) => setCellRoom(e.target.value)} placeholder="เช่น 523" /></div>
              <div className="sp-checkbox-row">
                <label><input type="checkbox" checked={double} onChange={(e) => setDouble(e.target.checked)} /> สอนติดกัน 2 คาบ</label>
              </div>
              <div style={{ display: "flex", gap: "10px", gridColumn: "span 2" }}>
                <button className="sp-btn-primary" type="button" onClick={saveCell}>บันทึกคาบเรียน</button>
                <button className="sp-icon-btn" type="button" onClick={deleteCell} title="ลบคาบนี้"><Trash2 size={16} /> ลบคาบนี้</button>
              </div>
            </div>
          </div>

          <div className="sp-card">
            <div className="sp-card-title">คำอธิบายรหัสวิชา (Legend)</div>
            <div className="sp-inline-form">
              <input className="sp-input" placeholder="รหัสวิชา" value={legendCode} onChange={(e) => setLegendCode(e.target.value)} />
              <input className="sp-input" placeholder="ชื่อวิชาเต็ม" value={legendName} onChange={(e) => setLegendName(e.target.value)} />
              <button className="sp-btn-primary" type="button" onClick={addLegend}><Plus size={16} /> เพิ่ม</button>
            </div>
            {tt && tt.legend && tt.legend.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                {tt.legend.map((l, i) => (
                  <div key={i} className="sp-list-row">
                    <div className="sp-list-title">{l.code} — {l.name}</div>
                    <button className="sp-icon-btn" onClick={() => removeLegend(i)}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RegisterForm({ classOptions, onRegister, onBackToLogin }) {
  const [name, setName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [className, setClassName] = useState(classOptions[0] || "");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name || !studentCode || !className || !username || !email || !password) {
      setError("กรอกข้อมูลให้ครบทุกช่องครับ");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await onRegister({ name, studentCode, className, username, email, password });
    setSubmitting(false);
    if (result && result.error) {
      setError(result.error);
    }
  }

  return (
    <div>
      <label className="sp-label">ชื่อ-นามสกุล</label>
      <input className="sp-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ณัฐวุฒิ ใจดี" />
      <label className="sp-label">รหัสนักเรียน</label>
      <input className="sp-input" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} placeholder="เช่น 6621230007" />
      <label className="sp-label">ชั้นเรียน</label>
      <select className="sp-select" value={className} onChange={(e) => setClassName(e.target.value)}>
        {classOptions.length === 0 && <option value="">- ไม่มีห้องเรียน -</option>}
        {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <label className="sp-label">ตั้งชื่อผู้ใช้ (Username)</label>
      <input className="sp-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="เช่น natthawut66" />
      <label className="sp-label">อีเมล</label>
      <input className="sp-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
      <label className="sp-label">ตั้งรหัสผ่าน</label>
      <div className="sp-password-field">
        <input className="sp-input" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        <button type="button" className="sp-password-toggle" onClick={() => setShowPw((v) => !v)}>
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <div className="sp-error"><AlertCircle size={16} /> {error}</div>}
      <button type="button" onClick={submit} disabled={submitting} className="sp-btn-primary sp-login-submit">{submitting ? "กำลังบันทึก..." : "สมัครสมาชิก"}</button>
      <button type="button" onClick={onBackToLogin} className="sp-link-btn">กลับไปหน้าเข้าสู่ระบบ</button>
    </div>
  );
}

function Login({ users, students, classes = [], siteContent = {}, onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit() {
    const input = username.trim().toLowerCase();
    const user = users.find((u) => (u.username.toLowerCase() === input || (u.email && u.email.toLowerCase() === input)) && u.password === password && (u.role === role || u.role === "admin"));
    if (!user) {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      return;
    }
    setError("");
    onLogin(user, rememberMe);
  }

  const classOptions = [...new Set([...classes, ...students.map((s) => s.class)])];

  return (
    <div className="sp-login-wrap">
      <div className="sp-login-card">
        <div className="sp-login-brand">
          <img src={LOGO} alt="ตราวิทยาลัย" className="sp-seal" />
          <div>
            <div className="sp-brand-name">{siteContent.schoolName || "วิทยาลัยอาชีวศึกษาเทคนิคบริหารธุรกิจกรุงเทพ"}</div>
            <div className="sp-brand-tag">{siteContent.tagline || "ระบบสมุดพกออนไลน์"}</div>
          </div>
        </div>

        {mode === "login" ? (
          <>
            <div className="sp-role-toggle">
              <button type="button" className={role === "student" ? "active" : ""} onClick={() => setRole("student")}>นักเรียน</button>
              <button type="button" className={role === "teacher" ? "active" : ""} onClick={() => setRole("teacher")}>ครู</button>
            </div>
            <div>
              <label className="sp-label">ชื่อผู้ใช้ หรือ อีเมล</label>
              <input className="sp-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username หรือ email" />
              <label className="sp-label">รหัสผ่าน</label>
              <div className="sp-password-field">
                <input className="sp-input" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} placeholder="password" />
                <button type="button" className="sp-password-toggle" onClick={() => setShowPw((v) => !v)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && <div className="sp-error"><AlertCircle size={16} /> {error}</div>}
              <label className="sp-remember-row">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                จำรหัสผ่าน (Remember Me)
              </label>
              <button type="button" onClick={handleSubmit} className="sp-btn-primary sp-login-submit">เข้าสู่ระบบ</button>
            </div>
            {role === "student" && (
              <button type="button" className="sp-link-btn" onClick={() => { setMode("register"); setError(""); }}>ยังไม่มีบัญชี? ลงทะเบียนนักเรียนใหม่</button>
            )}
          </>
        ) : (
          <RegisterForm classOptions={classOptions} onRegister={onRegister} onBackToLogin={() => setMode("login")} />
        )}
      </div>
    </div>
  );
}

function AboutPanel({ onClose, theme, setTheme, siteContent = {} }) {
  return (
    <>
      <div className="sp-panel-backdrop" onClick={onClose} />
      <div className="sp-about-panel">
        <button className="sp-icon-btn sp-panel-close" onClick={onClose}><X size={18} /></button>
        <img src={LOGO} alt="โลโก้" className="sp-about-logo" />
        <div className="sp-about-name">{siteContent.appShortName || "B.T.AD"}</div>
        <div className="sp-about-school">{siteContent.schoolName || "วิทยาลัยอาชีวศึกษาเทคนิคบริหารธุรกิจกรุงเทพ"}</div>
        <div className="sp-about-desc">{siteContent.aboutDescription || "ระบบสมุดพกออนไลน์"}</div>
        <div className="sp-about-divider" />
        <div className="sp-about-row">
          <span>ธีมการแสดงผล</span>
          <button className="sp-theme-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <><Sun size={16} /> โหมดสว่าง</> : <><Moon size={16} /> โหมดมืด</>}
          </button>
        </div>
      </div>
    </>
  );
}

function NavMenuPanel({ nav, view, setView, onClose, isAdminAccount, role, onSwitchViewMode, name, onLogout, onOpenAbout }) {
  return (
    <>
      <div className="sp-panel-backdrop" onClick={onClose} />
      <div className="sp-navmenu-panel">
        <div className="sp-navmenu-header">
          <div className="sp-navmenu-title">เมนู</div>
          <button className="sp-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="sp-navmenu-user">{name}</div>
        <button className="sp-navmenu-item" onClick={() => { onOpenAbout(); onClose(); }}>
          <Info size={18} />
          <div className="sp-navmenu-item-text">
            <div className="sp-navmenu-item-label">เกี่ยวกับเว็บไซต์ & ธีม</div>
          </div>
        </button>
        {isAdminAccount && (
          <div className="sp-viewswitch">
            <div className="sp-viewswitch-label">มุมมอง</div>
            <button className={"sp-viewswitch-btn" + (role === "admin" ? " active" : "")} onClick={() => { onSwitchViewMode("admin"); onClose(); }}><Shield size={14} /> แอดมิน</button>
            <button className={"sp-viewswitch-btn" + (role === "teacher" ? " active" : "")} onClick={() => { onSwitchViewMode("teacher"); onClose(); }}><Users size={14} /> ครู</button>
            <button className={"sp-viewswitch-btn" + (role === "student" ? " active" : "")} onClick={() => { onSwitchViewMode("student"); onClose(); }}><User size={14} /> นักเรียน</button>
          </div>
        )}
        <div className="sp-navmenu-list">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={"sp-navmenu-item" + (view === item.id ? " active" : "")} onClick={() => { setView(item.id); onClose(); }}>
                <Icon size={18} />
                <div className="sp-navmenu-item-text">
                  <div className="sp-navmenu-item-label">{item.label}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="sp-navmenu-divider" />
        <button className="sp-navmenu-item sp-navmenu-logout" onClick={() => { onLogout(); onClose(); }}>
          <LogOut size={18} />
          <div className="sp-navmenu-item-text"><div className="sp-navmenu-item-label">ออกจากระบบ</div></div>
        </button>
      </div>
    </>
  );
}

function Sidebar({ role, view, setView, name, onLogout, theme, setTheme, siteContent, isAdminAccount, onSwitchViewMode, onRefresh }) {
  const [showAbout, setShowAbout] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const studentNav = [
    { id: "dashboard", label: "หน้าหลัก", icon: Home },
    { id: "materials", label: "สื่อการสอน", icon: FileText },
    { id: "quizzes", label: "สอบออนไลน์", icon: HelpCircle },
    { id: "grades", label: "เกรด", icon: BookOpen },
    { id: "attendance", label: "การเข้าเรียน", icon: CheckSquare },
    { id: "assignments", label: "งานที่ต้องส่ง", icon: ClipboardList },
    { id: "timetable", label: "ตารางเรียน", icon: Table },
    { id: "calendar", label: "ปฏิทิน", icon: Calendar },
    { id: "leave", label: "ยื่นใบลา", icon: Send },
    { id: "messages", label: "ข้อความ", icon: MessageSquare },
    { id: "behavior", label: "พฤติกรรม & กิจกรรม", icon: Award },
    { id: "profile", label: "โปรไฟล์", icon: User },
  ];
  const teacherNav = [
    { id: "dashboard", label: "หน้าหลัก", icon: Home },
    { id: "analytics", label: "รายงานภาพรวม", icon: TrendingUp },
    { id: "students", label: "จัดการนักเรียน", icon: Users },
    { id: "attendance", label: "เช็คชื่อ", icon: CheckSquare },
    { id: "grades", label: "จัดการเกรด", icon: BookOpen },
    { id: "assignments", label: "งาน/การบ้าน", icon: ClipboardList },
    { id: "materials", label: "สื่อการสอน", icon: FileText },
    { id: "quizzes", label: "คลังข้อสอบ", icon: HelpCircle },
    { id: "timetable", label: "ตารางเรียน", icon: Table },
    { id: "myschedule", label: "ตารางสอนของฉัน", icon: CalendarClock },
    { id: "calendar", label: "ปฏิทิน/กิจกรรม", icon: Calendar },
    { id: "leave", label: "อนุมัติใบลา", icon: Inbox },
    { id: "behavior", label: "พฤติกรรม/จิตอาสา", icon: Award },
    { id: "messages", label: "ข้อความ", icon: MessageSquare },
    { id: "announcements", label: "ประกาศ", icon: Megaphone },
  ];
  const adminNav = [
    { id: "dashboard", label: "ภาพรวมระบบ", icon: Home },
    { id: "students", label: "จัดการนักเรียน", icon: Users },
    { id: "staff", label: "จัดการบัญชีครู/แอดมิน", icon: Shield },
    { id: "classes", label: "จัดการห้องเรียน", icon: Table },
    { id: "sitecontent", label: "แก้ไขข้อความเว็บไซต์", icon: FileText },
    { id: "auditlog", label: "Audit Log", icon: Shield },
  ];
  const nav = role === "admin" ? adminNav : role === "teacher" ? teacherNav : studentNav;

  return (
    <>
      <aside className="sp-sidebar-desktop">
        <button className="sp-sidebar-brand sp-sidebar-brand-btn" onClick={onRefresh} title="รีเฟรชข้อมูล">
          <img src={LOGO} alt="ตราวิทยาลัย" className="sp-seal sp-seal-sm" />
          <div className="sp-brand-name-sm">{siteContent?.appShortName || "B.T.AD"}</div>
        </button>
        {isAdminAccount && (
          <div className="sp-viewswitch">
            <div className="sp-viewswitch-label">มุมมอง</div>
            <button className={"sp-viewswitch-btn" + (role === "admin" ? " active" : "")} onClick={() => onSwitchViewMode("admin")}><Shield size={14} /> แอดมิน</button>
            <button className={"sp-viewswitch-btn" + (role === "teacher" ? " active" : "")} onClick={() => onSwitchViewMode("teacher")}><Users size={14} /> ครู</button>
            <button className={"sp-viewswitch-btn" + (role === "student" ? " active" : "")} onClick={() => onSwitchViewMode("student")}><User size={14} /> นักเรียน</button>
          </div>
        )}
        <nav className="sp-nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={"sp-nav-item" + (view === item.id ? " active" : "")} onClick={() => setView(item.id)}>
                <Icon size={18} /> <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sp-sidebar-foot">
          <div className="sp-sidebar-user">{name}</div>
          <button className="sp-nav-item" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />} <span>{theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"}</span>
          </button>
          <button className="sp-nav-item sp-logout" onClick={onLogout}><LogOut size={18} /> <span>ออกจากระบบ</span></button>
        </div>
      </aside>

      <div className="sp-mobile-topbar">
        <button className="sp-mobile-topbar-brand" onClick={onRefresh} title="รีเฟรชข้อมูล">
          <img src={LOGO} alt="ตราวิทยาลัย" className="sp-seal sp-seal-sm" />
          <span className="sp-brand-name-sm">{siteContent?.appShortName || "B.T.AD"}</span>
        </button>
        <button className="sp-hamburger-btn" onClick={() => setShowMenu(true)} title="เปิดเมนู">
          <Menu size={20} />
        </button>
      </div>

      {showAbout && <AboutPanel onClose={() => setShowAbout(false)} theme={theme} setTheme={setTheme} siteContent={siteContent} />}
      {showMenu && (
        <NavMenuPanel
          nav={nav} view={view} setView={setView} onClose={() => setShowMenu(false)}
          isAdminAccount={isAdminAccount} role={role} onSwitchViewMode={onSwitchViewMode} name={name}
          onLogout={onLogout} onOpenAbout={() => setShowAbout(true)}
        />
      )}
    </>
  );
}

function StudentDashboard({ data, student }) {
  const grades = data.grades.filter((g) => g.studentId === student.id);
  const gpa = grades.length ? (grades.reduce((s, g) => s + scoreToPoint(g.score), 0) / grades.length).toFixed(2) : "-";
  const att = data.attendance.filter((a) => a.studentId === student.id);
  const attRate = att.length ? Math.round((att.filter((a) => a.status === "present").length / att.length) * 100) : 100;

  const upcomingAssignments = data.assignments
    .filter((a) => a.class === student.class)
    .map((a) => ({ ...a, d: daysUntil(a.dueDate) }))
    .filter((a) => a.d >= -1)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);

  const upcomingEvents = data.events
    .map((e) => ({ ...e, d: daysUntil(e.date) }))
    .filter((e) => e.d >= 0)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);

  const latestAnnouncement = [...data.announcements].sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  return (
    <div>
      <div className="sp-idcard">
        <Avatar name={student.name} avatarDataUrl={student.avatarDataUrl} size={72} />
        <div className="sp-idcard-info">
          <div className="sp-idcard-name">{student.name}</div>
          <div className="sp-idcard-meta">ชั้น {student.class} · เลขที่ {student.number} · รหัส {student.studentCode || student.id.toUpperCase()}</div>
        </div>
        <Stamp color="var(--accent)">GPA {gpa}</Stamp>
      </div>

      {latestAnnouncement && (
        <div className="sp-banner">
          <Megaphone size={18} />
          <Marquee><strong>{latestAnnouncement.title}</strong> — {latestAnnouncement.body}</Marquee>
        </div>
      )}

      <div className="sp-stats-grid">
        <div className="sp-card sp-stat"><div className="sp-stat-label">อัตราการมาเรียน</div><div className="sp-stat-value">{attRate}%</div></div>
        <div className="sp-card sp-stat"><div className="sp-stat-label">เกรดเฉลี่ย</div><div className="sp-stat-value">{gpa}</div></div>
        <div className="sp-card sp-stat"><div className="sp-stat-label">งานที่ต้องส่ง</div><div className="sp-stat-value">{upcomingAssignments.length}</div></div>
        <div className="sp-card sp-stat"><div className="sp-stat-label">กิจกรรมที่จะถึง</div><div className="sp-stat-value">{upcomingEvents.length}</div></div>
      </div>

      <div className="sp-two-col">
        <div className="sp-card">
          <div className="sp-card-title">งานที่ต้องส่งเร็วๆ นี้</div>
          {upcomingAssignments.length === 0 && <div className="sp-empty">ไม่มีงานค้างส่งตอนนี้</div>}
          {upcomingAssignments.map((a) => (
            <div key={a.id} className="sp-list-row">
              <div>
                <div className="sp-list-title">{a.title}</div>
                <div className="sp-list-sub">{a.subject} · กำหนดส่ง {fmtDate(a.dueDate)}</div>
              </div>
              <span className={"sp-pill" + (a.d < 0 ? " overdue" : a.d <= 2 ? " urgent" : "")}>
                {a.d < 0 ? "เลยกำหนด" : a.d === 0 ? "วันนี้" : `อีก ${a.d} วัน`}
              </span>
            </div>
          ))}
        </div>
        <div className="sp-card">
          <div className="sp-card-title">ปฏิทิน/กิจกรรมที่จะถึง</div>
          {upcomingEvents.length === 0 && <div className="sp-empty">ไม่มีกิจกรรมที่จะถึง</div>}
          {upcomingEvents.map((e) => (
            <div key={e.id} className="sp-list-row">
              <div>
                <div className="sp-list-title">{e.title}</div>
                <div className="sp-list-sub">{fmtDate(e.date)}</div>
              </div>
              <span className="sp-tag" style={{ "--tag-color": EVENT_META[e.type].color }}>{EVENT_META[e.type].label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CREDIT_PER_SUBJECT = 3.0;

function StudentGrades({ data, student }) {
  const orderedTerms = [...data.terms].sort((a, b) => {
    const yearA = data.academicYears.find((y) => y.id === a.academicYearId)?.label || "";
    const yearB = data.academicYears.find((y) => y.id === b.academicYearId)?.label || "";
    if (yearA !== yearB) return yearA.localeCompare(yearB);
    return a.termNumber - b.termNumber;
  });
  const [selectedTermId, setSelectedTermId] = useState(data.terms.find((t) => t.isCurrent)?.id || orderedTerms[0]?.id || "");

  const selectedTerm = data.terms.find((t) => t.id === selectedTermId) || orderedTerms[0];
  const selectedYear = selectedTerm ? data.academicYears.find((y) => y.id === selectedTerm.academicYearId) : null;
  const selectedIndex = orderedTerms.findIndex((t) => t.id === selectedTerm?.id);

  const allMyGrades = data.grades.filter((g) => g.studentId === student.id);
  const termGrades = selectedTerm ? allMyGrades.filter((g) => g.termId === selectedTerm.id) : [];
  const termCredits = (termGrades.length * CREDIT_PER_SUBJECT).toFixed(1);
  const gpa = termGrades.length
    ? (termGrades.reduce((s, g) => s + scoreToPoint(g.score) * CREDIT_PER_SUBJECT, 0) / (termGrades.length * CREDIT_PER_SUBJECT)).toFixed(2)
    : "-";

  const cumulativeTermIds = new Set(orderedTerms.slice(0, selectedIndex + 1).map((t) => t.id));
  const cumulativeGrades = allMyGrades.filter((g) => cumulativeTermIds.has(g.termId));
  const cumulativeCredits = (cumulativeGrades.length * CREDIT_PER_SUBJECT).toFixed(1);
  const gpax = cumulativeGrades.length
    ? (cumulativeGrades.reduce((s, g) => s + scoreToPoint(g.score) * CREDIT_PER_SUBJECT, 0) / (cumulativeGrades.length * CREDIT_PER_SUBJECT)).toFixed(2)
    : "-";

  const today = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div>
      <div className="sp-page-head sp-no-print">
        <h1>ผลการเรียน</h1>
        <div className="sp-inline-form" style={{ gap: "10px" }}>
          <select className="sp-select" style={{ width: "auto" }} value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)}>
            {orderedTerms.length === 0 && <option value="">- ไม่มีข้อมูลเทอม -</option>}
            {orderedTerms.map((t) => {
              const y = data.academicYears.find((yy) => yy.id === t.academicYearId);
              return <option key={t.id} value={t.id}>ปีการศึกษา {y?.label} · เทอม {t.termNumber}</option>;
            })}
          </select>
          <button className="sp-btn-primary" type="button" onClick={() => window.print()}><FileText size={16} /> พิมพ์ / บันทึกใบเกรด (PDF)</button>
        </div>
      </div>

      <div className="sp-grade-report-doc">
        <div className="sp-report-header">
          <img src={LOGO} alt="ตราวิทยาลัย" className="sp-report-seal" />
          <div>
            <div className="sp-report-college-name">{data.siteContent?.schoolName || "วิทยาลัยอาชีวศึกษาเทคนิคบริหารธุรกิจกรุงเทพ"}</div>
            <div className="sp-report-subtitle">ใบรายงานผลการเรียนรายภาคเรียน (TRANSCRIPT OF ACADEMIC RECORD)</div>
            <div className="sp-report-subtitle">ปีการศึกษา {selectedYear?.label || "-"} · ภาคเรียนที่ {selectedTerm?.termNumber || "-"}</div>
          </div>
        </div>

        <div className="sp-report-student-info">
          <div><span className="sp-report-label">ชื่อ-นามสกุล:</span> {student.name}</div>
          <div><span className="sp-report-label">รหัสประจำตัวนักเรียน:</span> {student.studentCode || student.id.toUpperCase()}</div>
          <div><span className="sp-report-label">ระดับชั้น/กลุ่ม:</span> {student.class}</div>
          <div><span className="sp-report-label">เลขที่:</span> {student.number}</div>
        </div>

        <table className="sp-report-table">
          <thead><tr><th>ลำดับ</th><th>ชื่อรายวิชา (Subject)</th><th>หน่วยกิต</th><th>คะแนนเต็ม 100</th><th>ระดับผลการเรียน</th></tr></thead>
          <tbody>
            {termGrades.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>ยังไม่มีข้อมูลคะแนนในภาคเรียนนี้</td></tr>
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
            <div className="sp-report-summary-value">{termCredits}</div>
          </div>
          <div className="sp-report-summary-box">
            <div className="sp-report-summary-label">GPA ประจำภาค</div>
            <div className="sp-report-summary-value">{gpa}</div>
          </div>
          <div className="sp-report-summary-box">
            <div className="sp-report-summary-label">หน่วยกิตสะสมทั้งหมด</div>
            <div className="sp-report-summary-value">{cumulativeCredits}</div>
          </div>
          <div className="sp-report-summary-box">
            <div className="sp-report-summary-label">GPAX สะสม</div>
            <div className="sp-report-summary-value">{gpax}</div>
          </div>
        </div>

        <div className="sp-report-signatures">
          <div className="sp-report-sign-line">
            <div className="line" />
            <div>ครูที่ปรึกษา/ประจำชั้น</div>
          </div>
          <div className="sp-report-sign-line">
            <div className="line" />
            <div>ผู้อำนวยการสถานศึกษา</div>
          </div>
        </div>
        <div className="sp-report-date">ออกเอกสาร ณ วันที่ {today}</div>
      </div>
    </div>
  );
}

function StudentAttendance({ data, student }) {
  const att = data.attendance.filter((a) => a.studentId === student.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const counts = { present: 0, late: 0, absent: 0, leave: 0 };
  att.forEach((a) => counts[a.status]++);
  const rate = att.length ? Math.round((counts.present / att.length) * 100) : 100;
  return (
    <div>
      <h1>การเข้าเรียน</h1>
      <div className="sp-stats-grid">
        <div className="sp-card sp-stat"><div className="sp-stat-label">อัตรามาเรียน</div><div className="sp-stat-value">{rate}%</div></div>
        <div className="sp-card sp-stat"><div className="sp-stat-label">มาเรียน</div><div className="sp-stat-value">{counts.present}</div></div>
        <div className="sp-card sp-stat"><div className="sp-stat-label">สาย</div><div className="sp-stat-value">{counts.late}</div></div>
        <div className="sp-card sp-stat"><div className="sp-stat-label">ขาด/ลา</div><div className="sp-stat-value">{counts.absent + counts.leave}</div></div>
      </div>
      <div className="sp-card">
        <table className="sp-table">
          <thead><tr><th>วันที่</th><th>สถานะ</th></tr></thead>
          <tbody>
            {att.map((a) => (
              <tr key={a.id}><td>{fmtDate(a.date)}</td><td><Stamp size={44} color={STATUS_META[a.status].color}>{STATUS_META[a.status].label}</Stamp></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentAssignments({ data, student, persist }) {
  const [uploadingId, setUploadingId] = useState(null);
  const [errorId, setErrorId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [savedId, setSavedId] = useState(null);

  const list = data.assignments.filter((a) => a.class === student.class).map((a) => ({ ...a, d: daysUntil(a.dueDate) })).sort((a, b) => a.d - b.d);

  async function handleFile(assignmentId, e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setErrorId(null);
    setUploadingId(assignmentId);
    try {
      const uploaded = await sbUploadFile(file);
      const existing = (data.submissions || []).find((s) => s.assignmentId === assignmentId && s.studentId === student.id);
      const record = { ...uploaded, submittedAt: new Date().toISOString().slice(0, 10), status: "submitted" };
      const nextSubs = existing
        ? data.submissions.map((s) => (s === existing ? { ...s, ...record } : s))
        : [...(data.submissions || []), { id: genId("sub"), assignmentId, studentId: student.id, ...record }];
      await persist({ ...data, submissions: nextSubs });
    } catch (err) {
      setErrorId(assignmentId);
      alert(err.message || "อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      setUploadingId(null);
    }
  }

  function saveComment(assignmentId) {
    const text = (commentDrafts[assignmentId] || "").trim();
    const existing = (data.assignmentComments || []).find((c) => c.assignmentId === assignmentId && c.studentId === student.id);
    const nextComments = existing
      ? data.assignmentComments.map((c) => (c === existing ? { ...c, comment: text, updatedAt: new Date().toISOString().slice(0, 16).replace("T", " ") } : c))
      : [...(data.assignmentComments || []), { id: genId("cm"), assignmentId, studentId: student.id, comment: text, updatedAt: new Date().toISOString().slice(0, 16).replace("T", " ") }];
    persist({ ...data, assignmentComments: nextComments });
    setSavedId(assignmentId);
    setTimeout(() => setSavedId(null), 2000);
  }

  return (
    <div>
      <h1>งานที่ต้องส่ง</h1>
      <div className="sp-card">
        {list.length === 0 && <div className="sp-empty">ยังไม่มีงานที่ต้องส่ง</div>}
        {list.map((a) => {
          const sub = (data.submissions || []).find((s) => s.assignmentId === a.id && s.studentId === student.id);
          const myComment = (data.assignmentComments || []).find((c) => c.assignmentId === a.id && c.studentId === student.id);
          const draft = commentDrafts[a.id] !== undefined ? commentDrafts[a.id] : (myComment ? myComment.comment : "");
          return (
            <div key={a.id} className="sp-list-row sp-assignment-row">
              <div>
                <div className="sp-list-title">{a.title}</div>
                <div className="sp-list-sub">{a.subject} · กำหนดส่ง {fmtDate(a.dueDate)}</div>
                {a.description && <div className="sp-list-desc">{a.description}</div>}
              </div>
              <div className="sp-assignment-action">
                <span className={"sp-pill" + (a.d < 0 && !sub ? " overdue" : a.d <= 2 && !sub ? " urgent" : "")}>
                  {a.d < 0 ? "เลยกำหนด" : a.d === 0 ? "วันนี้" : `อีก ${a.d} วัน`}
                </span>
                {sub ? (
                  <div className="sp-submitted-box">
                    <button className="sp-file-link" type="button" onClick={() => sbDownloadFile(sub.fileUrl, sub.fileName)}>
                      <Paperclip size={14} /> {sub.fileName}
                    </button>
                    <span className="sp-tag" style={{ "--tag-color": sub.status === "graded" ? "var(--accent)" : "#9A6A00" }}>
                      {sub.status === "graded" ? "ตรวจแล้ว" : "ส่งแล้ว"}
                    </span>
                  </div>
                ) : (
                  <div className="sp-inline-form sp-submit-form">
                    <label className="sp-upload-btn">
                      <Paperclip size={14} /> {uploadingId === a.id ? "กำลังอัปโหลด..." : "เลือกไฟล์เพื่อส่งงาน"}
                      <input type="file" style={{ display: "none" }} disabled={uploadingId === a.id} onChange={(e) => handleFile(a.id, e)} />
                    </label>
                  </div>
                )}
                <div className="sp-comment-box">
                  <input
                    className="sp-input sp-comment-input"
                    placeholder="ความคิดเห็นถึงครู"
                    value={draft}
                    onChange={(e) => setCommentDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                  />
                  <button className="sp-icon-btn" type="button" onClick={() => saveComment(a.id)}><Check size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StudentCalendar({ data }) {
  const list = [...data.events].map((e) => ({ ...e, d: daysUntil(e.date) })).sort((a, b) => a.d - b.d);
  return (
    <div>
      <h1>ปฏิทินกิจกรรม</h1>
      <div className="sp-card">
        {list.map((e) => (
          <div key={e.id} className="sp-list-row">
            <div>
              <div className="sp-list-title">{e.title}</div>
              <div className="sp-list-sub">{fmtDate(e.date)}</div>
            </div>
            <span className="sp-tag" style={{ "--tag-color": EVENT_META[e.type].color }}>{EVENT_META[e.type].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentProfile({ data, student, session, persist }) {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  const grades = data.grades.filter((g) => g.studentId === student.id);
  const gpa = grades.length ? (grades.reduce((s, g) => s + scoreToPoint(g.score), 0) / grades.length).toFixed(2) : "-";
  const att = data.attendance.filter((a) => a.studentId === student.id);
  const attRate = att.length ? Math.round((att.filter((a) => a.status === "present").length / att.length) * 100) : 100;
  const behaviorLogs = data.behaviorLogs.filter((b) => b.studentId === student.id);
  const behaviorScore = 100 + behaviorLogs.reduce((s, l) => s + l.points, 0);

  function changePassword() {
    if (!pw) return;
    persist({ ...data, users: data.users.map((u) => (u.username === session.username ? { ...u, password: pw } : u)) });
    setPw("");
    setMsg("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    setTimeout(() => setMsg(""), 3000);
  }

  return (
    <div>
      <h1>โปรไฟล์นักเรียน</h1>
      <div className="sp-idcard">
        <Avatar name={student.name} avatarDataUrl={student.avatarDataUrl} size={80} />
        <div className="sp-idcard-info">
          <div className="sp-idcard-name">{student.name}</div>
          <div className="sp-idcard-meta">ชั้น {student.class} · เลขที่ {student.number}</div>
        </div>
      </div>
      <div className="sp-card">
        <div className="sp-card-title">ความปลอดภัยบัญชี</div>
        <div className="sp-inline-form">
          <input className="sp-input" type="password" placeholder="รหัสผ่านใหม่" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="sp-btn-primary" type="button" onClick={changePassword}>บันทึก</button>
        </div>
        {msg && <div className="sp-success">{msg}</div>}
      </div>
    </div>
  );
}

function StudentMaterials({ data, student }) {
  const list = data.materials.filter((m) => m.class === student.class);
  return (
    <div>
      <h1>สื่อการสอน</h1>
      <div className="sp-card">
        {list.length === 0 && <div className="sp-empty">ยังไม่มีสื่อการสอน</div>}
        {list.map((m) => (
          <div key={m.id} className="sp-list-row">
            <div><div className="sp-list-title">{m.title}</div><div className="sp-list-sub">{m.subject}</div></div>
            <a className="sp-btn-primary sp-download-link" href={m.url} target="_blank" rel="noreferrer">ดาวน์โหลด</a>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentQuizzes({ data, student, persist }) {
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const list = data.quizzes.filter((q) => q.class === student.class);
  const myAttempts = (data.quizAttempts || []).filter((a) => a.studentId === student.id);

  function startQuiz(q) { setActiveQuiz(q); setAnswers({}); }
  function submitQuiz() {
    let score = 0;
    activeQuiz.questions.forEach((q) => { if (answers[q.id] === q.correctIndex) score++; });
    const attempt = { id: genId("qa"), quizId: activeQuiz.id, studentId: student.id, answers, score, total: activeQuiz.questions.length };
    persist({ ...data, quizAttempts: [...(data.quizAttempts || []), attempt] });
    setActiveQuiz(null);
  }

  if (activeQuiz) {
    return (
      <div>
        <h1>{activeQuiz.title}</h1>
        <div className="sp-card">
          {activeQuiz.questions.map((q, qi) => (
            <div key={q.id} className="sp-quiz-question">
              <div className="sp-list-title">{qi + 1}. {q.text}</div>
              {q.choices.map((c, ci) => (
                <label key={ci} className="sp-quiz-choice">
                  <input type="radio" name={q.id} checked={answers[q.id] === ci} onChange={() => setAnswers((a) => ({ ...a, [q.id]: ci }))} /> {c}
                </label>
              ))}
            </div>
          ))}
          <button className="sp-btn-primary" type="button" onClick={submitQuiz}>ส่งคำตอบ</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>สอบออนไลน์</h1>
      <div className="sp-card">
        {list.map((q) => {
          const attempt = myAttempts.find((a) => a.quizId === q.id);
          return (
            <div key={q.id} className="sp-list-row">
              <div><div className="sp-list-title">{q.title}</div></div>
              {attempt ? <span>ทำแล้ว {attempt.score}/{attempt.total}</span> : <button className="sp-btn-primary" onClick={() => startQuiz(q)}>เริ่มทำ</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StudentLeave({ data, student, persist }) {
  const [type, setType] = useState("sick");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  function submitLeave() {
    if (!startDate || !endDate || !reason) return;
    const req = { id: genId("lv"), studentId: student.id, type, startDate, endDate, reason, status: "pending" };
    persist({ ...data, leaveRequests: [...(data.leaveRequests || []), req] });
    setStartDate(""); setEndDate(""); setReason("");
  }
  return (
    <div>
      <h1>ยื่นใบลา</h1>
      <div className="sp-card">
        <div className="sp-form-grid">
          <select className="sp-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="sick">ลาป่วย</option><option value="personal">ลากิจ</option>
          </select>
          <input className="sp-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input className="sp-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <input className="sp-input" placeholder="เหตุผล" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="sp-btn-primary" type="button" onClick={submitLeave}>ส่งใบลา</button>
        </div>
      </div>
    </div>
  );
}

function StudentMessages({ data, student, persist }) {
  const [teacherUsername, setTeacherUsername] = useState("");
  const [body, setBody] = useState("");
  const teachers = data.users.filter((u) => u.role === "teacher");
  const thread = (data.messages || []).filter((m) => m.studentId === student.id && m.teacherUsername === teacherUsername);

  function send() {
    if (!body.trim() || !teacherUsername) return;
    const msg = { id: genId("msg"), studentId: student.id, teacherUsername, sender: "student", body: body.trim(), date: new Date().toISOString().slice(0, 16) };
    persist({ ...data, messages: [...(data.messages || []), msg] });
    setBody("");
  }
  return (
    <div>
      <h1>ข้อความ</h1>
      <div className="sp-card">
        <select className="sp-select" value={teacherUsername} onChange={(e) => setTeacherUsername(e.target.value)}>
          <option value="">-- เลือกครู --</option>
          {teachers.map((t) => <option key={t.username} value={t.username}>{t.name}</option>)}
        </select>
        {teacherUsername && (
          <div style={{ marginTop: "12px" }}>
            <div className="sp-message-thread">{thread.map((m) => <div key={m.id}>{m.body}</div>)}</div>
            <input className="sp-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="พิมพ์ข้อความ..." />
            <button className="sp-btn-primary" onClick={send}>ส่ง</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StudentBehavior({ data, student }) {
  const logs = data.behaviorLogs.filter((b) => b.studentId === student.id);
  const score = 100 + logs.reduce((s, l) => s + l.points, 0);
  return (
    <div>
      <h1>พฤติกรรม</h1>
      <div className="sp-card">คะแนนความประพฤติ: {score}</div>
    </div>
  );
}

function StudentViews({ view, data, persist, student, session }) {
  switch (view) {
    case "materials": return <StudentMaterials data={data} student={student} />;
    case "quizzes": return <StudentQuizzes data={data} student={student} persist={persist} />;
    case "grades": return <StudentGrades data={data} student={student} />;
    case "attendance": return <StudentAttendance data={data} student={student} />;
    case "assignments": return <StudentAssignments data={data} student={student} persist={persist} />;
    case "timetable": return <StudentTimetable data={data} student={student} />;
    case "calendar": return <StudentCalendar data={data} />;
    case "leave": return <StudentLeave data={data} student={student} persist={persist} />;
    case "messages": return <StudentMessages data={data} student={student} persist={persist} />;
    case "behavior": return <StudentBehavior data={data} student={student} />;
    case "profile": return <StudentProfile data={data} student={student} session={session} persist={persist} />;
    default: return <StudentDashboard data={data} student={student} />;
  }
}

function TeacherDashboard({ data }) {
  return <div><h1>ภาพรวมห้องเรียน</h1></div>;
}

function TeacherStaffAccounts({ data, persist }) {
  return <div><h1>จัดการบัญชีครู</h1></div>;
}

function TeacherStudentProfile({ data, student, persist, onBack, onImpersonate }) {
  return <div><h1>โปรไฟล์นักเรียน</h1><button onClick={onBack}>กลับ</button></div>;
}

function TeacherStudents({ data, persist, onImpersonateStudent, canViewPasswords, isAdmin }) {
  return <div><h1>จัดการนักเรียน</h1></div>;
}

function TeacherAttendance({ data, persist }) {
  return <div><h1>เช็คชื่อ</h1></div>;
}

function TeacherGradeManagement({ data, persist, session }) {
  return <div><h1>จัดการเกรด</h1></div>;
}

function TeacherGrades({ data, persist }) {
  return <div><h1>กรอกเกรด</h1></div>;
}

function TeacherAssignments({ data, persist }) {
  return <div><h1>งาน/การบ้าน</h1></div>;
}

function TeacherCalendar({ data, persist }) {
  return <div><h1>ปฏิทิน</h1></div>;
}

function TeacherAnnouncements({ data, persist }) {
  return <div><h1>ประกาศ</h1></div>;
}

function TeacherMaterials({ data, persist }) {
  return <div><h1>สื่อการสอน</h1></div>;
}

function TeacherQuizzes({ data, persist }) {
  return <div><h1>คลังข้อสอบ</h1></div>;
}

function TeacherLeaveApproval({ data, persist }) {
  return <div><h1>อนุมัติใบลา</h1></div>;
}

function TeacherMessages({ data, persist, session }) {
  return <div><h1>ข้อความ</h1></div>;
}

function TeacherBehavior({ data, persist }) {
  return <div><h1>พฤติกรรม</h1></div>;
}

function TeacherAnalytics({ data }) {
  // Added CSV Export functionality for analytics/student list
  function handleExportCSV() {
    const exportData = data.students.map((s) => {
      const studentGrades = data.grades.filter((g) => g.studentId === s.id);
      const avgScore = studentGrades.length
        ? (studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length).toFixed(2)
        : "0";
      return {
        "รหัสนักเรียน": s.studentCode || s.id,
        "ชื่อ-นามสกุล": s.name,
        "ระดับชั้น": s.class,
        "เลขที่": s.number,
        "คะแนนเฉลี่ย": avgScore,
      };
    });
    exportToCSV(exportData, `รายงานคะแนน_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div>
      <div className="sp-page-head">
        <h1>รายงานภาพรวม</h1>
        <button className="sp-btn-primary" onClick={handleExportCSV}>
          <Download size={16} /> ส่งออกข้อมูลเป็น CSV
        </button>
      </div>
    </div>
  );
}

function NotificationBell({ data, persist, session, setView, role }) {
  return null;
}

function AuditLogViewer({ data }) {
  return <div><h1>Audit Log</h1></div>;
}

function AdminDashboard({ data, persist, session }) {
  return <div><h1>ภาพรวมระบบ</h1></div>;
}

function ManageClasses({ data, persist }) {
  return <div><h1>จัดการห้องเรียน</h1></div>;
}

function SiteContentEditor({ data, persist }) {
  return <div><h1>แก้ไขข้อความเว็บไซต์</h1></div>;
}

function AdminViews({ view, data, persist, session, onImpersonateStudent }) {
  switch (view) {
    case "students": return <TeacherStudents data={data} persist={persist} onImpersonateStudent={onImpersonateStudent} canViewPasswords={true} isAdmin={true} />;
    case "staff": return <TeacherStaffAccounts data={data} persist={persist} />;
    case "classes": return <ManageClasses data={data} persist={persist} />;
    case "sitecontent": return <SiteContentEditor data={data} persist={persist} />;
    case "auditlog": return <AuditLogViewer data={data} />;
    default: return <AdminDashboard data={data} persist={persist} session={session} />;
  }
}

function TeacherViews({ view, data, persist, session }) {
  switch (view) {
    case "students": return <TeacherStudents data={data} persist={persist} canViewPasswords={false} isAdmin={false} />;
    case "attendance": return <TeacherAttendance data={data} persist={persist} />;
    case "grades": return <TeacherGradeManagement data={data} persist={persist} session={session} />;
    case "assignments": return <TeacherAssignments data={data} persist={persist} />;
    case "materials": return <TeacherMaterials data={data} persist={persist} />;
    case "quizzes": return <TeacherQuizzes data={data} persist={persist} />;
    case "timetable": return <TeacherTimetable data={data} persist={persist} />;
    case "myschedule": return <TeacherMySchedule data={data} session={session} />;
    case "leave": return <TeacherLeaveApproval data={data} persist={persist} />;
    case "behavior": return <TeacherBehavior data={data} persist={persist} />;
    case "calendar": return <TeacherCalendar data={data} persist={persist} />;
    case "announcements": return <TeacherAnnouncements data={data} persist={persist} />;
    case "messages": return <TeacherMessages data={data} persist={persist} session={session} />;
    case "analytics": return <TeacherAnalytics data={data} />;
    case "staff": return <TeacherStaffAccounts data={data} persist={persist} />;
    default: return <TeacherDashboard data={data} />;
  }
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@500;600;700&family=Sarabun:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;700&display=swap');
      html, body { margin:0; padding:0; }
      .sp-app {
        --bg:#F6F7FB; --surface:#FFFFFF; --ink:#111827; --muted:#667085; --line:#E7EAF2;
        --accent:#2748C4; --accent-hover:#1D3AA3; --accent2:#DC2626; --accent2-bg:#FEF1F1;
        min-height:100vh; display:flex; background:var(--bg); color:var(--ink); font-family:'Sarabun', sans-serif;
      }
      .sp-app.dark {
        --bg:#12151A; --surface:#1B1F27; --ink:#EDEFF3; --muted:#9AA3B2; --line:#2A2F3A;
        --accent:#5B8DEF; --accent-hover:#7BA3F5; --accent2:#FF6B6B; --accent2-bg:#3A1E20;
      }
      .sp-app * { box-sizing:border-box; }
      .sp-app h1 { font-family:'Kanit', serif; font-size:1.5rem; font-weight:600; margin:0 0 20px; }
      .sp-loading { display:flex; align-items:center; justify-content:center; width:100%; min-height:100vh; color:var(--muted); }
      .sp-sidebar-desktop { width:240px; flex-shrink:0; background:var(--surface); border-right:1px solid var(--line); display:flex; flex-direction:column; padding:20px 14px; }
      .sp-mobile-topbar { display:none; }
      .sp-sidebar-brand { display:flex; align-items:center; gap:10px; padding:0 6px 20px; border-bottom:1px solid var(--line); margin-bottom:16px; }
      .sp-seal { width:44px; height:44px; border-radius:50%; object-fit:cover; flex-shrink:0; }
      .sp-seal-sm { width:36px; height:36px; }
      .sp-brand-name-sm { font-family:'Kanit', serif; font-weight:700; font-size:1.1rem; color:var(--accent); }
      .sp-sidebar-brand-btn { border:none; background:transparent; cursor:pointer; width:100%; }
      .sp-hamburger-btn { display:flex; align-items:center; justify-content:center; width:40px; height:40px; border:1px solid var(--line); background:var(--bg); color:var(--ink); border-radius:8px; cursor:pointer; }
      .sp-nav { display:flex; flex-direction:column; gap:2px; flex:1; }
      .sp-nav-item { display:flex; align-items:center; gap:10px; padding:10px 12px; border:none; background:transparent; border-radius:8px; color:var(--muted); font-family:'Sarabun'; font-size:0.92rem; cursor:pointer; text-align:left; }
      .sp-nav-item:hover { background:var(--bg); color:var(--ink); }
      .sp-nav-item.active { background:var(--accent); color:#fff; }
      .sp-sidebar-foot { border-top:1px solid var(--line); padding-top:14px; margin-top:14px; }
      .sp-sidebar-user { font-size:0.8rem; color:var(--muted); padding:0 12px 8px; }
      .sp-logout { color:var(--accent2); }
      .sp-navmenu-panel { position:fixed; top:0; left:0; bottom:0; width:320px; max-width:88vw; background:var(--surface); z-index:41; padding:20px 16px; box-shadow:2px 0 24px rgba(0,0,0,0.2); display:flex; flex-direction:column; overflow-y:auto; }
      .sp-navmenu-divider { height:1px; background:var(--line); margin:10px 0; }
      .sp-main { flex:1; padding:32px 40px; overflow-y:auto; }
      .sp-login-wrap { flex:1; display:flex; align-items:center; justify-content:center; min-height:100vh; width:100%; background:var(--bg); }
      .sp-login-card { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:36px; width:380px; max-width:90vw; }
      .sp-login-brand { display:flex; gap:12px; align-items:center; margin-bottom:24px; }
      .sp-brand-name { font-family:'Kanit', serif; font-weight:700; font-size:1.02rem; }
      .sp-brand-tag { font-size:0.78rem; color:var(--muted); margin-top:2px; }
      .sp-role-toggle { display:flex; background:var(--bg); border-radius:8px; padding:4px; margin-bottom:20px; }
      .sp-role-toggle button { flex:1; padding:8px; border:none; background:transparent; border-radius:6px; font-family:'Sarabun'; font-size:0.85rem; color:var(--muted); cursor:pointer; }
      .sp-role-toggle button.active { background:var(--surface); color:var(--ink); font-weight:600; }
      .sp-login-submit { width:100%; margin-top:8px; }
      .sp-remember-row { display:flex; align-items:center; gap:8px; font-size:0.84rem; color:var(--muted); margin:4px 0 6px; cursor:pointer; }
      .sp-error { display:flex; align-items:center; gap:6px; color:var(--accent2); font-size:0.8rem; margin:4px 0 10px; }
      .sp-grade-report-doc { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:40px; max-width:800px; margin:0 auto 24px; }
      .sp-report-header { display:flex; align-items:center; gap:18px; border-bottom:3px double var(--ink); padding-bottom:18px; margin-bottom:22px; }
      .sp-report-seal { width:72px; height:72px; border-radius:50%; object-fit:cover; }
      .sp-report-college-name { font-family:'Kanit'; font-weight:700; font-size:1.15rem; }
      .sp-report-subtitle { font-size:0.85rem; color:var(--muted); margin-top:2px; }
      .sp-report-student-info { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; margin-bottom:24px; font-size:0.92rem; padding:14px 16px; background:var(--bg); border-radius:8px; }
      .sp-report-label { color:var(--muted); margin-right:4px; }
      .sp-report-table { width:100%; border-collapse:collapse; margin-bottom:28px; }
      .sp-report-table th, .sp-report-table td { border:1px solid var(--line); padding:9px 12px; font-size:0.88rem; text-align:left; }
      .sp-report-table th { background:var(--bg); font-weight:700; }
      .sp-report-summary { display:flex; gap:20px; justify-content:flex-end; margin-bottom:56px; }
      .sp-report-summary-box { text-align:center; border:2px solid var(--accent); border-radius:10px; padding:12px 24px; min-width:120px; }
      .sp-report-summary-label { font-size:0.72rem; color:var(--muted); margin-bottom:4px; }
      .sp-report-summary-value { font-family:'IBM Plex Mono'; font-weight:700; font-size:1.4rem; color:var(--accent); }
      .sp-report-signatures { display:flex; justify-content:space-around; margin-top:20px; text-align:center; font-size:0.85rem; }
      .sp-report-sign-line .line { border-top:1px solid var(--ink); width:160px; margin:0 auto 10px; padding-top:44px; }
      .sp-report-date { text-align:right; font-size:0.78rem; color:var(--muted); margin-top:24px; }
      .sp-label { display:block; font-size:0.75rem; color:var(--muted); margin:12px 0 4px; font-weight:500; }
      .sp-input, .sp-select { width:100%; padding:9px 12px; border:1px solid var(--line); border-radius:8px; background:var(--surface); font-family:'Sarabun'; font-size:0.9rem; color:var(--ink); }
      .sp-btn-primary { display:inline-flex; align-items:center; gap:6px; background:var(--accent); color:#fff; border:none; padding:10px 18px; border-radius:8px; font-family:'Sarabun'; font-weight:600; font-size:0.88rem; cursor:pointer; }
      .sp-btn-primary:hover { background:var(--accent-hover); }
      .sp-icon-btn { background:transparent; border:none; color:var(--muted); cursor:pointer; padding:7px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; }
      .sp-card { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:22px; margin-bottom:20px; }
      .sp-card-title { font-weight:600; margin-bottom:14px; font-size:0.95rem; }
      .sp-page-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
      .sp-page-head h1 { margin:0; }
      .sp-idcard { display:flex; align-items:center; gap:18px; background:var(--surface); border:1px solid var(--line); border-radius:8px; padding:22px; margin-bottom:20px; }
      .sp-idcard-info { flex:1; }
      .sp-idcard-name { font-family:'Kanit', serif; font-weight:600; font-size:1.2rem; }
      .sp-idcard-meta { font-size:0.82rem; color:var(--muted); margin-top:2px; }
      .sp-avatar { background:var(--ink); color:var(--bg); border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Kanit', serif; font-weight:600; flex-shrink:0; }
      .sp-stamp { display:inline-flex; align-items:center; justify-content:center; text-align:center; border:2px dashed var(--stamp-color); color:var(--stamp-color); border-radius:50%; transform:rotate(-6deg); font-family:'IBM Plex Mono', monospace; font-weight:700; }
      .sp-banner { display:flex; align-items:center; gap:10px; background:var(--surface); color:var(--ink); border:1px solid var(--line); border-left:3px solid var(--accent); border-radius:6px; padding:12px 16px; margin-bottom:20px; font-size:0.85rem; }
      .sp-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px; }
      .sp-stat { text-align:center; margin-bottom:0; }
      .sp-stat-label { font-size:0.75rem; color:var(--muted); margin-bottom:8px; }
      .sp-stat-value { font-family:'IBM Plex Mono', monospace; font-size:1.6rem; font-weight:700; }
      .sp-two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
      .sp-list-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 0; border-bottom:1px solid var(--line); }
      .sp-list-row:last-child { border-bottom:none; }
      .sp-list-title { font-weight:600; font-size:0.9rem; }
      .sp-list-sub { font-size:0.78rem; color:var(--muted); margin-top:2px; }
      .sp-empty { color:var(--muted); font-size:0.85rem; padding:12px 0; }
      .sp-pill { font-family:'IBM Plex Mono', monospace; font-size:0.72rem; padding:4px 10px; border-radius:20px; background:var(--bg); border:1px solid var(--line); }
      .sp-pill.urgent { background:#FDF3E3; border-color:#E8C77A; color:#9A6A00; }
      .sp-pill.overdue { background:var(--accent2-bg); border-color:#F0A8AC; color:var(--accent2); }
      .sp-tag { font-size:0.72rem; padding:4px 10px; border-radius:20px; border:1px solid var(--tag-color); color:var(--tag-color); font-weight:600; }
      .sp-table { width:100%; border-collapse:collapse; }
      .sp-table th { text-align:left; font-size:0.7rem; color:var(--muted); font-weight:700; text-transform:uppercase; padding:10px 10px; border-bottom:1px solid var(--line); }
      .sp-table td { padding:12px 10px; border-bottom:1px solid var(--line); font-size:0.87rem; }
      .sp-form-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:4px 16px; align-items:end; }
      .sp-inline-form { display:flex; gap:10px; align-items:center; }
      .sp-inline-form .sp-input { flex:1; }
      .sp-success { color:var(--accent); font-size:0.82rem; margin-top:8px; }
      .sp-link-btn { display:block; width:100%; text-align:center; background:transparent; border:none; color:var(--accent); font-family:'Sarabun'; font-size:0.82rem; margin-top:16px; cursor:pointer; text-decoration:underline; }
      .sp-link-btn:hover { color:var(--accent-hover); }
      .sp-marquee { flex:1; overflow:hidden; white-space:nowrap; }
      .sp-marquee-track { display:inline-flex; animation: sp-marquee-scroll 14s linear infinite; }
      .sp-marquee-track span { padding-right:70px; }
      @keyframes sp-marquee-scroll { from { transform:translateX(0); } to { transform:translateX(-50%); } }
      .sp-password-field { position:relative; }
      .sp-password-field .sp-input { padding-right:38px; }
      .sp-password-toggle { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--muted); cursor:pointer; display:flex; }
      .sp-about-panel { position:fixed; top:0; left:0; bottom:0; width:300px; background:var(--surface); z-index:41; padding:28px 24px; box-shadow:2px 0 24px rgba(0,0,0,0.2); display:flex; flex-direction:column; align-items:center; text-align:center; }
      .sp-panel-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:40; }
      .sp-panel-close { position:absolute; top:14px; right:14px; }
      .sp-about-logo { width:88px; height:88px; border-radius:50%; object-fit:cover; margin-top:20px; }
      .sp-about-name { font-family:'Kanit'; font-weight:700; font-size:1.4rem; color:var(--accent); margin-top:14px; }
      .sp-about-school { font-size:0.82rem; color:var(--ink); margin-top:6px; }
      .sp-about-desc { font-size:0.78rem; color:var(--muted); margin-top:14px; line-height:1.6; }
      .sp-about-divider { width:100%; height:1px; background:var(--line); margin:20px 0; }
      .sp-about-row { display:flex; align-items:center; justify-content:space-between; width:100%; font-size:0.85rem; }
      .sp-theme-toggle { display:inline-flex; align-items:center; gap:6px; background:var(--bg); border:1px solid var(--line); color:var(--ink); padding:8px 14px; border-radius:20px; cursor:pointer; }
      .sp-timetable-wrap { overflow-x:auto; }
      .sp-timetable { min-width:820px; }
      .sp-timetable th { text-align:center; white-space:nowrap; }
      .sp-period-num { font-weight:400; color:var(--muted); font-size:0.68rem; margin-top:2px; }
      .sp-day-cell { font-weight:600; background:var(--bg); white-space:nowrap; }
      .sp-timetable-cell { text-align:center; min-width:100px; }
      .sp-tt-code { font-family:'IBM Plex Mono', monospace; font-weight:700; font-size:0.78rem; }
      .sp-tt-teacher { font-size:0.74rem; color:var(--muted); margin-top:2px; }
      .sp-tt-room { font-size:0.7rem; color:var(--muted); }
      .sp-tt-empty { color:var(--line); }
      .sp-lunch-cell { background:var(--ink); color:var(--surface); text-align:center; font-weight:600; writing-mode:vertical-rl; }
      .sp-legend-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px 24px; margin-top:18px; font-size:0.8rem; }
      .sp-legend-item { display:flex; align-items:baseline; gap:6px; font-family:'IBM Plex Mono', monospace; font-weight:700; }
      .sp-legend-dot { width:6px; height:6px; border-radius:50%; background:var(--accent); }
      .sp-legend-name { font-family:'Sarabun'; font-weight:400; color:var(--muted); }
      @media (max-width: 860px) {
        .sp-app { flex-direction:column; }
        .sp-main { padding:16px; width:100%; }
        .sp-sidebar-desktop { display:none; }
        .sp-mobile-topbar { display:flex; align-items:center; justify-content:space-between; position:fixed; top:0; left:0; right:0; z-index:39; height:56px; padding:0 14px; background:var(--surface); border-bottom:1px solid var(--line); }
        .sp-stats-grid { grid-template-columns:repeat(2,1fr); }
        .sp-two-col { grid-template-columns:1fr; }
        .sp-form-grid { grid-template-columns:1fr; }
      }
    `}</style>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [viewMode, setViewMode] = useState(null);
  const [impersonateStudentId, setImpersonateStudentId] = useState(null);
  const [view, setView] = useState("dashboard");
  const [theme, setThemeState] = useState("light");
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    load();
    loadTheme();
    document.title = "Web-Based Student Grade Reporting System";
  }, []);

  async function load() {
    try {
      const remote = await sbGetState();
      if (remote) {
        setData(remote);
        setBackendError("");
      } else {
        const fresh = { ...SEED, _seeded: true };
        await sbSaveState(fresh);
        setData(fresh);
        setBackendError("");
      }
    } catch (e) {
      setBackendError(e.message || String(e));
      setData(SEED);
    } finally {
      setLoading(false);
    }
  }

  async function loadTheme() {
    try {
      const value = await persistentGet("smudphok:theme");
      if (value) setThemeState(value);
    } catch (e) {}
  }

  function setTheme(next) {
    setThemeState(next);
    persistentSet("smudphok:theme", next).catch(() => {});
  }

  async function persist(next) {
    setData(next);
    try {
      await sbSaveState(next);
      setBackendError("");
      return true;
    } catch (e) {
      setBackendError(e.message || String(e));
      return false;
    }
  }

  function handleLogin(user, rememberMe) {
    setSession(user);
    setViewMode(user.role === "admin" ? "admin" : user.role);
    setImpersonateStudentId(null);
    setView("dashboard");
  }

  function handleLogout() {
    setSession(null);
    setViewMode(null);
    setImpersonateStudentId(null);
  }

  function switchViewMode(mode) {
    setViewMode(mode);
    setView("dashboard");
  }

  async function handleRegister({ name, studentCode, className, username, email, password }) {
    const id = genId("s");
    const newStudent = { id, name, class: className, number: data.students.length + 1, studentCode: studentCode.trim() };
    const newUser = { username: username.toLowerCase(), password, role: "student", studentId: id, email: email.toLowerCase() };
    const nextData = { ...data, students: [...data.students, newStudent], users: [...data.users, newUser] };
    await persist(nextData);
    setSession(newUser);
    setView("dashboard");
    return { error: null };
  }

  const appClass = "sp-app" + (theme === "dark" ? " dark" : "");

  if (loading || !data) {
    return (<><GlobalStyle /><div className={appClass + " sp-loading"}>กำลังโหลดข้อมูล...</div></>);
  }

  if (!session) {
    return (<><GlobalStyle /><div className={appClass}><Login users={data.users} students={data.students} classes={data.classes} siteContent={data.siteContent} onLogin={handleLogin} onRegister={handleRegister} /></div></>);
  }

  const isAdminAccount = session.role === "admin";
  const effectiveRole = viewMode || session.role;
  const impersonatedStudent = effectiveRole === "student" ? (data.students.find((s) => s.id === impersonateStudentId) || data.students[0]) : null;
  const realStudent = effectiveRole === "student" && !isAdminAccount ? data.students.find((s) => s.id === session.studentId) : null;
  const activeStudent = isAdminAccount ? impersonatedStudent : realStudent;
  const effectiveSession = (isAdminAccount && effectiveRole === "student" && activeStudent) ? (data.users.find((u) => u.studentId === activeStudent.id) || session) : session;
  const sidebarName = effectiveRole === "admin" ? session.name : effectiveRole === "teacher" ? (session.name || "ครู") : (activeStudent && activeStudent.name) || "";

  return (
    <>
      <GlobalStyle />
      <div className={appClass}>
        <Sidebar
          role={effectiveRole}
          view={view}
          setView={setView}
          name={sidebarName}
          onLogout={handleLogout}
          theme={theme}
          setTheme={setTheme}
          siteContent={data.siteContent}
          isAdminAccount={isAdminAccount}
          onSwitchViewMode={switchViewMode}
          onRefresh={() => load()}
        />
        <main className="sp-main">
          {backendError && (
            <div className="sp-card" style={{ borderColor: "var(--accent2)", color: "var(--accent2)" }}>
              <AlertCircle size={16} /> เชื่อมต่อฐานข้อมูลไม่สำเร็จ: {backendError}
            </div>
          )}
          {effectiveRole === "admin" ? (
            <AdminViews view={view} data={data} persist={persist} session={session} />
          ) : effectiveRole === "teacher" ? (
            <TeacherViews view={view} data={data} persist={persist} session={effectiveSession} />
          ) : (
            <StudentViews view={view} data={data} persist={persist} student={activeStudent} session={effectiveSession} />
          )}
        </main>
      </div>
    </>
  );
}
