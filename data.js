function localDateStr(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function todayKey(d = new Date()) { return DAY_PREFIX + localDateStr(d); }
function loadState(key) {
  const raw = localStorage.getItem(key || todayKey());
  return raw ? JSON.parse(raw) : null;
}
function saveDayState(key, s) { localStorage.setItem(key, JSON.stringify(s)); }
function saveState(s) { saveDayState(todayKey(), s); }
function fmtTime(ts) { return new Date(ts).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }); }
function fmtDate(dateStr) {
  const [y,m,d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
function detectShift(date) {
  const h = date.getHours() + date.getMinutes() / 60;
  for (const s of SHIFTS) if (h >= s.startH && h < s.endH) return s;
  return h < 5 ? SHIFTS[0] : SHIFTS[1];
}
function shiftStartDate(shift, refDate) {
  const d = new Date(refDate);
  d.setHours(shift.startH, 0, 0, 0);
  return d;
}

function computeDayStats(s) {
  const lastLog = s.logs[s.logs.length - 1];
  const total = lastLog.value;
  const effShiftH = (s.shiftLengthH || SHIFT_LENGTH_H) - (s.pausa ? BREAK_H : 0);
  const rate = total / effShiftH;
  return { total, rate, turnoLabel: s.turnoLabel, hoursEfetivas: effShiftH };
}

const NOTES_KEY = 'keep-notes';
function loadAllNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]'); } catch (e) { return []; }
}
function saveAllNotes(notes) {
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); return true; }
  catch (e) { showToast(t('storageFull')); return false; }
}
function getNoteById(id) { return loadAllNotes().find(n => n.id === id) || null; }
function fmtDateTime(ts) {
  const d = new Date(ts);
  return fmtDate(todayKey(d).slice(DAY_PREFIX.length)) + ' ' + fmtTime(ts);
}
function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function compressImage(file, maxDim = 1000, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function scanAllDays() {
  const days = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(DAY_PREFIX)) {
      const s = JSON.parse(localStorage.getItem(key));
      if (s && s.logs && s.logs.length) days.push({ key, dateStr: key.slice(DAY_PREFIX.length), state: s });
    }
  }
  days.sort((a,b) => b.dateStr.localeCompare(a.dateStr));
  return days;
}

// ---------- SUMMARY (weekly/monthly) ----------
const WEEKDAY_LABELS = { pt: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'], de: ['Mo','Di','Mi','Do','Fr','Sa','So'] };
const MONTH_NAMES = {
  pt: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
};
function todayDateStr() { return localDateStr(new Date()); }
function isoWeekNumber(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}
function weekStartKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7; // 0=Mon..6=Sun
  d.setDate(d.getDate() - dow);
  return localDateStr(d);
}
function monthKeyOf(dateStr) { return dateStr.slice(0,7); }
function fmtMonthLabel(mk) {
  const [y,m] = mk.split('-');
  const idx = parseInt(m,10) - 1;
  return `${MONTH_NAMES[lang()][idx]} ${y}`;
}
function isDayClosed(d) { return d.key !== todayKey() || !!(d.state && d.state.closed); }

function allDayStats() {
  return scanAllDays().filter(isDayClosed).map(d => ({ dateStr: d.dateStr, ...computeDayStats(d.state) }));
}
function groupBy(list, keyFn) {
  const groups = {};
  list.forEach(d => {
    const k = keyFn(d.dateStr);
    if (!groups[k]) groups[k] = [];
    groups[k].push(d);
  });
  return groups;
}
function periodAgg(days) {
  const total = days.reduce((s,d) => s + d.total, 0);
  const hours = days.reduce((s,d) => s + d.hoursEfetivas, 0);
  return { total, rate: hours > 0 ? total / hours : 0 };
}

// ---------- NOTIFICATION PREFERENCE ----------
function notifPrefEnabled() { return localStorage.getItem('notif-pref') !== 'off'; }
function setNotifPref(v) { localStorage.setItem('notif-pref', v ? 'on' : 'off'); }

// ---------- BACKUP / RESTORE ----------
function exportCSV() {
  const days = scanAllDays().filter(isDayClosed).sort((a,b) => a.dateStr.localeCompare(b.dateStr));
  const header = ['Data','Turno','Total (m)','Media (m/h)','Horas efetivas','Pausa','Probeteile','Notas'];
  const rows = days.map(d => {
    const stats = computeDayStats(d.state);
    return [
      d.dateStr,
      d.state.turnoLabel,
      stats.total,
      stats.rate.toFixed(1),
      stats.hoursEfetivas.toFixed(2),
      d.state.pausa ? 'Sim' : 'Nao',
      d.state.probeteile ? 'Sim' : 'Nao',
      ((d.state.textNotes && d.state.textNotes.length)
        ? d.state.textNotes.map(n => `${fmtTime(n.time)} ${n.text}`).join(' | ')
        : (d.state.notes || '')
      ).replace(/\r?\n/g, ' ')
    ];
  });
  const escape = (v) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  const csvLines = [header, ...rows].map(r => r.map(escape).join(';'));
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hbw-diario-${todayDateStr()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function exportAllData() {
  const dump = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    dump[k] = localStorage.getItem(k);
  }
  const blob = new Blob([JSON.stringify({ exportedAt: Date.now(), data: dump }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hbw-diario-backup-${todayDateStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function importAllData(jsonText) {
  const parsed = JSON.parse(jsonText);
  const data = parsed && parsed.data ? parsed.data : parsed;
  if (!data || typeof data !== 'object') throw new Error('invalid');
  Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
  return true;
}

