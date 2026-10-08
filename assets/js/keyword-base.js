/* Local knowledge base. It can later be copied into AstraDB documents. */
window.ProjectMaticKeywordBase = {
  projectTypes: [
    { label: 'Digital Campaign', keywords: ['campaign', 'kampanye', 'launch', 'launching', 'awareness', 'activation'] },
    { label: 'Website & Landing Page', keywords: ['website', 'web', 'landing page', 'landing', 'microsite'] },
    { label: 'Brand Identity', keywords: ['brand', 'branding', 'identity', 'identitas', 'logo', 'rebrand'] },
    { label: 'Product Experience', keywords: ['app', 'aplikasi', 'dashboard', 'ui', 'ux', 'product'] },
  ],
  services: [
    { id: 'strategy', label: 'Creative Strategy', rate: 850000, unit: 'day', defaultQuantity: 3, keywords: ['strategy', 'strategi', 'campaign', 'kampanye', 'launch', 'launching', 'brand', 'branding', 'awareness'] },
    { id: 'design', label: 'Visual & UI Design', rate: 750000, unit: 'day', defaultQuantity: 5, keywords: ['design', 'visual', 'asset', 'assets', 'branding', 'logo', 'ui', 'ux', 'social media', 'instagram', 'landing page'] },
    { id: 'development', label: 'Frontend Development', rate: 1100000, unit: 'day', defaultQuantity: 5, keywords: ['website', 'web', 'landing page', 'landing', 'frontend', 'development', 'develop', 'app', 'aplikasi', 'dashboard'] },
    { id: 'content', label: 'Content & Copywriting', rate: 600000, unit: 'day', defaultQuantity: 3, keywords: ['content', 'copy', 'caption', 'social media', 'instagram', 'tiktok', 'campaign', 'kampanye', 'copywriting'] },
    { id: 'motion', label: 'Motion Design', rate: 900000, unit: 'day', defaultQuantity: 3, keywords: ['video', 'motion', 'animation', 'animasi', 'reels', 'film'] },
    { id: 'pm', label: 'Project Management', rate: 650000, unit: 'day', defaultQuantity: 2, keywords: ['__always__'] },
  ],
  milestones: [
    { title: 'Discovery & alignment', duration: 'Week 1', output: 'Confirmed brief and working assumptions' },
    { title: 'Concept & production', duration: 'Week 2–4', output: 'Creative direction and production assets' },
    { title: 'Review & handover', duration: 'Final week', output: 'Approved deliverables and handover package' },
  ],
  fallback: { id: 'discovery', label: 'Discovery Workshop', rate: 850000, unit: 'day', defaultQuantity: 2 },
};
