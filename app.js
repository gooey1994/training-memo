/* ===================================================================
   Training Memo App – app.js
   =================================================================== */

// ==================== DATA & CONSTANTS ====================
const BODY_PARTS = ['胸', '背中', '肩', '腕', '脚', '腹'];

const DEFAULT_EXERCISES = {
  'ベンチプレス': '胸',
  'インクラインダンベルプレス': '胸',
  'ダンベルフライ': '胸',
  'チェストプレス': '胸',
  'スクワット': '脚',
  'レッグプレス': '脚',
  'レッグカール': '脚',
  'レッグエクステンション': '脚',
  'カーフレイズ': '脚',
  'デッドリフト': '背中',
  'ラットプルダウン': '背中',
  'ベントオーバーロウ': '背中',
  'シーテッドロウ': '背中',
  'ショルダープレス': '肩',
  'サイドレイズ': '肩',
  'フロントレイズ': '肩',
  'リアレイズ': '肩',
  'バーベルカール': '腕',
  'ダンベルカール': '腕',
  'ハンマーカール': '腕',
  'トライセプスエクステンション': '腕',
  'トライセプスプッシュダウン': '腕',
  'クランチ': '腹',
  'レッグレイズ': '腹',
  'プランク': '腹',
};

// ==================== STATE ====================
let exercises = {};  // { name: bodyPart }
let sessions = [];   // [ { id, date, exercises: [ { name, bodyPart, sets: [{weight,reps}] } ] } ]
let chartInstance = null;
let volumeChartInstance = null;

// ==================== STORAGE ====================
function loadData() {
  try {
    const ex = localStorage.getItem('tm_exercises');
    exercises = ex ? JSON.parse(ex) : { ...DEFAULT_EXERCISES };
    const ss = localStorage.getItem('tm_sessions');
    sessions = ss ? JSON.parse(ss) : [];
  } catch {
    exercises = { ...DEFAULT_EXERCISES };
    sessions = [];
  }
}

function saveData() {
  localStorage.setItem('tm_exercises', JSON.stringify(exercises));
  localStorage.setItem('tm_sessions', JSON.stringify(sessions));
}

// ==================== UUID ====================
function uuid() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    ((Math.random() * 16) | 0).toString(16)
  );
}

// ==================== NAVIGATION ====================
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.page;
      navigateTo(target);
    });
  });
}

function navigateTo(pageId) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const tab = document.querySelector(`.nav-tab[data-page="${pageId}"]`);
  const page = document.getElementById(pageId);
  if (tab) tab.classList.add('active');
  if (page) {
    page.classList.add('active');
    page.style.animation = 'none';
    page.offsetHeight; // reflow
    page.style.animation = '';
  }
  // Refresh page-specific content
  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'history') renderHistory();
  if (pageId === 'charts') renderChartPage();
}

// ==================== TOAST ====================
function showToast(message, icon = '✅') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">${icon}</span>${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  // Stats
  const totalSessions = sessions.length;
  const totalSets = sessions.reduce((acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets.length, 0), 0);
  const totalVolume = sessions.reduce((acc, s) =>
    acc + s.exercises.reduce((a, e) =>
      a + e.sets.reduce((x, st) => x + (st.weight * st.reps), 0), 0), 0);

  // This month
  const now = new Date();
  const thisMonth = sessions.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  document.getElementById('stat-sessions').textContent = totalSessions;
  document.getElementById('stat-sets').textContent = totalSets;
  document.getElementById('stat-volume').textContent = totalVolume >= 1000
    ? (totalVolume / 1000).toFixed(1) + 'k'
    : totalVolume;
  document.getElementById('stat-monthly').textContent = thisMonth;

  // Body part volume (last 7 days)
  renderBodyPartVolume();

  // Recent sessions
  renderRecentSessions();
}

function renderBodyPartVolume() {
  const container = document.getElementById('body-part-volume');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const volumeByPart = {};
  BODY_PARTS.forEach(bp => volumeByPart[bp] = 0);

  sessions.forEach(s => {
    if (new Date(s.date) >= sevenDaysAgo) {
      s.exercises.forEach(ex => {
        const vol = ex.sets.reduce((a, st) => a + st.weight * st.reps, 0);
        if (volumeByPart[ex.bodyPart] !== undefined) {
          volumeByPart[ex.bodyPart] += vol;
        }
      });
    }
  });

  const maxVol = Math.max(...Object.values(volumeByPart), 1);

  container.innerHTML = BODY_PARTS.map(bp => {
    const vol = volumeByPart[bp];
    const pct = (vol / maxVol) * 100;
    return `
      <div class="volume-bar-col">
        <span class="volume-bar-value">${vol >= 1000 ? (vol / 1000).toFixed(1) + 'k' : vol}</span>
        <div class="volume-bar" style="height: ${Math.max(pct, 4)}%"></div>
        <span class="volume-bar-label">${bp}</span>
      </div>`;
  }).join('');
}

function renderRecentSessions() {
  const container = document.getElementById('recent-sessions');
  const recent = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏋️</div>
        <p>まだトレーニング記録がありません<br>最初のセッションを記録しましょう！</p>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('record')">記録する</button>
      </div>`;
    return;
  }

  container.innerHTML = recent.map(s => {
    const parts = [...new Set(s.exercises.map(e => e.bodyPart))];
    const exCount = s.exercises.length;
    return `
      <div class="session-item" onclick="navigateTo('history')">
        <div>
          <div class="session-date">${formatDate(s.date)}</div>
          <div class="session-summary">${exCount}種目・${parts.join(', ')}</div>
        </div>
        <div class="session-badge">${parts.join(' / ')}</div>
      </div>`;
  }).join('');
}

// ==================== RECORD PAGE ====================
let currentExerciseEntries = [];

function initRecordPage() {
  document.getElementById('record-date').value = new Date().toISOString().split('T')[0];
  updateDateWeekday();
  document.getElementById('record-date').addEventListener('change', updateDateWeekday);
  document.getElementById('btn-add-exercise').addEventListener('click', addExerciseEntry);
  document.getElementById('btn-save-session').addEventListener('click', saveSession);
  document.getElementById('btn-add-custom').addEventListener('click', openCustomExerciseModal);
  populateExerciseSelect();
}

function updateDateWeekday() {
  const dateVal = document.getElementById('record-date').value;
  const el = document.getElementById('date-display-text');
  if (!el) return;
  if (!dateVal) { el.textContent = '----/--/-- (--)'; return; }
  const d = new Date(dateVal);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  el.innerHTML = `${y}/${m}/${day} <span class="date-weekday">(${days[d.getDay()]})</span>`;
}

function populateExerciseSelect(selectEl) {
  const select = selectEl || document.getElementById('exercise-select-template');
  if (!select) return;
  const grouped = {};
  BODY_PARTS.forEach(bp => grouped[bp] = []);
  Object.entries(exercises).forEach(([name, bp]) => {
    if (grouped[bp]) grouped[bp].push(name);
  });

  select.innerHTML = '<option value="">メニューを選択</option>';
  BODY_PARTS.forEach(bp => {
    if (grouped[bp].length === 0) return;
    const optgroup = document.createElement('optgroup');
    optgroup.label = `── ${bp} ──`;
    grouped[bp].forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  });
}

function addExerciseEntry() {
  const id = uuid();
  currentExerciseEntries.push({ id, name: '', bodyPart: '', sets: [{ weight: '', reps: '', memo: '' }] });
  renderExerciseEntries();
}

function removeExerciseEntry(entryId) {
  currentExerciseEntries = currentExerciseEntries.filter(e => e.id !== entryId);
  renderExerciseEntries();
}

function renderExerciseEntries() {
  const container = document.getElementById('exercise-entries');
  if (currentExerciseEntries.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:30px">
        <div class="empty-icon">💪</div>
        <p>「種目を追加」ボタンで種目を追加してください</p>
      </div>`;
    return;
  }

  container.innerHTML = currentExerciseEntries.map((entry, idx) => {
    const setsHtml = entry.sets.map((set, si) => `
      <div class="set-row">
        <div class="set-number">${si + 1}</div>
        <input type="number" class="set-input" placeholder="kg" min="0" step="0.5"
               value="${set.weight}" data-entry="${entry.id}" data-set="${si}" data-field="weight">
        <input type="number" class="set-input" placeholder="回" min="0"
               value="${set.reps}" data-entry="${entry.id}" data-set="${si}" data-field="reps">
        <input type="text" class="set-input set-memo" placeholder="メモ"
               value="${set.memo || ''}" data-entry="${entry.id}" data-set="${si}" data-field="memo">
        <button class="btn btn-danger btn-icon" onclick="removeSet('${entry.id}', ${si})" title="削除">✕</button>
      </div>
    `).join('');

    return `
      <div class="exercise-entry" data-entry-id="${entry.id}">
        <div class="exercise-entry-header">
          <div class="exercise-entry-title">
            種目 ${idx + 1}
            ${entry.bodyPart ? `<span class="body-tag">${entry.bodyPart}</span>` : ''}
          </div>
          <button class="btn btn-danger btn-sm" onclick="removeExerciseEntry('${entry.id}')">削除</button>
        </div>
        <div class="form-group">
          <select class="form-select exercise-select" data-entry="${entry.id}" onchange="onExerciseChange(this)">
            <option value="">メニューを選択</option>
          </select>
        </div>
        <div class="set-list">
          <div class="set-header">
            <div>SET</div><div>重量</div><div>回数</div><div>メモ</div><div></div>
          </div>
          ${setsHtml}
        </div>
        <button class="btn btn-secondary btn-sm mt-8" onclick="addSet('${entry.id}')">＋ セット追加</button>
      </div>
    `;
  }).join('');

  // Populate selects and set selected value
  container.querySelectorAll('.exercise-select').forEach(sel => {
    const entryId = sel.dataset.entry;
    const entry = currentExerciseEntries.find(e => e.id === entryId);
    populateExerciseSelect(sel);
    if (entry && entry.name) sel.value = entry.name;
  });

  // Bind set input changes
  container.querySelectorAll('.set-input').forEach(inp => {
    inp.addEventListener('input', onSetInputChange);
  });
}

function onExerciseChange(select) {
  const entryId = select.dataset.entry;
  const entry = currentExerciseEntries.find(e => e.id === entryId);
  if (!entry) return;
  entry.name = select.value;
  entry.bodyPart = exercises[select.value] || '';
  renderExerciseEntries();
}

function onSetInputChange(e) {
  const entryId = e.target.dataset.entry;
  const setIdx = parseInt(e.target.dataset.set);
  const field = e.target.dataset.field;
  const entry = currentExerciseEntries.find(en => en.id === entryId);
  if (!entry) return;
  entry.sets[setIdx][field] = e.target.value;
}

function addSet(entryId) {
  const entry = currentExerciseEntries.find(e => e.id === entryId);
  if (!entry) return;
  // Copy weight from last set for convenience
  const lastSet = entry.sets[entry.sets.length - 1];
  entry.sets.push({ weight: lastSet ? lastSet.weight : '', reps: '', memo: '' });
  renderExerciseEntries();
}

function removeSet(entryId, setIdx) {
  const entry = currentExerciseEntries.find(e => e.id === entryId);
  if (!entry || entry.sets.length <= 1) return;
  entry.sets.splice(setIdx, 1);
  renderExerciseEntries();
}

function saveSession() {
  const date = document.getElementById('record-date').value;
  if (!date) { showToast('日付を入力してください', '⚠️'); return; }

  const validEntries = currentExerciseEntries.filter(e => {
    if (!e.name) return false;
    const validSets = e.sets.filter(s => s.weight !== '' && s.reps !== '');
    return validSets.length > 0;
  });

  if (validEntries.length === 0) {
    showToast('種目と重量・回数を入力してください', '⚠️');
    return;
  }

  const session = {
    id: uuid(),
    date,
    exercises: validEntries.map(e => ({
      name: e.name,
      bodyPart: e.bodyPart,
      sets: e.sets
        .filter(s => s.weight !== '' && s.reps !== '')
        .map(s => ({
          weight: parseFloat(s.weight) || 0,
          reps: parseInt(s.reps) || 0,
          memo: s.memo || ''
        }))
    }))
  };

  sessions.push(session);
  saveData();
  showToast('トレーニングを保存しました！', '🎉');

  // Reset
  currentExerciseEntries = [];
  renderExerciseEntries();
  document.getElementById('record-date').value = new Date().toISOString().split('T')[0];
  updateDateWeekday();
}

// ==================== CUSTOM EXERCISE MODAL ====================
function openCustomExerciseModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('custom-name').value = '';
  document.getElementById('custom-bodypart').value = BODY_PARTS[0];
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function saveCustomExercise() {
  const name = document.getElementById('custom-name').value.trim();
  const bodyPart = document.getElementById('custom-bodypart').value;
  if (!name) { showToast('メニュー名を入力してください', '⚠️'); return; }
  if (exercises[name]) { showToast('同名のメニューが存在します', '⚠️'); return; }
  exercises[name] = bodyPart;
  saveData();
  showToast(`「${name}」を追加しました`, '✅');
  closeModal();
  renderExerciseEntries(); // Refresh selects
}

// ==================== HISTORY PAGE ====================
let historyFilter = 'all';

function renderHistory() {
  const container = document.getElementById('history-list');
  const filterContainer = document.getElementById('history-filters');

  // Filters
  filterContainer.innerHTML = `
    <button class="filter-chip ${historyFilter === 'all' ? 'active' : ''}" onclick="setHistoryFilter('all')">すべて</button>
    ${BODY_PARTS.map(bp => `
      <button class="filter-chip ${historyFilter === bp ? 'active' : ''}" onclick="setHistoryFilter('${bp}')">${bp}</button>
    `).join('')}
  `;

  let filtered = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  if (historyFilter !== 'all') {
    filtered = filtered.filter(s => s.exercises.some(e => e.bodyPart === historyFilter));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>履歴がありません</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(s => {
    const parts = [...new Set(s.exercises.map(e => e.bodyPart))];
    const exercisesHtml = s.exercises.map(ex => {
      const setsHtml = ex.sets.map((st, i) => `
        <div class="history-set">
          <span class="set-label">Set ${i + 1}</span>
          <span>${st.weight} kg</span>
          <span>${st.reps} 回</span>
          ${st.memo ? `<span class="set-memo-text">📝 ${st.memo}</span>` : ''}
        </div>
      `).join('');
      return `
        <div class="history-exercise">
          <div class="history-exercise-name">
            ${ex.name}
            <span class="history-card-tag">${ex.bodyPart}</span>
          </div>
          ${setsHtml}
        </div>
      `;
    }).join('');

    return `
      <div class="history-card" id="hc-${s.id}">
        <div class="history-card-header" onclick="toggleHistoryCard('${s.id}')">
          <div>
            <div class="history-card-date">${formatDate(s.date)}</div>
            <div class="history-card-tags">${parts.map(p => `<span class="history-card-tag">${p}</span>`).join('')}</div>
          </div>
          <div class="history-card-actions">
            <button class="btn btn-danger btn-icon" onclick="event.stopPropagation(); deleteSession('${s.id}')" title="削除">🗑</button>
          </div>
        </div>
        <div class="history-card-detail" id="hd-${s.id}">
          ${exercisesHtml}
        </div>
      </div>
    `;
  }).join('');
}

function setHistoryFilter(f) {
  historyFilter = f;
  renderHistory();
}

function toggleHistoryCard(id) {
  const detail = document.getElementById(`hd-${id}`);
  if (detail) detail.classList.toggle('open');
}

function deleteSession(id) {
  if (!confirm('このセッションを削除しますか？')) return;
  sessions = sessions.filter(s => s.id !== id);
  saveData();
  renderHistory();
  showToast('セッションを削除しました', '🗑');
}

// ==================== CHART PAGE ====================
function renderChartPage() {
  populateChartExerciseSelect();
  renderMainChart();
  renderVolumeChart();
}

function populateChartExerciseSelect() {
  const select = document.getElementById('chart-exercise-select');
  if (!select) return;
  // Find exercises that have been used
  const usedExercises = new Set();
  sessions.forEach(s => s.exercises.forEach(e => usedExercises.add(e.name)));

  const grouped = {};
  BODY_PARTS.forEach(bp => grouped[bp] = []);
  usedExercises.forEach(name => {
    const bp = exercises[name] || '他';
    if (!grouped[bp]) grouped[bp] = [];
    grouped[bp].push(name);
  });

  select.innerHTML = '<option value="">種目を選択</option>';
  BODY_PARTS.forEach(bp => {
    if (!grouped[bp] || grouped[bp].length === 0) return;
    const optgroup = document.createElement('optgroup');
    optgroup.label = `── ${bp} ──`;
    grouped[bp].forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  });
}

function renderMainChart() {
  const exerciseName = document.getElementById('chart-exercise-select')?.value;
  const metric = document.getElementById('chart-metric-select')?.value || 'max-weight';
  const canvas = document.getElementById('main-chart');
  const placeholder = document.getElementById('chart-placeholder');

  if (!exerciseName) {
    canvas.style.display = 'none';
    placeholder.style.display = 'flex';
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  // Gather data
  const dataPoints = [];
  const sortedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  sortedSessions.forEach(s => {
    s.exercises.forEach(ex => {
      if (ex.name !== exerciseName) return;
      let value = 0;
      if (metric === 'max-weight') {
        value = Math.max(...ex.sets.map(st => st.weight));
      } else if (metric === 'total-volume') {
        value = ex.sets.reduce((a, st) => a + st.weight * st.reps, 0);
      } else if (metric === 'max-reps') {
        value = Math.max(...ex.sets.map(st => st.reps));
      }
      dataPoints.push({ date: s.date, value });
    });
  });

  if (dataPoints.length === 0) {
    canvas.style.display = 'none';
    placeholder.style.display = 'flex';
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  canvas.style.display = 'block';
  placeholder.style.display = 'none';

  const labels = dataPoints.map(d => d.date);
  const values = dataPoints.map(d => d.value);

  const metricLabels = {
    'max-weight': '最大重量 (kg)',
    'total-volume': '総ボリューム (kg)',
    'max-reps': '最大回数 (回)'
  };

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: metricLabels[metric],
        data: values,
        borderColor: '#e53935',
        backgroundColor: 'rgba(229, 57, 53, 0.1)',
        borderWidth: 2.5,
        pointBackgroundColor: '#ff1744',
        pointBorderColor: '#ff1744',
        pointRadius: 5,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#9e9e9e', font: { family: 'Inter' } } },
        tooltip: {
          backgroundColor: 'rgba(17,17,17,0.95)',
          titleColor: '#f5f5f5',
          bodyColor: '#f5f5f5',
          borderColor: 'rgba(229,57,53,0.3)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
        }
      },
      scales: {
        x: {
          ticks: { color: '#616161', font: { family: 'Inter', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' }
        },
        y: {
          ticks: { color: '#616161', font: { family: 'Inter', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
          beginAtZero: false
        }
      }
    }
  });
}

function renderVolumeChart() {
  const canvas = document.getElementById('volume-chart');
  if (!canvas) return;

  // Total volume per body part (all time)
  const volumeByPart = {};
  BODY_PARTS.forEach(bp => volumeByPart[bp] = 0);
  sessions.forEach(s => {
    s.exercises.forEach(ex => {
      const vol = ex.sets.reduce((a, st) => a + st.weight * st.reps, 0);
      if (volumeByPart[ex.bodyPart] !== undefined) volumeByPart[ex.bodyPart] += vol;
    });
  });

  const hasData = Object.values(volumeByPart).some(v => v > 0);
  if (!hasData) {
    canvas.style.display = 'none';
    return;
  }
  canvas.style.display = 'block';

  if (volumeChartInstance) volumeChartInstance.destroy();
  volumeChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: BODY_PARTS,
      datasets: [{
        data: BODY_PARTS.map(bp => volumeByPart[bp]),
        backgroundColor: [
          '#e53935', '#ff1744', '#b71c1c',
          '#ff5252', '#d32f2f', '#c62828'
        ],
        borderColor: '#0a0a0a',
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#9e9e9e', font: { family: 'Inter', size: 12 }, padding: 16 }
        },
        tooltip: {
          backgroundColor: 'rgba(17,17,17,0.95)',
          titleColor: '#f5f5f5',
          bodyColor: '#f5f5f5',
          borderColor: 'rgba(229,57,53,0.3)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed >= 1000 ? (ctx.parsed / 1000).toFixed(1) + 'k' : ctx.parsed} kg`
          }
        }
      }
    }
  });
}

function onChartExerciseChange() {
  renderMainChart();
}

function onChartMetricChange() {
  renderMainChart();
}

// ==================== DATA EXPORT / IMPORT ====================
function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: exercises,
    sessions: sessions
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `training-memo-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('バックアップをダウンロードしました', '📤');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.sessions || !data.exercises) {
        showToast('無効なバックアップファイルです', '⚠️');
        return;
      }
      const count = data.sessions.length;
      if (!confirm(`${count}件のセッションデータを復元します。\n現在のデータは上書きされます。よろしいですか？`)) {
        return;
      }
      exercises = data.exercises;
      sessions = data.sessions;
      saveData();
      renderDashboard();
      showToast(`${count}件のセッションを復元しました！`, '📥');
    } catch {
      showToast('ファイルの読み込みに失敗しました', '⚠️');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ==================== HELPERS ====================
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} (${days[d.getDay()]})`;
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initNavigation();
  initRecordPage();
  renderDashboard();
  renderExerciseEntries();

  // Modal close
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Keyboard shortcut: Escape closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});
