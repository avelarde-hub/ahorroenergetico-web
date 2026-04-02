const DEMO_DATA = [
  { id: 'r1', date: '2026-01-05', area: 'Agencia Matriz', category: 'Iluminación', consumption: 420, target: 460, cost: 74.2, owner: 'Carlos Ruiz', notes: 'Se reemplazaron luminarias por LED.' },
  { id: 'r2', date: '2026-01-18', area: 'Centro de Datos', category: 'Equipos', consumption: 690, target: 650, cost: 140.9, owner: 'Ana Mena', notes: 'Incremento por mantenimiento preventivo.' },
  { id: 'r3', date: '2026-02-03', area: 'Agencia Norte', category: 'Climatización', consumption: 500, target: 530, cost: 98.5, owner: 'Luis Pérez', notes: 'Ajuste de termostatos.' },
  { id: 'r4', date: '2026-02-15', area: 'Planta Producción', category: 'Producción', consumption: 820, target: 780, cost: 182.1, owner: 'María Cedeño', notes: 'Mayor carga operativa.' },
  { id: 'r5', date: '2026-03-02', area: 'Agencia Sur', category: 'General', consumption: 360, target: 410, cost: 68.7, owner: 'David Loor', notes: 'Reducción por horarios escalonados.' },
  { id: 'r6', date: '2026-03-12', area: 'Edificio Administrativo', category: 'Iluminación', consumption: 315, target: 360, cost: 59.8, owner: 'Paola Vega', notes: 'Campaña interna de apagado responsable.' },
  { id: 'r7', date: '2026-03-18', area: 'Centro de Datos', category: 'Equipos', consumption: 640, target: 630, cost: 136.2, owner: 'Ana Mena', notes: 'Uso intensivo de respaldo.' },
  { id: 'r8', date: '2026-03-24', area: 'Agencia Matriz', category: 'Climatización', consumption: 470, target: 500, cost: 88.4, owner: 'Carlos Ruiz', notes: 'Mantenimiento de aire acondicionado.' }
];

const STORAGE_KEY = 'aserfintec_energy_records_v2026_real';
const THEME_KEY = 'aserfintec_energy_theme_v2026_real';

let records = loadRecords();
let charts = {};

const $ = (id) => document.getElementById(id);
const loginScreen = $('loginScreen');
const appShell = $('appShell');
const loginForm = $('loginForm');
const activeUser = $('activeUser');
const recordForm = $('recordForm');
const recordsBody = $('recordsBody');
const insightsList = $('insightsList');
const summaryBox = $('summaryBox');
const searchInput = $('searchInput');
const filterCategory = $('filterCategory');
const filterOwner = $('filterOwner');
const menuLinks = document.querySelectorAll('.menu-link');
const sections = document.querySelectorAll('.section');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = $('username').value.trim();
  const pass = $('password').value.trim();
  if (user === 'admin' && pass === '1234') openApp(user);
  else alert('Credenciales inválidas. Usa admin / 1234');
});

$('logoutBtn').addEventListener('click', () => {
  appShell.classList.add('hidden');
  loginScreen.classList.remove('hidden');
});

$('themeToggle').addEventListener('click', () => {
  const next = document.body.classList.contains('light') ? 'dark' : 'light';
  applyTheme(next);
});

$('demoBtn').addEventListener('click', () => {
  records = clone(DEMO_DATA);
  persistRecords();
  clearForm();
  refreshAll();
});

$('csvBtn').addEventListener('click', exportCSV);
$('printBtn').addEventListener('click', () => window.print());
$('newBtn').addEventListener('click', clearForm);
searchInput.addEventListener('input', () => { renderTable(); renderCharts(); renderInsights(); renderReports(); });
filterCategory.addEventListener('change', () => { renderTable(); renderCharts(); renderInsights(); renderReports(); });
filterOwner.addEventListener('change', () => { renderTable(); renderCharts(); renderInsights(); renderReports(); });

menuLinks.forEach((btn) => {
  btn.addEventListener('click', () => {
    menuLinks.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.section;
    sections.forEach((s) => s.classList.toggle('active', s.id === `section-${target}`));
    setTimeout(renderCharts, 80);
  });
});

recordForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const record = getFormData();
  const index = records.findIndex((r) => r.id === record.id);
  if (index >= 0) records[index] = record;
  else records.push(record);
  persistRecords();
  clearForm();
  refreshAll();
});

function openApp(user) {
  activeUser.textContent = user;
  loginScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
  if (!records.length) {
    records = clone(DEMO_DATA);
    persistRecords();
  }
  clearForm();
  refreshAll();
}

function getFormData() {
  return {
    id: $('recordId').value || uid(),
    date: $('date').value,
    area: $('area').value.trim(),
    category: $('category').value,
    consumption: Number($('consumption').value),
    target: Number($('target').value),
    cost: Number($('cost').value),
    owner: $('owner').value.trim(),
    notes: $('notes').value.trim()
  };
}

function clearForm() {
  recordForm.reset();
  $('recordId').value = '';
  $('date').value = new Date().toISOString().slice(0, 10);
}

function refreshAll() {
  renderKPIs();
  populateFilters();
  renderTable();
  renderInsights();
  renderReports();
  renderCharts();
}

function renderKPIs() {
  const totalConsumption = sum(records, 'consumption');
  const totalTarget = sum(records, 'target');
  const alerts = records.filter((r) => r.consumption > r.target).length;
  const delta = totalTarget - totalConsumption;

  $('kpiConsumption').textContent = `${format(totalConsumption)} kWh`;
  $('kpiTarget').textContent = `${format(totalTarget)} kWh`;
  $('kpiDelta').textContent = `${format(delta)} kWh`;
  $('kpiAlerts').textContent = String(alerts);
}

function populateFilters() {
  fillSelect(filterCategory, unique(records.map((r) => r.category)), 'Todas las categorías');
  fillSelect(filterOwner, unique(records.map((r) => r.owner)), 'Todos los responsables');
}

function fillSelect(select, values, firstLabel) {
  const selected = select.value;
  select.innerHTML = `<option value="">${firstLabel}</option>` + values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  if (values.includes(selected)) select.value = selected;
}

function getVisibleRecords() {
  const term = searchInput.value.trim().toLowerCase();
  const category = filterCategory.value;
  const owner = filterOwner.value;

  return [...records]
    .filter((r) => !term || [r.area, r.category, r.owner, r.notes].join(' ').toLowerCase().includes(term))
    .filter((r) => !category || r.category === category)
    .filter((r) => !owner || r.owner === owner)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function renderTable() {
  const data = getVisibleRecords();
  recordsBody.innerHTML = '';

  if (!data.length) {
    recordsBody.innerHTML = '<tr><td colspan="9">No existen registros para mostrar.</td></tr>';
    return;
  }

  data.forEach((r) => {
    const tr = document.createElement('tr');
    const isAlert = r.consumption > r.target;
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${escapeHtml(r.area)}</td>
      <td>${escapeHtml(r.category)}</td>
      <td>${format(r.consumption)} kWh</td>
      <td>${format(r.target)} kWh</td>
      <td>$${format(r.cost)}</td>
      <td>${escapeHtml(r.owner)}</td>
      <td><span class="status ${isAlert ? 'alert' : 'ok'}">${isAlert ? 'Sobre meta' : 'En control'}</span></td>
      <td>
        <div class="action-group">
          <button class="mini-btn" data-edit="${r.id}">Editar</button>
          <button class="mini-btn" data-delete="${r.id}">Eliminar</button>
        </div>
      </td>
    `;
    recordsBody.appendChild(tr);
  });

  document.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => editRecord(btn.dataset.edit)));
  document.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => deleteRecord(btn.dataset.delete)));
}

function editRecord(id) {
  const r = records.find((x) => x.id === id);
  if (!r) return;
  $('recordId').value = r.id;
  $('date').value = r.date;
  $('area').value = r.area;
  $('category').value = r.category;
  $('consumption').value = r.consumption;
  $('target').value = r.target;
  $('cost').value = r.cost;
  $('owner').value = r.owner;
  $('notes').value = r.notes;
  document.querySelector('[data-section="registros"]').click();
}

function deleteRecord(id) {
  records = records.filter((r) => r.id !== id);
  persistRecords();
  refreshAll();
}

function renderInsights() {
  const data = getVisibleRecords();
  insightsList.innerHTML = '';
  if (!data.length) {
    insightsList.innerHTML = '<li>No existen datos suficientes para generar hallazgos.</li>';
    return;
  }

  const topArea = [...data].sort((a, b) => b.consumption - a.consumption)[0];
  const alerts = data.filter((r) => r.consumption > r.target).length;
  const topCategory = Object.entries(groupSum(data, 'category', 'consumption')).sort((a, b) => b[1] - a[1])[0];
  const compliant = data.filter((r) => r.consumption <= r.target).length;

  [
    `El mayor consumo visible corresponde a ${topArea.area}, con ${format(topArea.consumption)} kWh registrados el ${topArea.date}.`,
    `Se identifican ${alerts} registros que superan la meta establecida.`,
    `La categoría con mayor consumo acumulado es ${topCategory[0]}, con ${format(topCategory[1])} kWh.`,
    `${compliant} de ${data.length} registros se mantienen dentro de la meta definida.`
  ].forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    insightsList.appendChild(li);
  });
}

function renderReports() {
  const data = getVisibleRecords();
  const totalConsumption = sum(data, 'consumption');
  const totalTarget = sum(data, 'target');
  const totalCost = sum(data, 'cost');
  const average = data.length ? totalConsumption / data.length : 0;
  const alerts = data.filter((r) => r.consumption > r.target).length;
  const largestGap = [...data].sort((a, b) => (b.consumption - b.target) - (a.consumption - a.target))[0];

  const items = [
    `Consumo total del periodo visible: <strong>${format(totalConsumption)} kWh</strong>.`,
    `Meta acumulada del periodo visible: <strong>${format(totalTarget)} kWh</strong>.`,
    `Costo total estimado: <strong>$${format(totalCost)}</strong>.`,
    `Promedio de consumo por registro: <strong>${format(average)} kWh</strong>.`,
    `Alertas activas: <strong>${alerts}</strong>.`,
    largestGap ? `Mayor desviación identificada: <strong>${escapeHtml(largestGap.area)}</strong>, con ${format(largestGap.consumption - largestGap.target)} kWh sobre la meta.` : 'No existen desviaciones identificadas.'
  ];

  summaryBox.innerHTML = items.map((item) => `<div class="summary-item">${item}</div>`).join('');
}

function renderCharts() {
  destroyCharts();
  const data = getVisibleRecords();
  if (typeof Chart === 'undefined') return;

  const textColor = cssVar('--text');
  const mutedColor = cssVar('--muted');
  const gridColor = document.body.classList.contains('light') ? 'rgba(20,35,58,.10)' : 'rgba(255,255,255,.08)';

  const chartBase = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: textColor } } },
    scales: {
      x: { ticks: { color: mutedColor }, grid: { color: gridColor } },
      y: { ticks: { color: mutedColor }, grid: { color: gridColor }, beginAtZero: true }
    }
  };

  charts.trend = new Chart($('trendChart'), {
    type: 'line',
    data: {
      labels: data.map((r) => r.date),
      datasets: [
        {
          label: 'Consumo real',
          data: data.map((r) => r.consumption),
          borderColor: '#21c7c9',
          backgroundColor: 'rgba(33,199,201,.18)',
          pointBackgroundColor: '#21c7c9',
          pointBorderColor: '#21c7c9',
          fill: true,
          tension: 0.35,
          borderWidth: 3
        },
        {
          label: 'Meta',
          data: data.map((r) => r.target),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,.10)',
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#f59e0b',
          fill: false,
          tension: 0.35,
          borderWidth: 3
        }
      ]
    },
    options: chartBase
  });

  const byCategory = groupSum(data, 'category', 'consumption');
  charts.category = new Chart($('categoryChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(byCategory),
      datasets: [{
        label: 'kWh',
        data: Object.values(byCategory),
        backgroundColor: ['#21c7c9', '#2082ff', '#0fb981', '#8b5cf6', '#f59e0b'],
        borderRadius: 10
      }]
    },
    options: chartBase
  });

  const byAreaCost = groupSum(data, 'area', 'cost');
  charts.cost = new Chart($('costChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(byAreaCost),
      datasets: [{
        data: Object.values(byAreaCost),
        backgroundColor: ['#21c7c9', '#2082ff', '#0fb981', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1'],
        borderWidth: 2,
        borderColor: document.body.classList.contains('light') ? '#ffffff' : '#0b1424'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: textColor } } }
    }
  });

  const topAreas = Object.entries(groupSum(data, 'area', 'consumption')).sort((a, b) => b[1] - a[1]).slice(0, 5);
  charts.topAreas = new Chart($('topAreasChart'), {
    type: 'bar',
    data: {
      labels: topAreas.map((item) => item[0]),
      datasets: [{
        label: 'kWh',
        data: topAreas.map((item) => item[1]),
        backgroundColor: '#2082ff',
        borderRadius: 10
      }]
    },
    options: { ...chartBase, indexAxis: 'y' }
  });
}

function destroyCharts() {
  Object.values(charts).forEach((chart) => chart && chart.destroy());
  charts = {};
}

function exportCSV() {
  const data = getVisibleRecords();
  if (!data.length) return alert('No existen registros para exportar.');
  const headers = ['Fecha', 'Area', 'Categoria', 'Consumo_kWh', 'Meta_kWh', 'Costo_USD', 'Responsable', 'Observaciones'];
  const rows = data.map((r) => [r.date, r.area, r.category, r.consumption, r.target, r.cost, r.owner, r.notes]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'reporte_ahorro_energetico.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function applyTheme(mode) {
  document.body.classList.toggle('light', mode === 'light');
  localStorage.setItem(THEME_KEY, mode);
  renderCharts();
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function persistRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function sum(data, field) {
  return data.reduce((acc, item) => acc + Number(item[field] || 0), 0);
}

function groupSum(data, groupField, valueField) {
  return data.reduce((acc, item) => {
    const key = item[groupField] || 'Sin categoría';
    acc[key] = (acc[key] || 0) + Number(item[valueField] || 0);
    return acc;
  }, {});
}

function unique(values) {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function format(value) {
  return Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function cssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

window.addEventListener('load', () => {
  if (!records.length) {
    records = clone(DEMO_DATA);
    persistRecords();
  }
});
