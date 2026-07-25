function renderMain() {
  const app = document.getElementById('app');
  const header = document.getElementById('headerSub');

  if (!state) {
    header.textContent = t('firstLogTitle');
    app.innerHTML = `
      <div class="card setup">
        <div class="stat-label">${t('firstLogLabel')}</div>
        <input type="number" id="firstValue" inputmode="numeric" step="1" min="0" placeholder="ex: 120">
        <button class="btn-primary" id="btnFirstLog">${t('firstLogBtn')}</button>
      </div>
    `;
    document.getElementById('btnFirstLog').onclick = () => {
      const val = parseInt(document.getElementById('firstValue').value, 10);
      if (isNaN(val) || val < 0) { showToast(t('invalidValue')); return; }
      const now = new Date();
      const shift = detectShift(now);
      state = {
        date: todayKey(), turnoId: shift.id, turnoLabel: shift.label,
        shiftLengthH: SHIFT_LENGTH_H,
        shiftStart: shiftStartDate(shift, now).getTime(), pausa: false, notes: '',
        logs: [{ time: now.getTime(), value: val }], textNotes: [], nextReminder: now.getTime() + 3600000
      };
      saveState(state);
      requestNotifPermissionIfNeeded();
      scheduleNextReminder();
      renderMain();
    };
    return;
  }

  const shift = SHIFTS.find(s => s.id === state.turnoId);
  const shiftLengthH = state.shiftLengthH || SHIFT_LENGTH_H;
  const shiftStart = state.shiftStart;
  const shiftEnd = shiftStart + shiftLengthH * 3600000;
  const now = Date.now();
  const lastLog = state.logs[state.logs.length - 1];
  const totalMetros = lastLog.value;

  const elapsedRealH = Math.max((now - shiftStart) / 3600000, 0.02);
  const effShiftH = shiftLengthH - (state.pausa ? BREAK_H : 0);

  // Taxa e previsão de fim de turno: fixas com base na última leitura, não avançam com o relógio
  const hoursAtLastLog = Math.max((lastLog.time - shiftStart) / 3600000, 0.02);
  const rate = totalMetros / hoursAtLastLog;
  const remainingAtLastLogH = Math.max(effShiftH - hoursAtLastLog, 0);
  const prediction = Math.round(totalMetros + rate * remainingAtLastLogH);

  // Previsão para agora: usa a mesma taxa, mas avança com o tempo desde a última leitura
  const hoursSinceLastLog = Math.max((now - lastLog.time) / 3600000, 0);
  const predictedNow = Math.round(totalMetros + rate * hoursSinceLastLog);

  const isShiftOver = now >= shiftEnd;
  const weekNo = isoWeekNumber(todayDateStr());
  const closed = !!state.closed;
  const statusColor = goalColor(prediction);

  header.innerHTML = `${fmtDate(todayDateStr())} · ${t('weekLabel')} ${weekNo} · ${t('shiftLabel')} <b>${state.turnoLabel}</b>${closed ? ' · <span style="color:var(--accent)">' + t('shiftClosedBadge') + '</span>' : (isShiftOver ? ' · <span style="color:var(--accent)">' + t('shiftOver') + '</span>' : '')}`;

  const forecastCardHtml = closed ? '' : `
    <div class="card">
      <div class="grid2">
        <div>
          <div class="stat-label">${t('forecastLabel')} (${state.turnoLabel.split('–')[1]})</div>
          <div class="stat-value"><span style="color:${statusColor}">${prediction}m</span></div>
        </div>
        <div>
          <div class="stat-label">${t('predictedNowLabel')}</div>
          <div class="stat-value">${predictedNow}m</div>
        </div>
      </div>
    </div>`;

  const newLogCardHtml = closed ? '' : `
    <div class="card">
      <div class="stat-label">${t('newLogLabel')}</div>
      <input type="number" id="newValue" inputmode="numeric" step="1" min="0" placeholder="ex: ${totalMetros}">
      <button class="btn-primary" id="btnAddLog">${t('registerBtn')}</button>
    </div>`;

  const bottomActionHtml = closed ? `
    <div style="text-align:center; margin-top:14px;">
      <span class="tiny-link" id="btnReopenShift">${t('reopenShift')}</span>
    </div>` : `
    <button class="btn-primary" id="btnEndShift" style="width:100%; margin-top:6px;">${t('endShiftBtn')}</button>
    <div style="text-align:center; margin-top:14px;">
      <span class="tiny-link" id="btnEditSchedule">${t('editSchedule')}</span>
    </div>`;

  app.innerHTML = `
    <div class="card">
      <div class="grid2">
        <div>
          <div class="stat-label">${t('totalToday')}</div>
          <div class="stat-value big"><span style="color:${statusColor}">${totalMetros}m</span><span class="stat-unit"> / ${DAILY_GOAL}m</span></div>
        </div>
        <div>
          <div class="stat-label">${t('avgRate')}</div>
          <div class="stat-value"><span style="color:${statusColor}">${rate.toFixed(1)}</span><span class="stat-unit"> m/h</span></div>
        </div>
      </div>
      <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--line);">
        <div class="stat-label">${t('hoursLabel')}</div>
        <div class="stat-value" style="font-size:1.1rem;">${elapsedRealH.toFixed(1)} h<span class="stat-unit"> / ${effShiftH.toFixed(1)} h ${state.turnoLabel}</span></div>
      </div>
    </div>

    ${forecastCardHtml}
    ${newLogCardHtml}

    <div class="card">
      <button class="${state.pausa ? 'btn-pausa-on' : 'btn-pausa-off'}" id="btnPausa" style="width:100%">
        ${state.pausa ? t('pausaOn') : t('pausaOff')}
      </button>
      <label class="checkbox-row" style="margin-top:12px;">
        <input type="checkbox" id="probeteileCheck" ${state.probeteile ? 'checked' : ''}>
        <span>Probeteile</span>
      </label>
    </div>

    ${closed ? '' : `
    <div class="card">
      <div class="stat-label">${t('quickNoteLabel')}</div>
      <input type="text" id="newNoteText" placeholder="${t('quickNotePlaceholder')}">
      <button class="btn-secondary" id="btnAddNote" style="margin-top:10px;">${t('addNoteBtn')}</button>
    </div>`}

    <div class="card">
      <div class="stat-label" style="margin-bottom:8px;">${t('historyLabel')}</div>
      <div class="history" id="todayHistory">${buildHistoryHtml(state) || '<div class="empty-state">' + t('noRecords') + '</div>'}</div>
    </div>

    ${bottomActionHtml}
  `;

  wireHistoryActions(document.getElementById('todayHistory'), true, todayKey());

  if (document.getElementById('btnAddNote')) {
    document.getElementById('btnAddNote').onclick = () => {
      const txt = document.getElementById('newNoteText').value.trim();
      if (!txt) { showToast(t('invalidValue')); return; }
      addNoteEntry(txt);
    };
  }

  if (document.getElementById('btnAddLog')) {
    document.getElementById('btnAddLog').onclick = () => {
      const val = parseInt(document.getElementById('newValue').value, 10);
      if (isNaN(val) || val < 0) { showToast(t('invalidValue')); return; }
      addLog(val);
    };
  }
  document.getElementById('btnPausa').onclick = () => {
    state.pausa = !state.pausa;
    state.pausaAt = state.pausa ? Date.now() : null;
    saveState(state);
    renderMain();
  };
  document.getElementById('probeteileCheck').onchange = (e) => {
    state.probeteile = e.target.checked;
    saveState(state);
  };
  if (document.getElementById('btnEndShift')) {
    document.getElementById('btnEndShift').onclick = () => {
      if (confirm(t('confirmEndShift'))) {
        state.closed = true;
        saveState(state);
        if (reminderTimeout) clearTimeout(reminderTimeout);
        renderMain();
      }
    };
  }
  if (document.getElementById('btnReopenShift')) {
    document.getElementById('btnReopenShift').onclick = () => {
      if (confirm(t('confirmReopen'))) {
        state.closed = false;
        saveState(state);
        scheduleNextReminder(false);
        renderMain();
      }
    };
  }
  if (document.getElementById('btnEditSchedule')) {
    document.getElementById('btnEditSchedule').onclick = () => editSchedule(todayKey(), true);
  }
}

function addLog(val) {
  if (state.logs.length) {
    const lastVal = state.logs[state.logs.length - 1].value;
    if (val < lastVal && !confirm(t('lowerValueConfirm').replace('{v}', lastVal))) return;
  }
  const now = Date.now();
  state.logs.push({ time: now, value: val });
  saveState(state);
  showToast(t('logged') + ': ' + val + ' m');
  scheduleNextReminder(true);
  renderMain();
}

// ---------- REMINDERS ----------
