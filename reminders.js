function scheduleNextReminder(justLogged) {
  if (!state) return;
  const now = Date.now();
  const shiftEnd = state.shiftStart + (state.shiftLengthH || SHIFT_LENGTH_H) * 3600000;
  if (justLogged) { state.nextReminder = now + 3600000; saveState(state); }
  if (reminderTimeout) clearTimeout(reminderTimeout);
  if (state.nextReminder >= shiftEnd) return;
  const delay = Math.max(state.nextReminder - now, 1000);
  reminderTimeout = setTimeout(fireReminder, delay);
}

function fireReminder() {
  if (!state) return;
  if (notifPrefEnabled()) {
    if (swReg && Notification.permission === 'granted') {
      swReg.active && swReg.active.postMessage({ type: 'SHOW_LOG_REMINDER' });
    } else if (Notification.permission === 'granted') {
      new Notification(t('shiftLabel'), { body: t('reminderBody') });
    } else {
      showToast(t('reminderBody'));
    }
  }
  state.nextReminder = Date.now() + 3600000;
  saveState(state);
  scheduleNextReminder(false);
}

function catchUpReminders() {
  if (!state) return;
  const shiftEnd = state.shiftStart + (state.shiftLengthH || SHIFT_LENGTH_H) * 3600000;
  const now = Date.now();
  if (state.nextReminder && state.nextReminder <= now && now < shiftEnd) fireReminder();
  else scheduleNextReminder(false);
}

function requestNotifPermissionIfNeeded() {
  const banner = document.getElementById('permBanner');
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    banner.style.display = 'block';
    banner.innerHTML = `${t('enableNotifBanner')}<button class="btn-primary" id="btnEnableNotif">${t('enableNotif')}</button>`;
    document.getElementById('btnEnableNotif').onclick = async () => {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') { banner.style.display = 'none'; showToast(t('notifEnabled')); }
    };
  } else {
    banner.style.display = 'none';
  }
}

// ---------- DRAWER / MENU ----------
// ---------- TIME PICKER MODAL (native input[type=time]) ----------
let timeModalCallback = null;
