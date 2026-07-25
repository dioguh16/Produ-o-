let state = loadState();
let swReg = null;
let reminderTimeout = null;
let view = 'main';
let editingNoteId = null;
let editingPhotos = [];
let viewingDayKey = null;
let summaryMode = 'week';

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function buildHistoryHtml(s) {
  const logs = (s.logs || []).map((log, i) => ({ type: 'log', time: log.time, value: log.value, idx: i }));
  const notes = (s.textNotes || []).map((n, i) => ({ type: 'note', time: n.time, text: n.text, idx: i }));
  const timeline = logs.concat(notes).sort((a,b) => a.time - b.time);

  return timeline.slice().reverse().map(item => {
    if (item.type === 'log') {
      const prevLogs = logs.filter(l => l.idx < item.idx);
      const prev = item.idx > 0 ? logs[item.idx - 1].value : 0;
      const delta = item.value - prev;
      return `<div class="history-item">
        <span class="history-time">${fmtTime(item.time)}</span>
        <span class="history-val">${item.value} m</span>
        <span class="history-delta">${item.idx > 0 ? (delta>=0?'+':'') + delta + ' m' : '—'}</span>
        <span class="history-actions">
          <button class="icon-btn edit-log" data-idx="${item.idx}">✎</button>
          <button class="icon-btn delete delete-log" data-idx="${item.idx}">🗑</button>
        </span>
      </div>`;
    }
    return `<div class="history-item history-note">
      <span class="history-time note-time-edit" data-idx="${item.idx}">${fmtTime(item.time)}</span>
      <span class="history-val history-note-text">📝 ${escapeHtml(item.text)}</span>
      <span class="history-actions">
        <button class="icon-btn edit-note" data-idx="${item.idx}">✎</button>
        <button class="icon-btn delete delete-note" data-idx="${item.idx}">🗑</button>
      </span>
    </div>`;
  }).join('');
}

function wireHistoryActions(container, isToday, dayKey) {
  container.querySelectorAll('.edit-log').forEach(btn => {
    btn.onclick = () => editLog(dayKey, parseInt(btn.dataset.idx,10), isToday);
  });
  container.querySelectorAll('.delete-log').forEach(btn => {
    btn.onclick = () => deleteLog(dayKey, parseInt(btn.dataset.idx,10), isToday);
  });
  container.querySelectorAll('.edit-note').forEach(btn => {
    btn.onclick = () => editNote(dayKey, parseInt(btn.dataset.idx,10), isToday);
  });
  container.querySelectorAll('.note-time-edit').forEach(el => {
    el.onclick = () => editNoteTime(dayKey, parseInt(el.dataset.idx,10), isToday);
  });
  container.querySelectorAll('.delete-note').forEach(btn => {
    btn.onclick = () => deleteNote(dayKey, parseInt(btn.dataset.idx,10), isToday);
  });
}

function addNoteEntry(text) {
  if (!state.textNotes) state.textNotes = [];
  state.textNotes.push({ time: Date.now(), text });
  saveState(state);
  renderMain();
}

function editNote(key, idx, isToday) {
  const s = isToday ? state : loadState(key);
  if (!s || !s.textNotes) return;
  const note = s.textNotes[idx];
  const val = prompt(t('editNotePrompt'), note.text);
  if (val === null || val.trim() === '') return;
  note.text = val.trim();
  if (isToday) { state = s; saveState(state); renderMain(); }
  else { saveDayState(key, s); if (key === todayKey()) state = s; renderDrawer(); }
}

function editNoteTime(key, idx, isToday) {
  const s = isToday ? state : loadState(key);
  if (!s || !s.textNotes) return;
  const note = s.textNotes[idx];
  const d = new Date(note.time);
  const pad = (n) => String(n).padStart(2, '0');
  const timeDefault = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  openTimeModal(t('editNoteTimePrompt'), [
    { key: 'time', label: '', value: timeDefault }
  ], (values) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(values.time);
    if (!m) { showToast(t('invalidTime')); return; }
    const hh = parseInt(m[1],10), mm = parseInt(m[2],10);
    if (hh > 23 || mm > 59) { showToast(t('invalidTime')); return; }
    d.setHours(hh, mm, 0, 0);
    note.time = d.getTime();
    if (isToday) { state = s; saveState(state); renderMain(); }
    else { saveDayState(key, s); if (key === todayKey()) state = s; renderDrawer(); }
  });
}

function deleteNote(key, idx, isToday) {
  const s = isToday ? state : loadState(key);
  if (!s || !s.textNotes) return;
  if (!confirm(t('confirmDeleteNoteEntry'))) return;
  s.textNotes.splice(idx, 1);
  if (isToday) { state = s; saveState(state); renderMain(); }
  else { saveDayState(key, s); if (key === todayKey()) state = s; renderDrawer(); }
}

function editLog(key, idx, isToday) {
  const s = isToday ? state : loadState(key);
  if (!s) return;
  const current = s.logs[idx].value;
  const val = prompt(t('editPrompt'), current);
  if (val === null) return;
  const num = parseInt(val, 10);
  if (isNaN(num) || num < 0) { showToast(t('invalidValue')); return; }
  s.logs[idx].value = num;
  if (isToday) { state = s; saveState(state); renderMain(); }
  else { saveDayState(key, s); if (key === todayKey()) state = s; renderDrawer(); }
}

function deleteLog(key, idx, isToday) {
  const s = isToday ? state : loadState(key);
  if (!s) return;
  if (!confirm(t('confirmDeleteLog'))) return;
  s.logs.splice(idx, 1);
  if (s.logs.length === 0) {
    localStorage.removeItem(key);
    if (isToday) { state = null; if (reminderTimeout) clearTimeout(reminderTimeout); renderMain(); }
    else { if (key === todayKey()) state = null; view = 'history'; renderDrawer(); }
    return;
  }
  if (isToday) { state = s; saveState(state); renderMain(); }
  else { saveDayState(key, s); if (key === todayKey()) state = s; renderDrawer(); }
}

function editSchedule(key, isToday) {
  const s = isToday ? state : loadState(key);
  if (!s) return;
  const startD = new Date(s.shiftStart);
  const curLenH = s.shiftLengthH || SHIFT_LENGTH_H;
  const endD = new Date(s.shiftStart + curLenH * 3600000);
  const pad = (n) => String(n).padStart(2, '0');
  const startDefault = `${pad(startD.getHours())}:${pad(startD.getMinutes())}`;
  const endDefault = `${pad(endD.getHours())}:${pad(endD.getMinutes())}`;

  openTimeModal(t('editSchedule'), [
    { key: 'start', label: t('promptStart'), value: startDefault },
    { key: 'end', label: t('promptEnd'), value: endDefault }
  ], (values) => {
    const m1 = /^(\d{1,2}):(\d{2})$/.exec(values.start);
    const m2 = /^(\d{1,2}):(\d{2})$/.exec(values.end);
    if (!m1 || !m2) { showToast(t('invalidTime')); return; }
    const sh = parseInt(m1[1],10), sm = parseInt(m1[2],10);
    const eh = parseInt(m2[1],10), em = parseInt(m2[2],10);
    if (sh>23||sm>59||eh>23||em>59) { showToast(t('invalidTime')); return; }

    const newStart = new Date(startD);
    newStart.setHours(sh, sm, 0, 0);
    let lengthH = (eh + em/60) - (sh + sm/60);
    if (lengthH <= 0) lengthH += 24;
    if (lengthH <= 0 || lengthH > 16) { showToast(t('invalidTime')); return; }

    s.shiftStart = newStart.getTime();
    s.shiftLengthH = Math.round(lengthH * 100) / 100;
    s.turnoLabel = `${pad(sh)}:${pad(sm)}–${pad(eh)}:${pad(em)}`;

    if (isToday) { state = s; saveState(state); scheduleNextReminder(false); renderMain(); }
    else { saveDayState(key, s); if (key === todayKey()) state = s; renderDrawer(); }
  });
}


