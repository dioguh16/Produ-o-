function openTimeModal(title, fields, callback) {
  document.getElementById('timeModalTitle').textContent = title;
  document.getElementById('timeModalCancel').textContent = t('cancelBtn');
  const container = document.getElementById('timeModalFields');
  container.innerHTML = fields.map((f, i) => `
    <div>
      <div class="time-field-label">${f.label}</div>
      <input type="time" class="time-input" data-key="${f.key}" value="${f.value}">
    </div>
  `).join('');
  timeModalCallback = callback;
  document.getElementById('timeModalOverlay').classList.add('open');
  document.getElementById('timeModal').classList.add('open');
  const firstInput = container.querySelector('.time-input');
  if (firstInput) setTimeout(() => firstInput.focus(), 50);
}
function closeTimeModal() {
  document.getElementById('timeModalOverlay').classList.remove('open');
  document.getElementById('timeModal').classList.remove('open');
  timeModalCallback = null;
}
document.getElementById('timeModalCancel').onclick = closeTimeModal;
document.getElementById('timeModalOverlay').onclick = closeTimeModal;
document.getElementById('timeModalOk').onclick = () => {
  const inputs = document.querySelectorAll('#timeModalFields .time-input');
  const values = {};
  let valid = true;
  inputs.forEach(inp => {
    if (!inp.value) valid = false;
    values[inp.dataset.key] = inp.value;
  });
  if (!valid) { showToast(t('invalidTime')); return; }
  const cb = timeModalCallback;
  closeTimeModal();
  if (cb) cb(values);
};

function openDrawer() {
  view = 'menu';
  renderDrawer();
  document.getElementById('overlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');
  history.pushState({ drawerOpen: true }, '');
}
function hideDrawerUI() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
}
function closeDrawer() {
  if (history.state && history.state.drawerOpen) {
    history.back(); // triggers popstate -> hideDrawerUI()
  } else {
    hideDrawerUI();
  }
}
window.addEventListener('popstate', () => {
  hideDrawerUI();
});

function renderDrawer() {
  const content = document.getElementById('drawerContent');
  const L = lang();

  if (view === 'menu') {
    content.innerHTML = `
      <h2>${t('menuLang')}</h2>
      <div class="lang-toggle">
        <button class="${L==='pt'?'active':''}" id="langPt">Português</button>
        <button class="${L==='de'?'active':''}" id="langDe">Deutsch</button>
      </div>
      <h2>${t('menuNotif')}</h2>
      <div class="menu-item" style="cursor:default;">
        <span>${t('notifToggleLabel')}</span>
        <label class="switch"><input type="checkbox" id="notifToggle" ${notifPrefEnabled()?'checked':''}><span class="slider"></span></label>
      </div>
      <div class="tiny-note">${t('notifHelpText')}</div>
      <h2>${t('menuHistory')}</h2>
      <div class="menu-item" id="goHistory"><span>${t('menuHistory')}</span><span class="arrow">›</span></div>
      <h2>${t('menuSummary')}</h2>
      <div class="menu-item" id="goSummary"><span>${t('menuSummary')}</span><span class="arrow">›</span></div>
      <h2>${t('menuRecords')}</h2>
      <div class="menu-item" id="goRecords"><span>${t('menuRecords')}</span><span class="arrow">›</span></div>
      <h2>${t('menuNotes')}</h2>
      <div class="menu-item" id="goNotes"><span>${t('menuNotes')}</span><span class="arrow">›</span></div>
      <h2>${t('menuData')}</h2>
      <div class="menu-item" id="goData"><span>${t('menuData')}</span><span class="arrow">›</span></div>
    `;
    document.getElementById('langPt').onclick = () => { setLang('pt'); renderAll(); };
    document.getElementById('langDe').onclick = () => { setLang('de'); renderAll(); };
    document.getElementById('notifToggle').onchange = async (e) => {
      setNotifPref(e.target.checked);
      if (e.target.checked && 'Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      updateStatusNotification();
    };
    document.getElementById('goHistory').onclick = () => { view = 'history'; renderDrawer(); };
    document.getElementById('goSummary').onclick = () => { view = 'summary'; summaryMonthOffset = 0; renderDrawer(); };
    document.getElementById('goRecords').onclick = () => { view = 'records'; renderDrawer(); };
    document.getElementById('goNotes').onclick = () => { view = 'notes'; renderDrawer(); };
    document.getElementById('goData').onclick = () => { view = 'data'; renderDrawer(); };
  }

  else if (view === 'history') {
    const days = scanAllDays().filter(isDayClosed);
    const rows = days.map(d => {
      const stats = computeDayStats(d.state);
      return `<div class="day-list-item" data-key="${d.key}">
        <span>${fmtDate(d.dateStr)} · ${d.state.turnoLabel}</span>
        <span class="record-val">${stats.total} m</span>
      </div>`;
    }).join('');
    content.innerHTML = `
      <div class="back-link" id="backToMenu">${t('menuBack')}</div>
      <h2>${t('menuHistory')}</h2>
      ${rows || '<div class="empty-state">' + t('noHistory') + '</div>'}
    `;
    document.getElementById('backToMenu').onclick = () => { view = 'menu'; renderDrawer(); };
    content.querySelectorAll('.day-list-item').forEach(el => {
      el.onclick = () => { viewingDayKey = el.dataset.key; view = 'day-detail'; renderDrawer(); };
    });
  }

  else if (view === 'day-detail') {
    const s = loadState(viewingDayKey);
    if (!s) { view = 'history'; renderDrawer(); return; }
    const stats = computeDayStats(s);
    const dateStr = viewingDayKey.slice(DAY_PREFIX.length);
    content.innerHTML = `
      <div class="back-link" id="backToHistory">${t('menuBack')}</div>
      <h2>${fmtDate(dateStr)} · ${stats.turnoLabel}</h2>
      <div class="grid2" style="margin-bottom:14px;">
        <div><div class="stat-label">${t('dayDetailTotal')}</div><div class="stat-value">${stats.total} m</div></div>
        <div><div class="stat-label">${t('dayDetailAvg')}</div><div class="stat-value">${stats.rate.toFixed(1)} m/h</div></div>
      </div>
      <div style="margin-bottom:14px;"><div class="stat-label">${t('hoursLabel')}</div><div class="stat-value" style="font-size:1.1rem;">${stats.hoursEfetivas.toFixed(1)} h</div></div>
      <div class="stat-label" style="margin-bottom:8px;">${t('historyLabel')}</div>
      <div class="history" id="dayDetailHistory">${buildHistoryHtml(s) || '<div class="empty-state">' + t('noRecords') + '</div>'}</div>
      <div style="text-align:center; margin-top:14px;">
        <span class="tiny-link" id="btnEditScheduleDay">${t('editSchedule')}</span>
      </div>
    `;
    document.getElementById('backToHistory').onclick = () => { view = 'history'; renderDrawer(); };
    wireHistoryActions(document.getElementById('dayDetailHistory'), false, viewingDayKey);
    document.getElementById('btnEditScheduleDay').onclick = () => editSchedule(viewingDayKey, false);
  }

  else if (view === 'records') {
    const days = scanAllDays().filter(isDayClosed);
    let bestTotal = null, bestRate = null;
    days.forEach(d => {
      const stats = computeDayStats(d.state);
      if (!bestTotal || stats.total > bestTotal.total) bestTotal = { ...stats, dateStr: d.dateStr };
      if (!bestRate || stats.rate > bestRate.rate) bestRate = { ...stats, dateStr: d.dateStr };
    });
    content.innerHTML = `
      <div class="back-link" id="backToMenu2">${t('menuBack')}</div>
      <h2>${t('menuRecords')}</h2>
      ${bestTotal ? `
        <div class="record-row">
          <div>
            <div class="stat-label">${t('recordTotal')}</div>
            <div class="record-date">${fmtDate(bestTotal.dateStr)} · ${bestTotal.turnoLabel}</div>
          </div>
          <div class="record-val">${bestTotal.total} m</div>
        </div>
        <div class="record-row">
          <div>
            <div class="stat-label">${t('recordRate')}</div>
            <div class="record-date">${fmtDate(bestRate.dateStr)} · ${bestRate.turnoLabel}</div>
          </div>
          <div class="record-val">${bestRate.rate.toFixed(1)} m/h</div>
        </div>
      ` : `<div class="empty-state">${t('noRecordsYet')}</div>`}
    `;
    document.getElementById('backToMenu2').onclick = () => { view = 'menu'; renderDrawer(); };
  }

  else if (view === 'notes') {
    const notes = loadAllNotes().slice().sort((a,b) => b.updatedAt - a.updatedAt);
    const cardsHtml = notes.map(n => {
      const thumb = n.photos && n.photos.length ? `<img src="${n.photos[0]}" class="note-thumb">` : '';
      const extraPhotos = n.photos && n.photos.length > 1 ? `<div class="note-photo-badge">+${n.photos.length - 1} ${t('photosCount')}</div>` : '';
      return `<div class="note-card" data-id="${n.id}">
        ${thumb}${extraPhotos}
        <div class="note-text">${escapeHtml(n.text).slice(0,140)}</div>
        <div class="note-date">${fmtDateTime(n.updatedAt)}</div>
      </div>`;
    }).join('');
    content.innerHTML = `
      <div class="back-link" id="backToMenu3">${t('menuBack')}</div>
      <h2>${t('menuNotes')}</h2>
      <button class="btn-primary" id="btnNewNote" style="margin-bottom:14px;">${t('newNote')}</button>
      <div class="notes-grid">${cardsHtml || '<div class="empty-state" style="grid-column:1/-1;">' + t('noNotes') + '</div>'}</div>
    `;
    document.getElementById('backToMenu3').onclick = () => { view = 'menu'; renderDrawer(); };
    document.getElementById('btnNewNote').onclick = () => { editingNoteId = null; editingPhotos = []; view = 'note-edit'; renderDrawer(); };
    content.querySelectorAll('.note-card').forEach(el => {
      el.onclick = () => {
        editingNoteId = el.dataset.id;
        const n = getNoteById(editingNoteId);
        editingPhotos = n ? [...(n.photos || [])] : [];
        view = 'note-edit';
        renderDrawer();
      };
    });
  }

  else if (view === 'note-edit') {
    const note = editingNoteId ? getNoteById(editingNoteId) : null;
    content.innerHTML = `
      <div class="back-link" id="backToNotes">${t('menuBack')}</div>
      <textarea id="noteText" placeholder="${t('notePlaceholder')}" style="min-height:130px;">${note ? escapeHtml(note.text) : ''}</textarea>
      <div class="note-photos" id="notePhotos"></div>
      <button class="btn-secondary" id="btnAddPhoto" style="margin-top:10px;">${t('addPhoto')}</button>
      <input type="file" id="photoInput" accept="image/*" multiple style="display:none;">
      <div style="display:flex; gap:10px; margin-top:16px;">
        <button class="btn-primary" id="btnSaveNote" style="flex:1;">${t('saveNote')}</button>
      </div>
      ${editingNoteId ? `<button class="btn-danger" id="btnDeleteNote" style="width:100%; margin-top:10px;">${t('deleteNote')}</button>` : ''}
    `;
    renderNotePhotosUI();
    document.getElementById('backToNotes').onclick = () => { view = 'notes'; renderDrawer(); };
    document.getElementById('btnAddPhoto').onclick = () => document.getElementById('photoInput').click();
    document.getElementById('photoInput').onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) {
        try { editingPhotos.push(await compressImage(f)); } catch (err) {}
      }
      renderNotePhotosUI();
      e.target.value = '';
    };
    document.getElementById('btnSaveNote').onclick = () => {
      const text = document.getElementById('noteText').value.trim();
      if (!text && editingPhotos.length === 0) { showToast(t('emptyNote')); return; }
      const notes = loadAllNotes();
      const now = Date.now();
      if (editingNoteId) {
        const idx = notes.findIndex(n => n.id === editingNoteId);
        if (idx > -1) { notes[idx].text = text; notes[idx].photos = editingPhotos; notes[idx].updatedAt = now; }
      } else {
        notes.push({ id: 'note-' + now + '-' + Math.random().toString(36).slice(2,7), text, photos: editingPhotos, createdAt: now, updatedAt: now });
      }
      if (saveAllNotes(notes)) { view = 'notes'; renderDrawer(); }
    };
    if (editingNoteId) {
      document.getElementById('btnDeleteNote').onclick = () => {
        if (!confirm(t('confirmDeleteNote'))) return;
        const notes = loadAllNotes().filter(n => n.id !== editingNoteId);
        saveAllNotes(notes);
        view = 'notes';
        renderDrawer();
      };
    }
  }

  else if (view === 'summary') {
    const list = allDayStats();
    const isWeek = summaryMode === 'week';
    const keyFn = isWeek ? weekStartKey : monthKeyOf;
    const groups = groupBy(list, keyFn);

    // Para a semana mantém-se sempre a semana atual; para o mês, navega-se com summaryMonthOffset.
    let currentKey, viewYear, viewMonth;
    if (isWeek) {
      currentKey = keyFn(todayDateStr());
    } else {
      const now = new Date();
      const viewDate = new Date(now.getFullYear(), now.getMonth() + summaryMonthOffset, 1);
      viewYear = viewDate.getFullYear();
      viewMonth = viewDate.getMonth();
      currentKey = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}`;
    }
    const currentDays = groups[currentKey] || [];
    const currentAgg = periodAgg(currentDays);
    const periodGoal = currentDays.length * DAILY_GOAL;
    const periodPct = periodGoal > 0 ? Math.min(100, Math.round((currentAgg.total / periodGoal) * 100)) : 0;

    let bodyHtml;
    if (isWeek) {
      const labels = WEEKDAY_LABELS[lang()];
      const chartData = [];
      for (let i = 0; i < 7; i++) {
        const ds = addDaysStr(currentKey, i);
        const entry = currentDays.find(d => d.dateStr === ds);
        chartData.push({ label: labels[i], value: entry ? entry.total : 0 });
      }
      const TRACK_H = 100;
      const maxVal = Math.max(DAILY_GOAL, ...chartData.map(c => c.value), 1);
      const goalPx = Math.round((DAILY_GOAL / maxVal) * TRACK_H);
      bodyHtml = chartData.length ? `
        <div class="bar-chart">
          <div class="goal-line" style="bottom:${goalPx}px"></div>
          ${chartData.map(c =>
            `<div class="bar-col">
              <div class="bar-value">${c.value || ''}</div>
              <div class="bar" style="height:${c.value ? Math.max(2, Math.round((c.value/maxVal)*TRACK_H)) : 0}px; background:${c.value ? goalColor(c.value) : 'var(--line)'}" title="${c.value} m"></div>
            </div>`
          ).join('')}
        </div>
        <div class="bar-labels">${chartData.map(c => `<div class="bar-label-item">${c.label}</div>`).join('')}</div>
      ` : '<div class="empty-state">' + t('summaryNoData') + '</div>';
    } else {
      const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
      const dayByDate = {};
      currentDays.forEach(d => { dayByDate[d.dateStr] = d; });
      const todayStr = todayDateStr();
      const monthLabel = fmtMonthLabel(currentKey);
      const weekdayLetters = { pt: ['D','S','T','Q','Q','S','S'], de: ['S','M','D','M','D','F','S'] }[lang()] || ['D','S','T','Q','Q','S','S'];

      let cells = '';
      for (let i = 0; i < firstWeekday; i++) cells += '<div class="cal-day empty"></div>';
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const entry = dayByDate[dateStr];
        const todayCls = dateStr === todayStr ? ' today-outline' : '';
        if (entry) {
          const c = entry.total < GOAL_LOW ? 'neg' : (entry.total < DAILY_GOAL ? 'amber' : 'pos');
          cells += `<div class="cal-day ${c}${todayCls}" data-key="${DAY_PREFIX}${dateStr}" title="${entry.total} m">${d}</div>`;
        } else {
          cells += `<div class="cal-day${todayCls}">${d}</div>`;
        }
      }
      bodyHtml = `
        <div class="month-nav">
          <button id="calMonthPrev">‹</button>
          <span>${monthLabel}</span>
          <button id="calMonthNext" ${summaryMonthOffset >= 0 ? 'disabled' : ''}>›</button>
        </div>
        <div class="cal-weekdays">${weekdayLetters.map(l => `<span>${l}</span>`).join('')}</div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-legend">
          <span><i class="cal-dot pos"></i>${t('legendGoalMet')}</span>
          <span><i class="cal-dot amber"></i>${t('legendBelowGoal')}</span>
          <span><i class="cal-dot neg"></i>${t('legendLow')}</span>
        </div>
      `;
    }

    const otherKeys = Object.keys(groups).filter(k => k !== currentKey).sort().reverse().slice(0, 10);
    const prevRows = otherKeys.map(k => {
      const agg = periodAgg(groups[k]);
      const label = isWeek ? `${fmtDate(k)} – ${fmtDate(addDaysStr(k,6))}` : fmtMonthLabel(k);
      return `<div class="record-row">
        <div><div class="stat-label" style="margin:0;">${label}</div></div>
        <div style="text-align:right;">
          <div class="record-val">${agg.total} m</div>
          <div class="record-date">${agg.rate.toFixed(1)} m/h</div>
        </div>
      </div>`;
    }).join('');

    content.innerHTML = `
      <div class="back-link" id="backToMenuS">${t('menuBack')}</div>
      <h2>${t('menuSummary')}</h2>
      <div class="lang-toggle">
        <button class="${isWeek?'active':''}" id="tabWeek">${t('tabWeek')}</button>
        <button class="${!isWeek?'active':''}" id="tabMonth">${t('tabMonth')}</button>
      </div>
      <div class="grid2" style="margin:14px 0;">
        <div>
          <div class="stat-label">${t('summaryTotal')}</div>
          <div class="stat-value"><span style="color:${periodGoalColor(currentAgg.total, periodGoal)}">${currentAgg.total}m</span>${periodGoal > 0 ? `<span class="stat-unit"> / ${periodGoal}m</span>` : ''}</div>
        </div>
        <div><div class="stat-label">${t('summaryAvg')}</div><div class="stat-value">${currentAgg.rate.toFixed(1)} m/h</div></div>
      </div>
      ${periodGoal > 0 ? `<div class="progress-track"><div class="progress-fill" style="width:${periodPct}%; background:${periodGoalColor(currentAgg.total, periodGoal)}"></div></div>` : ''}
      ${bodyHtml}
      <h2 style="margin-top:20px;">${t('previousPeriods')}</h2>
      ${prevRows || '<div class="empty-state">' + t('noHistory') + '</div>'}
    `;
    document.getElementById('backToMenuS').onclick = () => { view = 'menu'; renderDrawer(); };
    document.getElementById('tabWeek').onclick = () => { summaryMode = 'week'; renderDrawer(); };
    document.getElementById('tabMonth').onclick = () => { summaryMode = 'month'; renderDrawer(); };
    if (!isWeek) {
      document.getElementById('calMonthPrev').onclick = () => { summaryMonthOffset--; renderDrawer(); };
      document.getElementById('calMonthNext').onclick = () => { summaryMonthOffset = Math.min(0, summaryMonthOffset+1); renderDrawer(); };
      content.querySelectorAll('.cal-day[data-key]').forEach(el => {
        el.onclick = () => { viewingDayKey = el.dataset.key; view = 'day-detail'; renderDrawer(); };
      });
    }
  }

  else if (view === 'data') {
    content.innerHTML = `
      <div class="back-link" id="backToMenuD">${t('menuBack')}</div>
      <h2>${t('menuData')}</h2>
      <div class="tiny-note" style="margin-bottom:14px;">${t('dataExplain')}</div>
      <button class="btn-primary" id="btnExport" style="margin-bottom:10px;">${t('exportBtn')}</button>
      <button class="btn-secondary" id="btnExportCsv" style="margin-bottom:10px;">${t('exportCsvBtn')}</button>
      <button class="btn-secondary" id="btnImport">${t('importBtn')}</button>
      <input type="file" id="importInput" accept="application/json" style="display:none;">
    `;
    document.getElementById('backToMenuD').onclick = () => { view = 'menu'; renderDrawer(); };
    document.getElementById('btnExport').onclick = () => exportAllData();
    document.getElementById('btnExportCsv').onclick = () => exportCSV();
    document.getElementById('btnImport').onclick = () => document.getElementById('importInput').click();
    document.getElementById('importInput').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm(t('importWarning'))) { e.target.value = ''; return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          importAllData(ev.target.result);
          showToast(t('importSuccess'));
          setTimeout(() => window.location.reload(), 1200);
        } catch (err) {
          showToast(t('importError'));
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    };
  }
}

function renderNotePhotosUI() {
  const container = document.getElementById('notePhotos');
  if (!container) return;
  container.innerHTML = editingPhotos.map((src, i) => `
    <div class="note-photo-thumb">
      <img src="${src}">
      <button class="photo-remove" data-i="${i}">✕</button>
    </div>
  `).join('');
  container.querySelectorAll('.photo-remove').forEach(btn => {
    btn.onclick = () => { editingPhotos.splice(parseInt(btn.dataset.i, 10), 1); renderNotePhotosUI(); };
  });
}

function renderAll() {
  renderMain();
  requestNotifPermissionIfNeeded();
  document.getElementById('footerNote').textContent = t('footerNote');
  if (document.getElementById('drawer').classList.contains('open')) renderDrawer();
}

