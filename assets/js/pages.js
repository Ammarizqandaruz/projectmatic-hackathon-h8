/* Shared behavior for standalone ProjectMatic pages. Data stays in this browser only. */
const projectmaticBase = window.ProjectMaticKeywordBase;
const latestDraftKey = 'projectmatic:latest-draft';
const proposalListKey = 'projectmatic:proposals';

const rupiah = value => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value) || 0);

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));

function demoDraft() {
  const services = projectmaticBase.services
    .filter(service => ['strategy', 'design', 'content', 'motion', 'pm'].includes(service.id))
    .map(service => ({ ...service, subtotal: service.rate * service.defaultQuantity }));
  return {
    title: 'Integrated Campaign Proposal',
    client: 'Client Confidential',
    template: 'Integrated Campaign',
    brief: 'Kampanye peluncuran produk digital untuk meningkatkan awareness dan engagement target audience.',
    timeline: '6 weeks (recommended)',
    total: services.reduce((sum, service) => sum + service.subtotal, 0),
    services,
    milestones: projectmaticBase.milestones,
    confidence: 84,
  };
}

function getLatestDraft() {
  try { return JSON.parse(localStorage.getItem(latestDraftKey)) || demoDraft(); } catch { return demoDraft(); }
}

function getProposalRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(proposalListKey) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

function displayDate(isoDate) {
  if (!isoDate) return 'Just now';
  return new Date(isoDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function displayEstimate(draft) {
  return draft.totalLabel || rupiah(draft.total);
}

function renderProposalList() {
  const table = document.getElementById('proposal-list-page');
  if (!table) return;
  const stored = getProposalRecords();
  const records = stored.length ? stored : [{ ...getLatestDraft(), createdAt: new Date().toISOString(), status: 'review' }];
  const draw = query => {
    const visible = records.filter(item => `${item.title} ${item.client} ${item.template}`.toLowerCase().includes(query.toLowerCase()));
    table.innerHTML = visible.length ? visible.map((item, index) => `
      <article class="proposal-record"><div class="proposal-record-project"><b>${escapeHtml(item.title)}</b><small>${displayDate(item.createdAt)}</small></div>
      <div class="proposal-record-value">${escapeHtml(item.client || 'Client Confidential')}</div><div class="proposal-record-value">${escapeHtml(item.template || 'Smart Proposal')}</div>
      <div class="proposal-record-estimate">${escapeHtml(displayEstimate(item))}</div><div><span class="tag tag-review">Needs review</span></div>
      <button class="proposal-open" data-open-proposal="${index}">Open review <span>→</span></button></article>`).join('') : '<div class="proposal-empty">Tidak ada proposal yang cocok.</div>';
    document.querySelectorAll('[data-open-proposal]').forEach(button => button.addEventListener('click', () => {
      localStorage.setItem(latestDraftKey, JSON.stringify(records[Number(button.dataset.openProposal)]));
      window.location.href = 'proposal-review.html';
    }));
  };
  draw('');
  document.getElementById('proposal-search-page')?.addEventListener('input', event => draw(event.target.value));
}

function renderRateCard() {
  const target = document.getElementById('rate-card-detail');
  if (!target) return;
  const icons = ['✦', '◈', '⌁', '✎', '▷', '✓'];
  target.innerHTML = projectmaticBase.services.map((service, index) => {
    const keywords = service.keywords.filter(keyword => keyword !== '__always__');
    const visibleKeywords = keywords.slice(0, 5);
    const overflow = keywords.length - visibleKeywords.length;
    const keywordMarkup = visibleKeywords.length
      ? visibleKeywords.map(keyword => `<span>${escapeHtml(keyword)}</span>`).join('') + (overflow > 0 ? `<span>+${overflow}</span>` : '')
      : '<span>always included</span>';
    return `<article class="rate-price-card"><div class="rate-price-top"><span class="rate-icon rate-icon-${index}">${icons[index]}</span><div class="rate-service"><p>Service</p><h3>${escapeHtml(service.label)}</h3></div><div class="rate-amount"><b>${rupiah(service.rate)}</b><span>per ${escapeHtml(service.unit)}</span></div></div><div class="rate-card-footer"><div class="rate-keywords"><small>Matching keywords</small><div>${keywordMarkup}</div></div><div class="rate-effort"><small>Default effort</small><b>${service.defaultQuantity} ${escapeHtml(service.unit)}s</b></div></div></article>`;
  }).join('');
}

function templateLinks() {
  document.querySelectorAll('.template-start').forEach(button => button.addEventListener('click', () => {
    window.location.href = `../index.html?template=${encodeURIComponent(button.dataset.template)}`;
  }));
}

function renderLangflowOutput(markdown) {
  const lines = String(markdown || '').replace(/\r/g, '').split('\n');
  const html = [];
  let index = 0;
  const paragraph = value => `<p>${escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (line.startsWith('# ')) { html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`); index += 1; continue; }
    if (line.startsWith('## ')) { html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`); index += 1; continue; }
    if (line.startsWith('|')) {
      const tableLines = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) tableLines.push(lines[index++].trim());
      const rows = tableLines.filter(row => !/^\|?\s*:?-{3,}/.test(row)).map(row => row.split('|').slice(1, -1).map(cell => cell.trim()));
      if (rows.length) {
        const [head, ...body] = rows;
        html.push(`<div class="proposal-table-wrap"><table><thead><tr>${head.map(cell => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead><tbody>${body.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      }
      continue;
    }
    if (/^-\s+/.test(line)) {
      const bullets = [];
      while (index < lines.length && /^-\s+/.test(lines[index].trim())) bullets.push(lines[index++].trim().replace(/^-\s+/, ''));
      html.push(`<ul>${bullets.map(item => `<li>${escapeHtml(item).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`).join('')}</ul>`);
      continue;
    }
    html.push(paragraph(line));
    index += 1;
  }
  return html.join('');
}

function renderLangflowReview(draft) {
  const source = draft.langflow || {};
  const generatedAt = source.generatedAt ? new Date(source.generatedAt).toLocaleString('id-ID') : 'Waktu tidak tersedia';
  return `<article class="proposal-document langflow-proposal"><section class="proposal-cover"><p class="proposal-brand">PROJECTMATIC / LIVE LANGFLOW</p><h1>${escapeHtml(draft.title || 'Project Proposal')}</h1><p>Proposal review-only untuk ${escapeHtml(draft.client || 'Client Confidential')}. Isi proposal di bawah berasal langsung dari Langflow Flow, bukan generator keyword lokal.</p><footer><span>Flow ${escapeHtml(source.flowId || 'unknown')}</span><span>${escapeHtml(generatedAt)}</span></footer></section><section class="proposal-section"><div class="langflow-proof"><span>●</span><div><b>Verified Langflow execution</b><small>Session ${escapeHtml(source.sessionId || 'unknown')} · ${escapeHtml(source.knowledge || 'AstraDB context via Flow')}</small></div></div><div class="langflow-output">${renderLangflowOutput(draft.langflowOutput)}</div><div class="review-notice mt-6"><b>Review notice.</b> Draf ini dihasilkan Langflow. Scope, estimasi, dan timeline tetap memerlukan persetujuan Project Manager sebelum dibagikan.</div></section></article>`;
}

function renderReviewPage() {
  const target = document.getElementById('proposal-review-content');
  if (!target) return;
  const draft = getLatestDraft();
  if (draft.langflowOutput) {
    target.innerHTML = renderLangflowReview(draft);
    document.title = `${draft.title || 'Proposal'} — ProjectMatic`;
    if (new URLSearchParams(window.location.search).has('export')) document.getElementById('export-tip')?.classList.remove('hidden');
    document.getElementById('print-proposal')?.addEventListener('click', () => window.print());
    return;
  }
  const services = Array.isArray(draft.services) && draft.services.length ? draft.services : demoDraft().services;
  const milestones = Array.isArray(draft.milestones) && draft.milestones.length ? draft.milestones : projectmaticBase.milestones;
  const total = Number(draft.total) || services.reduce((sum, service) => sum + (Number(service.subtotal) || 0), 0);
  const deliverables = services.map(service => `<li>${escapeHtml(service.label)} sesuai scope, workflow, dan standar review agensi.</li>`).join('');
  const costs = services.map(service => `<tr><td><b>${escapeHtml(service.label)}</b><small>${service.defaultQuantity} ${escapeHtml(service.unit)} × ${rupiah(service.rate)}</small></td><td>${rupiah(service.subtotal || service.rate * service.defaultQuantity)}</td></tr>`).join('');
  const milestoneMarkup = milestones.map((milestone, index) => `<article class="milestone-card"><b class="milestone-index">0${index + 1}</b><div><small>${escapeHtml(milestone.duration)}</small><h3>${escapeHtml(milestone.title)}</h3><p>${escapeHtml(milestone.output)}</p></div></article>`).join('');
  target.innerHTML = `<article class="proposal-document"><section class="proposal-cover"><p class="proposal-brand">PROJECTMATIC / ${escapeHtml(draft.template || 'SMART PROPOSAL').toUpperCase()}</p><h1>${escapeHtml(draft.title || 'Project Proposal')}</h1><p>Review-only creative proposal for ${escapeHtml(draft.client || 'Client Confidential')}. Dibuat dari brief dan rate card internal ProjectMatic.</p><footer><span>Prepared by Rasyad Agency</span><span>${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></footer></section><section class="proposal-section"><p class="proposal-kicker">01 / PROJECT OVERVIEW</p><h2>Proposal summary</h2><p class="proposal-summary">${escapeHtml(draft.brief || 'Brief belum tersedia.')}</p><div class="proposal-metrics"><div class="proposal-metric"><b>${escapeHtml(draft.timeline || '6 weeks')}</b><span>Recommended timeline</span></div><div class="proposal-metric"><b>${rupiah(total)}</b><span>Estimated investment</span></div></div></section><section class="proposal-section"><p class="proposal-kicker">02 / SCOPE OF WORK</p><h2>Deliverables</h2><ul class="proposal-list">${deliverables}</ul><h2 class="mt-10">Investment estimate</h2><div class="overflow-x-auto"><table class="proposal-cost-table"><thead><tr><th>Service & effort</th><th>Subtotal</th></tr></thead><tbody>${costs}</tbody></table></div><div class="proposal-total"><span>Estimated total</span><b>${rupiah(total)}</b></div></section><section class="proposal-section"><p class="proposal-kicker">03 / DELIVERY PLAN</p><h2>Milestones</h2>${milestoneMarkup}</section><section class="proposal-section"><p class="proposal-kicker">04 / REVIEW NOTES</p><h2>Assumptions</h2><ul class="proposal-list"><li>Klien menyediakan guideline, aset, dan feedback sesuai jadwal kerja.</li><li>Termasuk maksimal dua putaran revisi per tahap utama.</li><li>Biaya iklan, talent, produksi pihak ketiga, dan pajak belum termasuk kecuali disepakati terpisah.</li></ul><div class="review-notice mt-6"><b>Review notice.</b> Ini adalah draf proposal berbasis AI dan rate card. Scope, kuantitas, timeline, dan estimasi harus disetujui Project Manager sebelum dibagikan kepada klien.</div></section></article>`;
  document.title = `${draft.title || 'Proposal'} — ProjectMatic`;
  if (new URLSearchParams(window.location.search).has('export')) document.getElementById('export-tip')?.classList.remove('hidden');
  document.getElementById('print-proposal')?.addEventListener('click', () => window.print());
}

renderProposalList();
renderRateCard();
templateLinks();
renderReviewPage();
