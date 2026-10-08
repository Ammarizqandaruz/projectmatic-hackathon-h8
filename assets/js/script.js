/* Workspace UI. Proposal generation deliberately runs through Langflow only. */
const generateButton = document.getElementById('generate-btn');
const modal = document.getElementById('generation-modal');
const closeModal = document.getElementById('close-modal');
const generationState = document.getElementById('generation-state');
const proposalResult = document.getElementById('proposal-result');
const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status-text');
const protocolLog = document.getElementById('protocol-log');
const brief = document.getElementById('brief');
const toast = document.getElementById('toast');
const draftStorageKey = 'projectmatic:latest-draft';
const proposalStorageKey = 'projectmatic:proposals';
const templateSelect = document.getElementById('template-select');
const requestedTemplate = new URLSearchParams(window.location.search).get('template');

let toastTimer;
let latestDraft;
let selectedTemplate = templateSelect.value;

if (requestedTemplate) {
  selectedTemplate = requestedTemplate;
  templateSelect.value = requestedTemplate;
  brief.value = `Project type: ${requestedTemplate}\nObjective: \nDeliverables: \nTimeline: `;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function extractTotal(output) {
  const match = output.match(/estimated\s+total\s*:\s*\**\s*(Rp\s?[\d.,]+)/i)
    || output.match(/total\s*(?:estimasi|investment|biaya)?\s*:\s*\**\s*(Rp\s?[\d.,]+)/i);
  return match ? match[1].replace(/\s+/g, ' ') : 'Lihat proposal';
}

function extractTimeline(output) {
  const match = output.match(/(\d+\s*(?:hari|day|minggu|week|bulan|month)s?)/i);
  return match ? match[1] : 'Dari brief';
}

function setEngineStatus(label, state) {
  const badge = document.getElementById('engine-badge');
  const engineLabel = document.getElementById('engine-label');
  const health = document.getElementById('langflow-health');
  const indicator = document.getElementById('langflow-indicator');
  if (engineLabel) engineLabel.textContent = label;
  if (health) health.textContent = state === 'ready' ? 'Flow API connected' : label;
  if (badge) badge.dataset.state = state;
  if (indicator) {
    indicator.classList.toggle('online', state === 'ready');
    indicator.style.background = state === 'ready' ? '' : state === 'error' ? '#ef6b73' : '#f0b65c';
  }
}

async function checkLangflowHealth() {
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    const health = await response.json();
    if (health.configured) {
      setEngineStatus('Langflow ready', 'ready');
    } else {
      setEngineStatus('Langflow needs setup', 'error');
    }
  } catch {
    setEngineStatus('Local API offline', 'error');
  }
}

function resetModal() {
  generationState.classList.remove('hidden');
  proposalResult.classList.add('hidden');
  progressBar.style.width = '8%';
  progressBar.style.background = '';
  statusText.textContent = 'Mengirim brief aman ke Langflow Flow…';
  protocolLog.textContent = 'WEB → LOCAL API → LANGFLOW';
}

function failGeneration(message) {
  statusText.textContent = message;
  protocolLog.textContent = 'LANGFLOW REQUEST FAILED';
  progressBar.style.width = '100%';
  progressBar.style.background = '#ef6b73';
  showToast(message);
}

function renderDraft(draft) {
  document.getElementById('draft-title').textContent = draft.title;
  document.getElementById('draft-subtitle').textContent = 'Live result from Langflow • ready for PM review';
  document.getElementById('estimate-value').textContent = draft.totalLabel;
  document.getElementById('timeline-value').textContent = draft.timeline;
  document.getElementById('source-value').textContent = 'Live Langflow';
  const provenance = document.getElementById('provenance-card');
  provenance.innerHTML = `<span class="text-emerald-500">●</span><span><b>Verified Langflow execution</b><br>Flow ${escapeHtml(draft.langflow.flowId)} · session ${escapeHtml(draft.langflow.sessionId.slice(-8))} · AstraDB context requested</span>`;
}

async function generateDraft() {
  try {
    await new Promise(resolve => setTimeout(resolve, 250));
    progressBar.style.width = '26%';
    statusText.textContent = 'Langflow sedang mengambil rate card dan template dari flow…';
    protocolLog.textContent = 'LANGFLOW FLOW → ASTRA DB';

    const response = await fetch('/api/generate-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: brief.value.trim(),
        clientName: document.getElementById('client-name').value.trim(),
        template: selectedTemplate,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Langflow tidak dapat membuat proposal.');

    progressBar.style.width = '83%';
    statusText.textContent = 'Menerima proposal asli dari Langflow…';
    protocolLog.textContent = 'LANGFLOW OUTPUT → PROJECTMATIC';
    latestDraft = {
      title: `${selectedTemplate} Proposal`,
      client: document.getElementById('client-name').value.trim() || 'Client Confidential',
      template: selectedTemplate,
      brief: brief.value.trim(),
      timeline: extractTimeline(result.output),
      totalLabel: extractTotal(result.output),
      langflowOutput: result.output,
      langflow: result.provenance,
      createdAt: new Date().toISOString(),
      status: 'review',
    };
    progressBar.style.width = '100%';
    renderDraft(latestDraft);
    generationState.classList.add('hidden');
    proposalResult.classList.remove('hidden');
  } catch (error) {
    failGeneration(error.message || 'Gagal menghubungi Langflow.');
  }
}

function persistDraft() {
  if (!latestDraft) return false;
  localStorage.setItem(draftStorageKey, JSON.stringify(latestDraft));
  const proposals = JSON.parse(localStorage.getItem(proposalStorageKey) || '[]');
  const index = proposals.findIndex(item => item.langflow?.sessionId === latestDraft.langflow?.sessionId);
  if (index === -1) proposals.unshift(latestDraft); else proposals[index] = latestDraft;
  localStorage.setItem(proposalStorageKey, JSON.stringify(proposals));
  return true;
}

generateButton.addEventListener('click', () => {
  if (!brief.value.trim()) {
    brief.focus();
    showToast('Tambahkan brief klien terlebih dahulu.');
    return;
  }
  resetModal();
  modal.classList.remove('hidden');
  generateDraft();
});

closeModal.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', event => { if (event.target === modal) modal.classList.add('hidden'); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') modal.classList.add('hidden'); });

document.getElementById('file-upload').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
    brief.value = await file.text();
    showToast(`${file.name} dibaca. Tinjau brief sebelum generate.`);
  } else {
    brief.value = `Dokumen terlampir: ${file.name}\n\nTambahkan objective, deliverables, dan timeline dari dokumen ini untuk diproses oleh Langflow.`;
    showToast(`${file.name} terlampir. PDF/DOCX memerlukan parser dokumen di Langflow.`);
  }
});

document.getElementById('review-btn').addEventListener('click', () => {
  if (persistDraft()) window.location.href = 'pages/proposal-review.html';
});
document.getElementById('export-pdf-btn').addEventListener('click', () => {
  if (persistDraft()) window.location.href = 'pages/proposal-review.html?export=1';
});
templateSelect.addEventListener('change', event => { selectedTemplate = event.target.value; });

checkLangflowHealth();
