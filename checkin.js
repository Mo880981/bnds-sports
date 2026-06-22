/**
 * BNDS 运动圈 — 打卡页
 */

const SPORTS = [
  { id: 'run', name: '跑步', met: 8.0, group: '日常' },
  { id: 'walk', name: '快走', met: 4.5, group: '日常' },
  { id: 'cycle', name: '骑行', met: 7.5, group: '日常' },
  { id: 'rope', name: '跳绳', met: 10.0, group: '日常' },
  { id: 'basketball', name: '篮球', met: 8.0, group: '球类' },
  { id: 'football', name: '足球', met: 7.0, group: '球类' },
  { id: 'badminton', name: '羽毛球', met: 5.5, group: '球类' },
  { id: 'pingpong', name: '乒乓球', met: 4.0, group: '球类' },
  { id: 'tennis', name: '网球', met: 7.3, group: '球类' },
  { id: 'volleyball', name: '排球', met: 4.0, group: '球类' },
  { id: 'swim', name: '游泳', met: 7.0, group: '水上' },
  { id: 'pe', name: '体育课', met: 5.0, group: '校园' },
  { id: 'fitness', name: '体测训练', met: 6.0, group: '校园' },
  { id: 'morning', name: '早操', met: 3.5, group: '校园' },
  { id: 'yoga', name: '瑜伽', met: 2.5, group: '休闲' },
  { id: 'stretch', name: '拉伸', met: 2.3, group: '休闲' },
];

const state = { sport: null, weight: 0, logs: [] };

const els = {
  setupOverlay: document.getElementById('setup-overlay'),
  setupWeight: document.getElementById('setup-weight'),
  setupError: document.getElementById('setup-error'),
  setupConfirm: document.getElementById('setup-confirm'),
  sportGrid: document.getElementById('sport-grid'),
  duration: document.getElementById('duration'),
  date: document.getElementById('date'),
  note: document.getElementById('note'),
  previewKcal: document.getElementById('preview-kcal'),
  previewDetail: document.getElementById('preview-detail'),
  displayWeight: document.getElementById('display-weight'),
  editWeight: document.getElementById('edit-weight'),
  form: document.getElementById('checkin-form'),
  submitBtn: document.getElementById('submit-btn'),
  historyList: document.getElementById('history-list'),
  historyEmpty: document.getElementById('history-empty'),
  historySummary: document.getElementById('history-summary'),
  toast: document.getElementById('toast'),
};

let toastTimer;

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function calcKcal(met, minutes, weight) {
  if (!met || !minutes || !weight) return 0;
  return Math.round(met * weight * (minutes / 60));
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${m}月${day}日 · 周${weekdays[d.getDay()]}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderSports() {
  const groups = [...new Set(SPORTS.map((s) => s.group))];
  els.sportGrid.innerHTML = groups
    .map((group) => {
      const items = SPORTS.filter((s) => s.group === group);
      const tiles = items
        .map(
          (s) => `
        <button type="button" class="sport-tile" data-id="${s.id}" aria-pressed="false">
          <div class="sport-tile-name">${s.name}</div>
          <div class="sport-tile-met">MET ${s.met}</div>
        </button>`
        )
        .join('');
      return `
      <div>
        <div class="sport-group-label">${group}</div>
        <div class="sport-grid">${tiles}</div>
      </div>`;
    })
    .join('');

  els.sportGrid.querySelectorAll('.sport-tile').forEach((tile) => {
    tile.addEventListener('click', () => selectSport(tile.dataset.id));
  });
}

function selectSport(id) {
  state.sport = SPORTS.find((s) => s.id === id) || null;
  els.sportGrid.querySelectorAll('.sport-tile').forEach((tile) => {
    const active = tile.dataset.id === id;
    tile.classList.toggle('active', active);
    tile.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  updatePreview();
  validateForm();
}

function updatePreview() {
  const minutes = parseInt(els.duration.value, 10) || 0;
  const kcal = state.sport ? calcKcal(state.sport.met, minutes, state.weight) : 0;

  els.previewKcal.textContent = kcal || '—';
  els.previewKcal.classList.toggle('accent', kcal > 0);

  if (state.sport && minutes > 0 && state.weight) {
    els.previewDetail.innerHTML = `
      <strong>${state.sport.name}</strong> · ${minutes} 分钟<br>
      MET ${state.sport.met} × ${state.weight} kg × ${(minutes / 60).toFixed(2)} h<br>
      <span style="font-size:12px; opacity:0.8">估算值，仅供参考</span>`;
  } else if (!state.sport) {
    els.previewDetail.innerHTML = '<span class="preview-empty">请选择运动项目</span>';
  } else if (!minutes) {
    els.previewDetail.innerHTML = '<span class="preview-empty">请输入运动时长</span>';
  } else {
    els.previewDetail.innerHTML = '';
  }
}

function validateForm() {
  const minutes = parseInt(els.duration.value, 10);
  const ok = state.sport && minutes > 0 && minutes <= 600 && els.date.value;
  els.submitBtn.disabled = !ok;
}

function renderHistory() {
  const logs = state.logs;
  const hasLogs = logs.length > 0;

  els.historyEmpty.style.display = hasLogs ? 'none' : 'block';
  els.historyList.style.display = hasLogs ? 'flex' : 'none';

  if (!hasLogs) {
    els.historySummary.innerHTML = '';
    return;
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekLogs = logs.filter((l) => new Date(l.createdAt).getTime() > weekAgo);
  const weekKcal = weekLogs.reduce((sum, l) => sum + l.calories, 0);

  els.historySummary.innerHTML = `
    共 <strong>${logs.length}</strong> 次打卡 ·
    本周 <strong>${weekLogs.length}</strong> 次 ·
    本周 <strong>${weekKcal}</strong> kcal`;

  els.historyList.innerHTML = logs.slice(0, 20).map((log) => `
    <article class="history-item">
      <div class="history-item-main">
        <div class="history-item-top">
          <span class="history-sport">${escapeHtml(log.sportName)}</span>
          <span class="history-meta">${log.minutes} min</span>
        </div>
        <div class="history-meta">${formatDate(log.date)}</div>
        ${log.note ? `<p class="history-note">${escapeHtml(log.note)}</p>` : ''}
      </div>
      <div class="history-item-side">
        <div class="history-kcal">${log.calories} kcal</div>
      </div>
    </article>
  `).join('');
}

function openSetup() {
  els.setupOverlay.classList.remove('hidden');
  els.setupWeight.value = state.weight || '';
  els.setupError.textContent = '';
  els.setupWeight.focus();
}

function closeSetup() {
  els.setupOverlay.classList.add('hidden');
}

async function confirmWeight() {
  const w = parseFloat(els.setupWeight.value);
  if (!w || w < 30 || w > 200) {
    els.setupError.textContent = '请输入 30–200 kg 之间的体重';
    return;
  }

  state.weight = w;
  els.displayWeight.textContent = `${w} kg`;

  try {
    await BNDS_DB.saveWeight(w);
    closeSetup();
    updatePreview();
    validateForm();
    showToast(BNDS_DB.isOnline() ? '体重已保存并同步' : '体重已保存（本地）');
  } catch (err) {
    els.setupError.textContent = '保存失败，请稍后重试';
    console.error(err);
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const minutes = parseInt(els.duration.value, 10);
  if (!state.sport || !minutes) return;

  const calories = calcKcal(state.sport.met, minutes, state.weight);
  const log = {
    id: BNDS_DB.genId(),
    sportId: state.sport.id,
    sportName: state.sport.name,
    met: state.sport.met,
    minutes,
    calories,
    weight: state.weight,
    date: els.date.value,
    note: els.note.value.trim(),
    createdAt: new Date().toISOString(),
  };

  els.submitBtn.disabled = true;
  els.submitBtn.textContent = '提交中…';

  try {
    await BNDS_DB.saveCheckin(log);
    state.logs = await BNDS_DB.getCheckins();

    els.duration.value = '';
    els.note.value = '';
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
    updatePreview();
    validateForm();
    renderHistory();
    showToast(
      BNDS_DB.isOnline() ? `打卡成功 · ${calories} kcal · 已同步` : `打卡成功 · ${calories} kcal`
    );
  } catch (err) {
    console.error(err);
    showToast('上传失败，请检查 Supabase 表是否已创建');
  } finally {
    els.submitBtn.textContent = '完成打卡';
    validateForm();
  }
}

async function init() {
  renderSports();
  els.date.value = todayStr();
  els.date.max = todayStr();

  await BNDS_DB.init();

  state.weight = BNDS_DB.getWeight();
  if (state.weight) {
    els.displayWeight.textContent = `${state.weight} kg`;
  } else {
    openSetup();
  }

  state.logs = await BNDS_DB.getCheckins();
  renderHistory();

  els.setupConfirm.addEventListener('click', confirmWeight);
  els.setupWeight.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmWeight();
  });
  els.editWeight.addEventListener('click', openSetup);
  els.duration.addEventListener('input', () => {
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
    updatePreview();
    validateForm();
  });
  els.date.addEventListener('change', validateForm);

  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      els.duration.value = btn.dataset.min;
      document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      updatePreview();
      validateForm();
    });
  });

  els.form.addEventListener('submit', handleSubmit);
  updatePreview();
  validateForm();

  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  });
}

init();
