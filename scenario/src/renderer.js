import { parseScenarioCsv, serializeScenarioCsv } from './scenario-csv.js';
import { profileScenarioInBrowser } from './browser-profiler.js';
import { buildSummary, summaryCsv } from './summary-data.js';

const state = {
  models: [], profile: null, tasks: [], scenarioName: '', zoom: 1,
};

const $ = selector => document.querySelector(selector);
const escapeHtml = text => String(text).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));

function formatTime(seconds) { const s = Math.max(0, Math.round(seconds)); return [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map((part, i) => i === 0 ? String(part).padStart(2, '0') : String(part).padStart(2, '0')).join(':'); }
function renderChart() {
  const chart = $('#chart');
  const summary = buildSummary(state.tasks, state.profile);
  $('#scenario-filename').textContent = state.scenarioName;
  $('#zoom-in').disabled = !summary || state.zoom >= 32;
  $('#zoom-out').disabled = !summary || state.zoom <= 1;
  $('#zoom-fit').disabled = !summary;
  if (!summary) { chart.innerHTML = '<p class="empty-chart">No timeline available. Check the scenario and model errors below.</p>'; return; }
  const range = Math.max(state.profile.totalTaskTime / 1000, 1);
  const laneCount = Math.max(1, ...summary.instances.map(item => item.lane + 1));
  const lanes = Array.from({ length: laneCount }, (_, lane) => {
    const items = summary.instances.filter(item => item.lane === lane);
    const bars = items.map((item, index) => {
      const left = item.start / range * 100;
      const width = item.duration / range * 100;
      const labelWidth = Math.max(width, Math.min(18, ((items[index + 1]?.start ?? range) - item.start) / range * 100));
      const label = item.id;
      const title = `${label} · ${item.model} · ${formatTime(item.start)}–${formatTime(item.end)} · ${item.duration.toFixed(2)} s`;
      return `<div class="task-span" tabindex="0" role="img" aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}" style="left:${left}%;width:${width}%"><span class="task-span-label" style="width:${labelWidth / Math.max(width, .001) * 100}%">${escapeHtml(label)}</span></div>`;
    }).join('');
    return `<div class="task-lane" data-lane="${lane}" style="--lane-color:${['var(--lane-primary)','var(--lane-secondary)','var(--lane-third)','var(--lane-fourth)'][lane % 4]}">${bars}</div>`;
  }).join('');
  const plotWidth = Math.max(1, chart.clientWidth - 72) * state.zoom;
  const targetStep = range / Math.max(1, Math.floor(plotWidth / 100));
  const power = 10 ** Math.floor(Math.log10(targetStep));
  const step = [1, 2, 5, 10].find(value => value * power >= targetStep) * power;
  const precision = Math.max(0, -Math.floor(Math.log10(step)));
  const ticks = [];
  const gridLines = [];
  for (let index = 0; index * step <= range; index++) {
    const time = index * step;
    const label = step < 1 ? `${time.toFixed(precision)} s` : formatTime(time);
    ticks.push(`<span class="timeline-tick" style="left:${time / range * 100}%">${label}</span>`);
    gridLines.push(`<span class="timeline-grid-line" style="left:${time / range * 100}%"></span>`);
  }
  chart.innerHTML = `<div class="overlap-timeline" style="width:${plotWidth + 72}px"><div class="timeline-grid" aria-hidden="true">${gridLines.join('')}</div>${lanes}<div class="timeline-axis" aria-label="Elapsed scenario time">${ticks.join('')}</div></div>`;
}
function zoomTimeline(zoom) {
  const chart = $('#chart');
  const center = (chart.scrollLeft + chart.clientWidth / 2 - 36) / Math.max(1, chart.scrollWidth - 72);
  state.zoom = Math.max(1, Math.min(32, zoom));
  renderChart();
  chart.scrollLeft = state.zoom === 1 ? 0 : center * (chart.scrollWidth - 72) + 36 - chart.clientWidth / 2;
}
function renderStats() {
  if (!state.profile?.taskInstances.length) { $('#stat-time').textContent = '—'; $('#stat-memory').textContent = '—'; $('#stat-workload').textContent = '—'; return; }
  $('#stat-time').textContent = formatTime(state.profile.totalTaskTime / 1000);
  $('#stat-memory').innerHTML = `${state.profile.memory.averageLoad.toFixed(1)} <i>chunks</i>`;
  $('#stat-workload').textContent = state.profile.workload.max <= 4 ? 'Low' : state.profile.workload.max <= 6 ? 'Moderate' : 'High';
}
function renderStatsView() {
  const summary = buildSummary(state.tasks, state.profile);
  $('#download-summary').disabled = !summary;
  if (!summary) { $('#stats-content').innerHTML = '<p class="empty-chart">No summary results available.</p>'; return; }
  const maxima = Object.fromEntries(['instances','averageTaskTime','taskTimeStandardDeviation','averageMemoryLoad','memoryLoadStandardDeviation','multitaskingTime'].map(key => [key, Math.max(...summary.models.map(model => model[key]))]));
  const dataBar = (value, maximum, label) => `<td class="data-bar" style="--bar:${maximum ? value / maximum * 100 : 0}%"><span>${label}</span></td>`;
  const rows = summary.models.map(model => `<tr><td>${escapeHtml(model.model.replace(/\.goms$/i, ''))}</td>${dataBar(model.instances, maxima.instances, model.instances)}${dataBar(model.averageTaskTime, maxima.averageTaskTime, `${model.averageTaskTime.toFixed(2)} s`)}${dataBar(model.taskTimeStandardDeviation, maxima.taskTimeStandardDeviation, `${model.taskTimeStandardDeviation.toFixed(2)} s`)}${dataBar(model.averageMemoryLoad, maxima.averageMemoryLoad, model.averageMemoryLoad.toFixed(2))}${dataBar(model.memoryLoadStandardDeviation, maxima.memoryLoadStandardDeviation, model.memoryLoadStandardDeviation.toFixed(2))}${dataBar(model.multitaskingTime, maxima.multitaskingTime, `${model.multitaskingTime.toFixed(2)} s`)}</tr>`).join('');
  $('#stats-content').innerHTML = `<div class="summary-table-scroll"><table class="summary-table"><caption>Model averages across all task instances</caption><thead><tr><th scope="col">Model</th><th scope="col">Instances</th><th scope="col">Average task time</th><th scope="col">Task time SD</th><th scope="col">Average WM load</th><th scope="col">WM load SD</th><th scope="col">Total time multitasked</th></tr></thead><tbody>${rows}</tbody></table></div><p class="summary-note">SD is the population standard deviation across all instances of a model. WM load is the average number of chunks present while an instance is active. Each data bar is scaled to the largest value in its column.</p>`;
}
function renderSetup() {
  const needsSetup = !state.tasks.length || !state.models.length;
  document.querySelector('main').classList.toggle('setup-mode', needsSetup);
  $('#setup-view').classList.toggle('hidden', !needsSetup);
  document.querySelector('.stats-nav').classList.toggle('hidden', needsSetup);
  $('#results-view').classList.toggle('hidden', needsSetup);
  $('#scenario-drop-zone').classList.toggle('loaded', Boolean(state.tasks.length));
  $('#models-drop-zone').classList.toggle('loaded', Boolean(state.models.length));
  $('#scenario-drop-status').textContent = state.tasks.length ? `${state.tasks.length} scheduled task${state.tasks.length === 1 ? '' : 's'} loaded` : 'No scenario loaded';
  $('#models-drop-status').textContent = state.models.length ? `${state.models.length} model${state.models.length === 1 ? '' : 's'} ready` : 'No models loaded';
}
function renderSource() {
  $('#source-text').value = state.profile?.source || '';
  $('#download-source').disabled = !state.profile?.source;
  $('#source-errors').textContent = (state.profile?.errors || []).map(error => {
    const location = error.model ? `${error.model}, line ${error.lineNo + 1}` : `Combined line ${error.combinedLineNo + 1}`;
    return `${error.taskId || 'Scenario'} · ${location}: ${error.hint || error.type}`;
  }).join('\n');
  $('#source-errors').classList.toggle('hidden', !state.profile?.errors.length);
}
function render() { renderSetup(); renderChart(); renderStats(); renderStatsView(); renderSource(); }
function setStatus(message, error = false) { $('#status-message').textContent=message; $('#status-message').classList.toggle('error', error); }

let profileRequest = 0;
async function profileCurrentScenario() {
  if (!state.tasks.length || !state.models.length) return;
  const request = ++profileRequest;
  try {
    setStatus('Profiling scenario…');
    const profile = profileScenarioInBrowser({ tasks:state.tasks, models:state.models });
    if (request !== profileRequest) return;
    state.profile = profile;
    state.zoom = 1;
    render();
    if (profile.errors.length && !profile.taskInstances.length) $('#source-view').open = true;
    setStatus(`Scenario profiled · ${profile.errors.length ? `${profile.errors.length} modeling issue${profile.errors.length === 1 ? '' : 's'} · see summary` : 'no modeling issues'}`);
  } catch (error) {
    if (request !== profileRequest) return;
    state.profile = null;
    render();
    setStatus(error.message || 'Could not profile scenario', true);
  }
}

async function loadScenario(scenario) {
  if (!scenario) return;
  const tasks = parseScenarioCsv(scenario.text);
  if (!tasks.length) throw new Error('This scenario has no tasks. Choose a CSV with a header and at least one task.');
  state.scenarioName = scenario.name;
  state.tasks = tasks; state.profile = null;
  render(); setStatus(`${state.tasks.length} scheduled task${state.tasks.length === 1 ? '' : 's'} loaded`);
  await profileCurrentScenario();
}
async function addModels(models) {
  if (!models.length) return;
  state.models.push(...models.filter(model => !state.models.some(existing => existing.name === model.name)));
  state.profile = null; render(); setStatus(`${state.models.length} model${state.models.length === 1 ? '' : 's'} ready`);
  await profileCurrentScenario();
}
function readText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}.`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(file);
  });
}
async function loadScenarioFile(file) {
  if (!file) return;
  await loadScenario({ name:file.name, text:await readText(file) });
}
async function loadModelFiles(files) {
  const models = await Promise.all(files.map(async file => ({ name:file.name, source:await readText(file) })));
  await addModels(models);
}
function readDroppedEntry(entry) {
  if (entry.isFile) return new Promise((resolve, reject) => entry.file(resolve, reject)).then(file => [file]);
  if (!entry.isDirectory) return Promise.resolve([]);
  const reader = entry.createReader();
  const readBatch = () => new Promise((resolve, reject) => reader.readEntries(resolve, reject));
  return (async () => {
    const entries = [];
    let batch;
    do { batch = await readBatch(); entries.push(...batch); } while (batch.length);
    return (await Promise.all(entries.map(readDroppedEntry))).flat();
  })();
}
async function filesFromDrop(event) {
  const directFiles = Array.from(event.dataTransfer.files || []);
  if (directFiles.length) return directFiles;
  const entries = Array.from(event.dataTransfer.items || [])
    .map(item => item.webkitGetAsEntry?.())
    .filter(Boolean);
  if (entries.length) return (await Promise.all(entries.map(readDroppedEntry))).flat();
  return [];
}
const dropZones = [];
function bindDropZone(selector, extension, onFiles) { dropZones.push({ zone:$(selector), extension, onFiles }); }
function dropZoneAt(event) {
  const target = document.elementFromPoint(event.clientX, event.clientY);
  return dropZones.find(item => item.zone.contains(target));
}
function clearDropHighlights() { dropZones.forEach(item => item.zone.classList.remove('dragging')); }
function highlightDropZone(event) {
  const item = dropZoneAt(event);
  clearDropHighlights();
  if (item) item.zone.classList.add('dragging');
  return item;
}
document.addEventListener('dragenter', event => { highlightDropZone(event); }, true);
document.addEventListener('dragover', event => {
  const item = highlightDropZone(event);
  if (!item) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}, true);
document.addEventListener('dragleave', event => {
  if (!event.relatedTarget) clearDropHighlights();
}, true);
document.addEventListener('drop', async event => {
  const item = dropZoneAt(event);
  clearDropHighlights();
  if (!item) return;
  event.preventDefault();
  const files = (await filesFromDrop(event)).filter(file => file.name.toLowerCase().endsWith(item.extension));
  if (!files.length) { setStatus(`Drop ${item.extension} file${item.extension === '.goms' ? 's' : ''} here.`); return; }
  item.zone.querySelector('small').textContent = `Reading ${files.length} file${files.length === 1 ? '' : 's'}…`;
  try { await item.onFiles(files); } catch (error) { setStatus(error.message || 'Could not load files', true); }
}, true);
$('#scenario-file-input').addEventListener('change', async event => { try { await loadScenarioFile(event.target.files[0]); } catch (error) { setStatus(error.message || 'Could not load scenario', true); } finally { event.target.value=''; } });
$('#models-file-input').addEventListener('change', async event => { try { await loadModelFiles([...event.target.files]); } catch (error) { setStatus(error.message || 'Could not load models', true); } finally { event.target.value=''; } });
bindDropZone('#scenario-drop-zone', '.csv', async files => loadScenarioFile(files[0]));
bindDropZone('#models-drop-zone', '.goms', loadModelFiles);
$('#new-scenario').onclick = () => {
  ++profileRequest;
  Object.assign(state, { models: [], tasks: [], profile: null, scenarioName: '', zoom: 1 });
  $('#source-view').open = false;
  render(); setStatus('Ready when you are');
  $('#scenario-file-input').focus();
};
$('#download-source').onclick = () => {
  if (!state.profile?.source) return;
  const url = URL.createObjectURL(new Blob([state.profile.source], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${state.scenarioName.replace(/\.csv$/i, '') || 'scenario'}.goms`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('#download-summary').onclick = () => {
  const summary = buildSummary(state.tasks, state.profile);
  if (!summary) return;
  const url = URL.createObjectURL(new Blob([summaryCsv(summary)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${state.scenarioName.replace(/\.csv$/i, '') || 'scenario'}-summary.csv`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('#zoom-in').onclick = () => zoomTimeline(state.zoom * 2);
$('#zoom-fit').onclick = () => zoomTimeline(1);
$('#zoom-out').onclick = () => zoomTimeline(state.zoom / 2);
let chartWidth = 0;
new ResizeObserver(([entry]) => {
  if (entry.contentRect.width && entry.contentRect.width !== chartWidth) {
    chartWidth = entry.contentRect.width;
    renderChart();
  }
}).observe($('#chart'));
window.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); const link=document.createElement('a'); link.href=URL.createObjectURL(new Blob([serializeScenarioCsv(state.tasks)], { type:'text/csv' })); link.download='scenario.csv'; link.click(); URL.revokeObjectURL(link.href); setStatus('Scenario downloaded'); } });
render();
