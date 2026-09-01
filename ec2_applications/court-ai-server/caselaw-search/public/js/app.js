import API from './api.js';

// --- State Management ---
const state = {
  activeTab: 'deka-search',
  dekaMode: 'ai', // ai, text, law
  statuteMode: 'laws', // laws, sections, history
  fontScale: 1.0,
  viewerFontScale: 1.0,
  workspace: JSON.parse(localStorage.getItem('slegaltools_workspace') || '[]'), // Array of { deka_no, title }
  currentViewingDoc: null, // { type, id, data }
  chatHistory: [], // Array of { role, content } for Bedrock API
  awsConnected: false,
};

// --- DOM Cache ---
const DOM = {
  body: document.body,
  navItems: document.querySelectorAll('.nav-item'),
  sections: document.querySelectorAll('.content-section'),
  
  // Theme & Global Font
  themeToggle: document.getElementById('theme-toggle'),
  fontDec: document.getElementById('font-dec'),
  fontInc: document.getElementById('font-inc'),
  
  // Deka Search
  dekaTabBtns: document.querySelectorAll('[data-mode]'),
  dekaForms: document.querySelectorAll('.search-form'),
  aiSearchForm: document.getElementById('ai-search-form'),
  textSearchForm: document.getElementById('text-search-form'),
  lawSearchForm: document.getElementById('law-search-form'),
  searchLoading: document.getElementById('search-loading'),
  searchEmpty: document.getElementById('search-empty'),
  searchResultsList: document.getElementById('search-results-list'),
  resultsCountText: document.getElementById('results-count-text'),
  resultsHeader: document.querySelector('.results-header'),
  
  // Statute Search
  statuteTabBtns: document.querySelectorAll('[data-statute-mode]'),
  statuteForms: document.querySelectorAll('.statute-form'),
  statuteLawsForm: document.getElementById('statute-laws-form'),
  statuteSectionsForm: document.getElementById('statute-sections-form'),
  statuteHistoryForm: document.getElementById('statute-history-form'),
  statuteLoading: document.getElementById('statute-loading'),
  statuteEmpty: document.getElementById('statute-empty'),
  statuteResultsList: document.getElementById('statute-results-list'),
  
  // Workspace
  workspaceBadge: document.getElementById('workspace-badge'),
  workspaceTotalCount: document.getElementById('workspace-total-count'),
  workspaceCasesList: document.getElementById('workspace-cases-list'),
  citationPackForm: document.getElementById('citation-pack-form'),
  btnBuildCitation: document.getElementById('btn-build-citation'),
  citationResultCard: document.getElementById('citation-result-card'),
  citationLoading: document.getElementById('citation-loading'),
  citationOutput: document.getElementById('citation-output'),
  btnCopyCitation: document.getElementById('btn-copy-citation'),
  btnDownloadCitation: document.getElementById('btn-download-citation'),
  
  // Settings & Stats
  settingsApiKey: document.getElementById('settings-api-key'),
  btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  btnClearSettings: document.getElementById('btn-clear-settings'),
  apiStatusActive: document.getElementById('api-status-active'),
  apiStatusServer: document.getElementById('api-status-server'),
  statsLoading: document.getElementById('stats-loading'),
  statsGrid: document.getElementById('stats-grid'),
  statDekaCount: document.getElementById('stat-deka-count'),
  statLawsCount: document.getElementById('stat-laws-count'),
  statSectionsCount: document.getElementById('stat-sections-count'),
  statHistoryCount: document.getElementById('stat-history-count'),
  statsDate: document.getElementById('stats-date'),
  
  // Document Viewer Drawer
  viewerBackdrop: document.getElementById('viewer-backdrop'),
  viewerDrawer: document.getElementById('viewer-drawer'),
  viewerBadge: document.getElementById('viewer-badge'),
  viewerTitle: document.getElementById('viewer-title'),
  btnCloseViewer: document.getElementById('btn-close-viewer'),
  btnCopyDrawerText: document.getElementById('btn-copy-drawer-text'),
  btnDownloadDrawerText: document.getElementById('btn-download-drawer-text'),
  btnDrawerAddWorkspace: document.getElementById('btn-drawer-add-workspace'),
  viewerFontDec: document.getElementById('viewer-font-dec'),
  viewerFontInc: document.getElementById('viewer-font-inc'),
  viewerLoading: document.getElementById('viewer-loading'),
  viewerContent: document.getElementById('viewer-content'),

  // AWS Bedrock Chat & Integration
  chatModelSelect: document.getElementById('chat-model-select'),
  chatContextSource: document.getElementById('chat-context-source'),
  chatTemperature: document.getElementById('chat-temperature'),
  chatTempDecimal: document.getElementById('chat-temp-val'),
  chatMessagesBox: document.getElementById('chat-messages-box'),
  chatInputForm: document.getElementById('chat-input-form'),
  chatUserInput: document.getElementById('chat-user-input'),
  chatSendBtn: document.getElementById('btn-send-chat'),
  btnClearChat: document.getElementById('btn-clear-chat'),
  chatStatusText: document.getElementById('chat-status-text'),
  chatActiveContextIndicator: document.getElementById('chat-active-context-indicator'),
  settingsAwsStatus: document.getElementById('settings-aws-status'),
  settingsAwsAccount: document.getElementById('settings-aws-account'),
  settingsAwsArn: document.getElementById('settings-aws-arn'),
  settingsAwsRegion: document.getElementById('settings-aws-region'),
  settingsDefaultBedrockModel: document.getElementById('settings-default-bedrock-model'),
};

// --- Initialization ---
function init() {
  setupEventListeners();
  loadSavedSettings();
  updateWorkspaceUI();
  
  // Trigger system statistics load
  loadSystemStats();
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Navigation Tabs
  DOM.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      switchSection(target);
    });
  });

  // Deka Search Mode Tabs
  DOM.dekaTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      switchDekaMode(mode);
    });
  });

  // Statute Search Mode Tabs
  DOM.statuteTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-statute-mode');
      switchStatuteMode(mode);
    });
  });

  // Theme Toggle
  DOM.themeToggle.addEventListener('change', (e) => {
    const isDark = e.target.checked;
    setTheme(isDark);
  });

  // Font Size Global controls
  DOM.fontDec.addEventListener('click', () => adjustGlobalFont(-0.1));
  DOM.fontInc.addEventListener('click', () => adjustGlobalFont(0.1));

  // Font Size Viewer controls
  DOM.viewerFontDec.addEventListener('click', () => adjustViewerFont(-0.1));
  DOM.viewerFontInc.addEventListener('click', () => adjustViewerFont(0.1));

  // Forms Submissions
  DOM.aiSearchForm.addEventListener('submit', handleAiSearch);
  DOM.textSearchForm.addEventListener('submit', handleTextSearch);
  DOM.lawSearchForm.addEventListener('submit', handleLawSearch);
  DOM.statuteLawsForm.addEventListener('submit', handleStatuteLawsSearch);
  DOM.statuteSectionsForm.addEventListener('submit', handleStatuteSectionsSearch);
  DOM.statuteHistoryForm.addEventListener('submit', handleStatuteHistorySearch);
  DOM.citationPackForm.addEventListener('submit', handleBuildCitationPack);

  // Settings Actions
  DOM.btnToggleKeyVisibility.addEventListener('click', toggleKeyVisibility);
  DOM.btnSaveSettings.addEventListener('click', saveSettings);
  DOM.btnClearSettings.addEventListener('click', clearSettings);

  // Viewer Drawer Actions
  DOM.btnCloseViewer.addEventListener('click', closeViewer);
  DOM.viewerBackdrop.addEventListener('click', closeViewer);

  // Drawer inner actions
  DOM.btnCopyDrawerText.addEventListener('click', copyDrawerContent);
  DOM.btnDownloadDrawerText.addEventListener('click', downloadDrawerContent);
  DOM.btnDrawerAddWorkspace.addEventListener('click', addDrawerDocToWorkspace);

  // Citation actions
  DOM.btnCopyCitation.addEventListener('click', copyCitationOutput);
  DOM.btnDownloadCitation.addEventListener('click', downloadCitationDoc);

  // Chat Actions
  DOM.chatInputForm.addEventListener('submit', handleSendChatMessage);
  DOM.btnClearChat.addEventListener('click', clearChatHistory);
  DOM.chatContextSource.addEventListener('change', updateChatContextHelp);
  DOM.chatTemperature.addEventListener('input', (e) => {
    DOM.chatTempDecimal.textContent = e.target.value;
  });
}

// --- Navigation & Themes ---
function switchSection(sectionId) {
  state.activeTab = sectionId;
  
  DOM.navItems.forEach(item => {
    if (item.getAttribute('data-target') === sectionId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  DOM.sections.forEach(sec => {
    if (sec.id === `${sectionId}-section`) {
      sec.classList.add('active');
    } else {
      sec.classList.remove('active');
    }
  });

  // If section is settings, refresh stats
  if (sectionId === 'settings') {
    loadSystemStats();
  }

  // Check AWS status on settings or chat page visit
  if (sectionId === 'settings' || sectionId === 'ai-chat') {
    checkAwsBedrockStatus();
  }
}

function switchDekaMode(mode) {
  state.dekaMode = mode;
  DOM.dekaTabBtns.forEach(btn => {
    if (btn.getAttribute('data-mode') === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  DOM.dekaForms.forEach(form => {
    if (form.id === `${mode}-search-form`) {
      form.classList.add('active');
    } else {
      form.classList.remove('active');
    }
  });
}

function switchStatuteMode(mode) {
  state.statuteMode = mode;
  DOM.statuteTabBtns.forEach(btn => {
    if (btn.getAttribute('data-statute-mode') === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  DOM.statuteForms.forEach(form => {
    if (form.id === `statute-${mode}-form`) {
      form.classList.add('active');
    } else {
      form.classList.remove('active');
    }
  });
}

function setTheme(isDark) {
  if (isDark) {
    DOM.body.classList.remove('light-theme');
    DOM.body.classList.add('dark-theme');
    localStorage.setItem('slegaltools_theme', 'dark');
  } else {
    DOM.body.classList.remove('dark-theme');
    DOM.body.classList.add('light-theme');
    localStorage.setItem('slegaltools_theme', 'light');
  }
}

function adjustGlobalFont(delta) {
  state.fontScale = Math.min(1.5, Math.max(0.8, state.fontScale + delta));
  DOM.body.style.setProperty('--font-scale', state.fontScale);
  localStorage.setItem('slegaltools_font_scale', state.fontScale);
}

function adjustViewerFont(delta) {
  state.viewerFontScale = Math.min(1.8, Math.max(0.8, state.viewerFontScale + delta));
  DOM.viewerDrawer.style.setProperty('--viewer-font-scale', state.viewerFontScale);
}

// --- Saved settings loader ---
function loadSavedSettings() {
  // API Key
  const savedKey = API.getApiKey();
  if (savedKey) {
    DOM.settingsApiKey.value = savedKey;
    DOM.apiStatusActive.style.display = 'flex';
    DOM.apiStatusServer.style.display = 'none';
  } else {
    DOM.apiStatusActive.style.display = 'none';
    DOM.apiStatusServer.style.display = 'flex';
  }

  // Theme
  const savedTheme = localStorage.getItem('slegaltools_theme');
  if (savedTheme === 'light') {
    DOM.themeToggle.checked = false;
    setTheme(false);
  } else {
    DOM.themeToggle.checked = true;
    setTheme(true);
  }

  // Font scale
  const savedScale = localStorage.getItem('slegaltools_font_scale');
  if (savedScale) {
    state.fontScale = parseFloat(savedScale);
    DOM.body.style.setProperty('--font-scale', state.fontScale);
  }

  // Default Bedrock Model
  const savedModel = localStorage.getItem('slegaltools_default_bedrock_model');
  if (savedModel && DOM.settingsDefaultBedrockModel) {
    DOM.settingsDefaultBedrockModel.value = savedModel;
  }
}

function toggleKeyVisibility() {
  const isPassword = DOM.settingsApiKey.type === 'password';
  DOM.settingsApiKey.type = isPassword ? 'text' : 'password';
  DOM.btnToggleKeyVisibility.textContent = isPassword ? 'ซ่อนคีย์' : 'แสดงคีย์';
}

function saveSettings() {
  const key = DOM.settingsApiKey.value.trim();
  API.setApiKey(key);
  
  if (DOM.settingsDefaultBedrockModel) {
    localStorage.setItem('slegaltools_default_bedrock_model', DOM.settingsDefaultBedrockModel.value);
  }
  
  loadSavedSettings();
  alert('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว');
  loadSystemStats(); // reload stats to verify connection
}

function clearSettings() {
  if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างค่า API Key?')) {
    API.setApiKey('');
    DOM.settingsApiKey.value = '';
    loadSavedSettings();
    loadSystemStats();
  }
}

// --- Loading Statistics ---
async function loadSystemStats() {
  DOM.statsLoading.style.display = 'flex';
  DOM.statsGrid.style.display = 'none';
  DOM.statsDate.style.display = 'none';
  
  try {
    const response = await API.getLawStats();
    if (response && response.ok && response.data) {
      const stats = response.data;
      DOM.statDekaCount.textContent = Number(stats.deka_cases_count || 0).toLocaleString();
      DOM.statLawsCount.textContent = Number(stats.laws_count || 0).toLocaleString();
      DOM.statSectionsCount.textContent = Number(stats.law_sections_count || 0).toLocaleString();
      DOM.statHistoryCount.textContent = Number(stats.law_lifecycle_history_count || 0).toLocaleString();
      
      DOM.statsLoading.style.display = 'none';
      DOM.statsGrid.style.display = 'grid';
      DOM.statsDate.style.display = 'block';
    }
  } catch (error) {
    console.error('Error fetching statistics:', error);
    DOM.statsLoading.innerHTML = `<span style="color: var(--color-red)">ไม่สามารถโหลดข้อมูลสถิติได้ (${error.message})</span>`;
  }
}

// --- API Search Handling (Deka) ---

async function handleAiSearch(e) {
  e.preventDefault();
  const question = document.getElementById('ai-question').value.trim();
  const top_k = parseInt(document.getElementById('ai-top_k').value);
  
  if (!question) return;
  
  showSearchLoading(true);
  try {
    const res = await API.aiDekaSearch(question, top_k);
    renderDekaSearchResults(res, question);
  } catch (err) {
    renderSearchError(err);
  }
}

async function handleTextSearch(e) {
  e.preventDefault();
  const query = document.getElementById('text-query').value.trim();
  const law_code = document.getElementById('text-law_code').value.trim();
  const sections_str = document.getElementById('text-sections').value.trim();
  const year_from = document.getElementById('text-year_from').value;
  const year_to = document.getElementById('text-year_to').value;
  const document_type = document.getElementById('text-doc_type').value;
  const top_k = parseInt(document.getElementById('text-top_k').value);
  
  if (!query) return;
  
  // Format sections: split by comma if exists
  let sections = undefined;
  if (sections_str) {
    sections = sections_str.split(',').map(s => s.trim()).filter(Boolean);
  }

  showSearchLoading(true);
  try {
    const res = await API.searchDekaText(query, {
      top_k,
      law_code,
      sections,
      year_from,
      year_to,
      document_type
    });
    renderDekaSearchResults(res, query);
  } catch (err) {
    renderSearchError(err);
  }
}

async function handleLawSearch(e) {
  e.preventDefault();
  const law_code = document.getElementById('law-code-input').value.trim();
  const sections_str = document.getElementById('law-sections-input').value.trim();
  const provision_type = document.getElementById('law-provision-type').value.trim();
  const top_k = parseInt(document.getElementById('law-top_k').value);
  
  if (!law_code) return;
  
  let sections = undefined;
  if (sections_str) {
    sections = sections_str.split(',').map(s => s.trim()).filter(Boolean);
  }

  showSearchLoading(true);
  try {
    const res = await API.searchByLaw(law_code, sections, provision_type, top_k);
    renderDekaSearchResults(res, `${law_code} ${sections_str}`);
  } catch (err) {
    renderSearchError(err);
  }
}

function showSearchLoading(isLoading) {
  if (isLoading) {
    DOM.searchLoading.style.display = 'flex';
    DOM.searchEmpty.style.display = 'none';
    DOM.searchResultsList.innerHTML = '';
    DOM.resultsHeader.style.display = 'none';
  } else {
    DOM.searchLoading.style.display = 'none';
  }
}

function renderSearchError(err) {
  showSearchLoading(false);
  DOM.searchResultsList.innerHTML = `
    <div class="empty-state" style="border-color: var(--color-red)">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-red)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <h3 style="color: var(--color-red)">เกิดข้อผิดพลาดในการค้นหา</h3>
      <p>${err.message}</p>
    </div>
  `;
}

function renderDekaSearchResults(response, query) {
  showSearchLoading(false);
  
  if (!response || !response.ok || !response.data || !response.data.results) {
    DOM.searchResultsList.innerHTML = `
      <div class="empty-state">
        <h3>ไม่พบผลลัพธ์</h3>
        <p>ไม่พบคดีศาลฎีกาที่ตรงกับเงื่อนไขการค้นหาของคุณในขณะนี้</p>
      </div>
    `;
    DOM.resultsCountText.textContent = 'พบผลลัพธ์ 0 รายการ';
    DOM.resultsHeader.style.display = 'flex';
    return;
  }
  
  const results = response.data.results;
  DOM.resultsCountText.textContent = `พบผลลัพธ์ ${results.length} รายการ`;
  DOM.resultsHeader.style.display = 'flex';
  
  if (results.length === 0) {
    DOM.searchResultsList.innerHTML = `
      <div class="empty-state">
        <h3>ไม่พบผลลัพธ์</h3>
        <p>ไม่พบคดีศาลฎีกาที่ตรงกับเงื่อนไขการค้นหาของคุณในขณะนี้</p>
      </div>
    `;
    return;
  }

  let html = '';
  results.forEach(item => {
    const isAdded = state.workspace.some(w => w.deka_no === item.deka_no);
    const scorePct = item.rank_score ? Math.round(item.rank_score * 100) : null;
    
    // Highlight matching words in short text (simple highlight)
    let bodyText = item.short_text || '';
    if (query && query.length > 2) {
      const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      bodyText = bodyText.replace(regex, '<span class="search-highlight">$1</span>');
    }
    
    html += `
      <div class="case-card">
        <div class="case-card-header">
          <div>
            <h3 class="case-card-title">${item.title || `คำพิพากษาศาลฎีกาที่ ${item.deka_no}`}</h3>
            <div class="case-card-meta">
              ${scorePct ? `<span class="badge badge-score">ความเกี่ยวข้อง ${scorePct}%</span>` : ''}
              <span class="badge badge-year">พ.ศ. ${item.year_be || item.deka_no.split('/').pop()}</span>
              <span class="badge badge-type">${item.document_type || 'คำพิพากษา'}</span>
            </div>
          </div>
          <div class="case-card-badge-no" style="font-family: var(--font-en); font-weight: 700; color: var(--color-orange-light);">
            ${item.deka_no}
          </div>
        </div>
        
        <div class="case-card-body">${bodyText}</div>
        
        ${item.matched_terms && item.matched_terms.length > 0 ? `
          <div class="case-card-matched">
            ${item.matched_terms.map(t => `<span class="matched-tag">${t}</span>`).join('')}
          </div>
        ` : ''}
        
        <div class="case-card-actions">
          <button class="btn btn-secondary btn-sm btn-view-full" data-deka="${item.deka_no}">
            อ่านฉบับเต็ม
          </button>
          <button class="btn ${isAdded ? 'btn-secondary' : 'btn-purple'} btn-sm btn-toggle-workspace" 
                  data-deka="${item.deka_no}" 
                  data-title="${item.title || `คำพิพากษาศาลฎีกาที่ ${item.deka_no}`}"
                  ${isAdded ? 'disabled' : ''}>
            ${isAdded ? 'เพิ่มแล้ว' : 'เพิ่มใน Workspace'}
          </button>
        </div>
      </div>
    `;
  });
  
  DOM.searchResultsList.innerHTML = html;
  
  // Attach event listeners to card buttons
  DOM.searchResultsList.querySelectorAll('.btn-view-full').forEach(btn => {
    btn.addEventListener('click', () => {
      const dekaNo = btn.getAttribute('data-deka');
      openDekaViewer(dekaNo);
    });
  });

  DOM.searchResultsList.querySelectorAll('.btn-toggle-workspace').forEach(btn => {
    btn.addEventListener('click', () => {
      const dekaNo = btn.getAttribute('data-deka');
      const title = btn.getAttribute('data-title');
      addToWorkspace(dekaNo, title);
      btn.textContent = 'เพิ่มแล้ว';
      btn.disabled = true;
      btn.className = 'btn btn-secondary btn-sm btn-toggle-workspace';
    });
  });
}

// --- API Search Handling (Statute/Laws) ---

async function handleStatuteLawsSearch(e) {
  e.preventDefault();
  const query = document.getElementById('statute-laws-query').value.trim();
  const law_scope = document.getElementById('statute-laws-scope').value;
  const lifecycle_status = document.getElementById('statute-laws-lifecycle').value;
  const top_k = parseInt(document.getElementById('statute-laws-top_k').value);

  showStatuteLoading(true);
  try {
    const res = await API.searchLaws(query, {
      law_scope: law_scope === 'all' ? undefined : law_scope,
      lifecycle_status,
      top_k
    });
    renderStatuteLawsResults(res);
  } catch (err) {
    renderStatuteError(err);
  }
}

async function handleStatuteSectionsSearch(e) {
  e.preventDefault();
  const query = document.getElementById('statute-sections-query').value.trim();
  const law_code = document.getElementById('statute-sections-law_code').value.trim();
  const section_no = document.getElementById('statute-sections-section_no').value.trim();
  const law_scope = document.getElementById('statute-sections-scope').value;
  const top_k = parseInt(document.getElementById('statute-sections-top_k').value);

  showStatuteLoading(true);
  try {
    const res = await API.searchLawSections(query, {
      law_code: law_code || undefined,
      section_no: section_no || undefined,
      law_scope: law_scope === 'all' ? undefined : law_scope,
      top_k
    });
    renderStatuteSectionsResults(res);
  } catch (err) {
    renderStatuteError(err);
  }
}

async function handleStatuteHistorySearch(e) {
  e.preventDefault();
  const query = document.getElementById('statute-history-query').value.trim();
  const law_code = document.getElementById('statute-history-law_code').value.trim();
  const lifecycle_status = document.getElementById('statute-history-lifecycle').value;
  const top_k = parseInt(document.getElementById('statute-history-top_k').value);

  showStatuteLoading(true);
  try {
    const res = await API.searchLawHistory(query, {
      law_code: law_code || undefined,
      lifecycle_status,
      top_k
    });
    renderStatuteHistoryResults(res);
  } catch (err) {
    renderStatuteError(err);
  }
}

function showStatuteLoading(isLoading) {
  if (isLoading) {
    DOM.statuteLoading.style.display = 'flex';
    DOM.statuteEmpty.style.display = 'none';
    DOM.statuteResultsList.innerHTML = '';
  } else {
    DOM.statuteLoading.style.display = 'none';
  }
}

function renderStatuteError(err) {
  showStatuteLoading(false);
  DOM.statuteResultsList.innerHTML = `
    <div class="empty-state" style="border-color: var(--color-red)">
      <h3 style="color: var(--color-red)">เกิดข้อผิดพลาดในการดึงข้อมูลตัวบท</h3>
      <p>${err.message}</p>
    </div>
  `;
}

function renderStatuteLawsResults(response) {
  showStatuteLoading(false);
  if (!response || !response.ok || !response.data || !response.data.results) {
    DOM.statuteResultsList.innerHTML = `
      <div class="empty-state">
        <h3>ไม่พบผลลัพธ์</h3>
        <p>ไม่พบรายการประมวลหรือพระราชบัญญัติกฎหมายตามเงื่อนไขที่กำหนด</p>
      </div>
    `;
    return;
  }

  const results = response.data.results;
  if (results.length === 0) {
    DOM.statuteResultsList.innerHTML = `
      <div class="empty-state">
        <h3>ไม่พบผลลัพธ์</h3>
        <p>ไม่พบรายการประมวลหรือพระราชบัญญัติกฎหมายตามเงื่อนไขที่กำหนด</p>
      </div>
    `;
    return;
  }

  let html = '';
  results.forEach(law => {
    const statusClass = law.lifecycle_status === 'current_or_future' || law.lifecycle_status === 'active_listing' ? 'badge-active-status' : 'badge-cancelled-status';
    const statusText = law.lifecycle_status === 'current_or_future' ? 'มีผลบังคับใช้' : (law.lifecycle_status === 'cancelled' ? 'ยกเลิกการใช้' : law.lifecycle_status);
    
    html += `
      <div class="case-card">
        <div class="case-card-header">
          <div>
            <h3 class="case-card-title">${law.title}</h3>
            <div class="case-card-meta">
              <span class="badge ${statusClass}">${statusText}</span>
              ${law.law_code ? `<span class="badge badge-year">${law.law_code}</span>` : ''}
              ${law.law_type_name ? `<span class="badge badge-type">${law.law_type_name}</span>` : ''}
            </div>
          </div>
        </div>
        
        <div class="case-card-body">
          ${law.topic_name ? `<strong>หมวดหมู่:</strong> ${law.topic_name}<br>` : ''}
          ${law.note || 'ไม่มีข้อมูลบันทึกเพิ่มเติม'}
        </div>
        
        <div class="case-card-actions">
          <button class="btn btn-primary btn-sm btn-browse-sections" data-doc-key="${law.doc_key}" data-title="${law.title}">
            ดูรายมาตราของกฎหมายนี้
          </button>
        </div>
      </div>
    `;
  });

  DOM.statuteResultsList.innerHTML = html;

  // Event handler to load sections of a specific law
  DOM.statuteResultsList.querySelectorAll('.btn-browse-sections').forEach(btn => {
    btn.addEventListener('click', () => {
      const docKey = btn.getAttribute('data-doc-key');
      const title = btn.getAttribute('data-title');
      // Set to section search with specific doc_key
      switchStatuteMode('sections');
      document.getElementById('statute-sections-law_code').value = '';
      document.getElementById('statute-sections-section_no').value = '';
      
      // Perform FTS search on that doc_key using empty/dot search or keyword
      // (Let's query for "มาตรา" to load all)
      showStatuteLoading(true);
      API.request('/api/tool/search_law_sections_v2', {
        query: 'มาตรา',
        doc_key: docKey,
        top_k: 20
      }).then(res => {
        renderStatuteSectionsResults(res);
      }).catch(err => {
        renderStatuteError(err);
      });
    });
  });
}

function renderStatuteSectionsResults(response) {
  showStatuteLoading(false);
  if (!response || !response.ok || !response.data || !response.data.results) {
    DOM.statuteResultsList.innerHTML = `
      <div class="empty-state">
        <h3>ไม่พบผลลัพธ์มาตรา</h3>
        <p>ไม่พบตัวบทกฎหมายรายมาตราที่เกี่ยวข้องกับข้อความค้นหานี้</p>
      </div>
    `;
    return;
  }

  const results = response.data.results;
  if (results.length === 0) {
    DOM.statuteResultsList.innerHTML = `
      <div class="empty-state">
        <h3>ไม่พบมาตรา</h3>
        <p>ไม่พบตัวบทกฎหมายรายมาตราที่เกี่ยวข้องกับข้อความค้นหานี้</p>
      </div>
    `;
    return;
  }

  let html = '';
  results.forEach(sec => {
    html += `
      <div class="case-card">
        <div class="case-card-header">
          <div>
            <h3 class="case-card-title">${sec.title || 'ตัวบทกฎหมาย'}</h3>
            <div class="case-card-meta">
              <span class="badge badge-score" style="background-color: var(--color-purple-bg); color: var(--color-purple-light);">
                ${sec.section_label || `มาตรา ${sec.anchor_number_arabic || ''}`}
              </span>
              ${sec.law_code ? `<span class="badge badge-year">${sec.law_code}</span>` : ''}
            </div>
          </div>
        </div>
        
        <div class="case-card-body" style="white-space: pre-line;">
          ${sec.text_snippet || ''}
        </div>
        
        <div class="case-card-actions">
          <button class="btn btn-secondary btn-sm btn-view-section" data-key="${sec.section_key}">
            อ่านฉบับเต็มและประวัติการแก้
          </button>
        </div>
      </div>
    `;
  });

  DOM.statuteResultsList.innerHTML = html;

  DOM.statuteResultsList.querySelectorAll('.btn-view-section').forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionKey = btn.getAttribute('data-key');
      openSectionViewer(sectionKey);
    });
  });
}

function renderStatuteHistoryResults(response) {
  showStatuteLoading(false);
  if (!response || !response.ok || !response.data || !response.data.results) {
    DOM.statuteResultsList.innerHTML = `
      <div class="empty-state">
        <h3>ไม่พบผลลัพธ์</h3>
        <p>ไม่พบข้อมูลประวัติการแก้ไขกฎหมายตามเงื่อนไขที่กำหนด</p>
      </div>
    `;
    return;
  }

  const results = response.data.results;
  if (results.length === 0) {
    DOM.statuteResultsList.innerHTML = `
      <div class="empty-state">
        <h3>ไม่พบประวัติการแก้ไข</h3>
        <p>ไม่พบประวัติการแก้ไขกฎหมายตามเงื่อนไขที่กำหนด</p>
      </div>
    `;
    return;
  }

  let html = '';
  results.forEach(item => {
    html += `
      <div class="case-card">
        <div class="case-card-header">
          <div>
            <h3 class="case-card-title">${item.title}</h3>
            <div class="case-card-meta">
              <span class="badge badge-year">${item.law_code || 'ประวัติ'}</span>
              <span class="badge badge-type" style="background-color: var(--color-purple-bg); color: var(--color-purple-light);">
                สถานะ: ${item.lifecycle_status}
              </span>
            </div>
          </div>
        </div>
        <div class="case-card-body">
          <strong>รายละเอียดประวัติการยกเลิก/แก้ไข:</strong><br>
          ${item.change_reason || 'ไม่มีคำชี้แจงสาเหตุการเปลี่ยนแปลงบันทึกไว้'}<br>
          ${item.note ? `<small style="color: var(--text-muted)">หมายเหตุ: ${item.note}</small>` : ''}
        </div>
      </div>
    `;
  });

  DOM.statuteResultsList.innerHTML = html;
}

// --- Document Viewer Drawer (Deka & Law Sections) ---

async function openDekaViewer(dekaNo) {
  state.currentViewingDoc = { type: 'deka', id: dekaNo, data: null };
  
  DOM.viewerBadge.textContent = 'คำพิพากษาศาลฎีกา';
  DOM.viewerBadge.className = 'drawer-doc-type-badge';
  DOM.viewerTitle.textContent = `ฎีกาที่ ${dekaNo}`;
  
  // Show drawer with loader
  DOM.viewerBackdrop.classList.add('active');
  DOM.viewerDrawer.classList.add('active');
  DOM.body.style.overflow = 'hidden'; // lock scroll
  
  DOM.viewerLoading.style.display = 'flex';
  DOM.viewerContent.innerHTML = '';
  DOM.btnDrawerAddWorkspace.style.display = 'inline-flex';
  
  // Check if already in workspace to disable/enable button
  const isAdded = state.workspace.some(w => w.deka_no === dekaNo);
  DOM.btnDrawerAddWorkspace.disabled = isAdded;
  DOM.btnDrawerAddWorkspace.innerHTML = isAdded ? 'เพิ่มแล้ว' : `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather" style="width: 14px; height: 14px; margin-right: 6px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
    เพิ่มใน Workspace
  `;
  
  try {
    const response = await API.getDekaCase(dekaNo, { include_long_text: true });
    DOM.viewerLoading.style.display = 'none';
    
    if (response && response.ok && response.data) {
      const c = response.data;
      state.currentViewingDoc.data = c;
      
      let html = '';
      
      if (c.title) {
        html += `<h2>${c.title}</h2><br>`;
      }
      
      html += `<strong>เลขฎีกา:</strong> ${c.deka_no}<br>`;
      if (c.year_be) html += `<strong>ปี พ.ศ.:</strong> ${c.year_be}<br>`;
      if (c.document_type) html += `<strong>ประเภทเอกสาร:</strong> ${c.document_type}<br>`;
      html += `<hr style="border: 0; border-top: 1px solid var(--border-color); margin: 20px 0;">`;
      
      html += `<h3>ย่อคำพิพากษา</h3>`;
      html += `<p style="font-size: 1.05em; background-color: var(--bg-badge); padding: 16px; border-radius: var(--border-radius-md); border-left: 4px solid var(--color-orange); margin-bottom: 24px;">${c.short_text || 'ไม่มีคำอธิบายย่อ'}</p>`;
      
      if (c.long_text) {
        html += `<h3>คำพิพากษาฉบับเต็ม</h3>`;
        html += `<p style="white-space: pre-wrap; font-size: 0.95em; color: var(--text-primary); margin-bottom: 24px;">${c.long_text}</p>`;
      } else {
        html += `<p style="color: var(--text-muted); font-style: italic;">ไม่มีเนื้อหาฉบับเต็มเปิดให้ดึงในขณะนี้</p>`;
      }
      
      // Law refs
      if (c.law_refs && c.law_refs.length > 0) {
        html += `<div class="law-ref-section">`;
        html += `<h4 class="law-ref-title">กฎหมาย/มาตราที่เกี่ยวข้อง</h4>`;
        html += `<div class="law-ref-list">`;
        c.law_refs.forEach(ref => {
          html += `
            <div class="law-ref-item btn-navigate-law-ref" data-law="${ref.law_code || ''}" data-section="${ref.section_no || ''}">
              <strong>${ref.law_code || 'ประมวลกฎหมาย'}</strong> มาตรา ${ref.section_no || '-'} ${ref.provision_type ? `(${ref.provision_type})` : ''}
            </div>
          `;
        });
        html += `</div></div>`;
      }
      
      DOM.viewerContent.innerHTML = html;
      DOM.viewerContent.querySelectorAll('.btn-navigate-law-ref').forEach(item => {
        item.addEventListener('click', () => {
          const law = item.getAttribute('data-law');
          const sec = item.getAttribute('data-section');
          if (law) {
            closeViewer();
            switchSection('statute-search');
            switchStatuteMode('sections');
            document.getElementById('statute-sections-law_code').value = law;
            document.getElementById('statute-sections-section_no').value = sec;
            
            showStatuteLoading(true);
            API.request('/api/tool/search_law_sections_v2', {
              query: 'มาตรา ' + sec,
              law_code: law,
              section_no: sec,
              top_k: 5
            }).then(res => {
              renderStatuteSectionsResults(res);
            }).catch(err => {
              renderStatuteError(err);
            });
          }
        });
      });
      
    } else {
      DOM.viewerContent.innerHTML = `<p style="color: var(--color-red)">ไม่พบเนื้อหาคดีฎีกาดังกล่าว</p>`;
    }
  } catch (error) {
    DOM.viewerLoading.style.display = 'none';
    DOM.viewerContent.innerHTML = `<p style="color: var(--color-red)">เกิดข้อผิดพลาดในการโหลดคดี: ${error.message}</p>`;
  }
}

async function openSectionViewer(sectionKey) {
  state.currentViewingDoc = { type: 'statute', id: sectionKey, data: null };
  
  DOM.viewerBadge.textContent = 'ตัวบทกฎหมายกฤษฎีกา';
  DOM.viewerBadge.className = 'drawer-doc-type-badge';
  DOM.viewerBadge.style.backgroundColor = 'var(--color-purple-bg)';
  DOM.viewerBadge.style.color = 'var(--color-purple-light)';
  DOM.viewerTitle.textContent = `กำลังโหลดรายละเอียด...`;
  
  DOM.viewerBackdrop.classList.add('active');
  DOM.viewerDrawer.classList.add('active');
  DOM.body.style.overflow = 'hidden';
  
  DOM.viewerLoading.style.display = 'flex';
  DOM.viewerContent.innerHTML = '';
  DOM.btnDrawerAddWorkspace.style.display = 'none'; // Cannot add raw statutes to deka workspace
  
  try {
    const response = await API.getLawSection({ section_key: sectionKey });
    DOM.viewerLoading.style.display = 'none';
    
    if (response && response.ok && response.data && response.data.section) {
      const s = response.data.section;
      state.currentViewingDoc.data = s;
      
      DOM.viewerTitle.textContent = `${s.title || 'ตัวบทกฎหมาย'}`;
      
      let html = '';
      html += `<h2>${s.title || 'ตัวบทกฎหมาย'}</h2><br>`;
      html += `<span class="badge" style="background-color: var(--color-purple-bg); color: var(--color-purple-light); font-size: 14px; padding: 4px 12px; border-radius: var(--border-radius-md); margin-bottom: 20px;">${s.section_label || `มาตรา ${s.anchor_number_arabic || ''}`}</span><br><br>`;
      
      html += `<div style="background-color: var(--bg-badge); padding: 24px; border-radius: var(--border-radius-lg); font-size: 1.1em; line-height: 1.8; margin-bottom: 24px; white-space: pre-line;">${s.section_text || 'ไม่มีข้อมูลตัวบท'}</div>`;
      
      if (s.change_history && s.change_history.length > 0) {
        html += `<h3>ประวัติการยกเลิก/แก้ไขมาตรานี้</h3>`;
        html += `<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px;">`;
        s.change_history.forEach(hist => {
          html += `
            <div style="border: 1px solid var(--border-color); padding: 14px; border-radius: var(--border-radius-md); font-size: 13px;">
              <strong>พ.ศ./ปีการแก้ไข:</strong> ${hist.amended_year_be || 'ไม่ระบุ'}<br>
              <strong>กฎหมายที่แก้ไข:</strong> ${hist.amendment_law_title || '-'}<br>
              <strong>ประเภทการแก้:</strong> ${hist.lifecycle_status || '-'}<br>
              <strong>บันทึกเพิ่มเติม:</strong> ${hist.change_reason || '-'}
            </div>
          `;
        });
        html += `</div>`;
      }
      
      DOM.viewerContent.innerHTML = html;
    } else {
      DOM.viewerContent.innerHTML = `<p style="color: var(--color-red)">ไม่พบรายละเอียดมาตรานี้</p>`;
    }
  } catch (error) {
    DOM.viewerLoading.style.display = 'none';
    DOM.viewerContent.innerHTML = `<p style="color: var(--color-red)">เกิดข้อผิดพลาดในการโหลดตัวบท: ${error.message}</p>`;
  }
}

function closeViewer() {
  DOM.viewerBackdrop.classList.remove('active');
  DOM.viewerDrawer.classList.remove('active');
  DOM.body.style.overflow = ''; // unlock scroll
  state.currentViewingDoc = null;
}

function copyDrawerContent() {
  if (!state.currentViewingDoc || !state.currentViewingDoc.data) return;
  
  let textToCopy = '';
  const data = state.currentViewingDoc.data;
  
  if (state.currentViewingDoc.type === 'deka') {
    textToCopy = `[${data.deka_no}] ${data.title}\n\nย่อฎีกา:\n${data.short_text || ''}\n\nคำพิพากษาฉบับเต็ม:\n${data.long_text || ''}`;
  } else if (state.currentViewingDoc.type === 'statute') {
    textToCopy = `[${data.section_label || `มาตรา ${data.anchor_number_arabic || ''}`}] ${data.title || ''}\n\nเนื้อหาตัวบท:\n${data.section_text || ''}`;
  }
  
  navigator.clipboard.writeText(textToCopy).then(() => {
    alert('คัดลอกเนื้อหาลงในคลิปบอร์ดแล้ว');
  }).catch(err => {
    console.error('Failed to copy text:', err);
  });
}

function downloadDrawerContent() {
  if (!state.currentViewingDoc || !state.currentViewingDoc.data) return;
  
  const data = state.currentViewingDoc.data;
  let filename = '';
  let htmlContent = '';
  
  if (state.currentViewingDoc.type === 'deka') {
    filename = `Deka_${data.deka_no.replace('/', '_')}.doc`;
    htmlContent = `
      <h1>${data.title || `คำพิพากษาศาลฎีกาที่ ${data.deka_no}`}</h1>
      <p><strong>ประเภทเอกสาร:</strong> ${data.document_type || 'คำพิพากษา'}</p>
      <p><strong>ปี พ.ศ.:</strong> ${data.year_be || '-'}</p>
      <hr>
      <h2>ย่อคำพิพากษา</h2>
      <p style="background-color: #f4f6f5; padding: 12px; border-left: 4px solid #ea580c;">
        ${data.short_text || 'ไม่มีคำอธิบายย่อ'}
      </p>
      <h2>คำพิพากษาฉบับเต็ม</h2>
      <div style="white-space: pre-line;">
        ${data.long_text || 'ไม่มีเนื้อหาฉบับเต็ม'}
      </div>
    `;
  } else if (state.currentViewingDoc.type === 'statute') {
    const sectionNoClean = data.section_label ? data.section_label.replace(/\s+/g, '_') : 'Section';
    filename = `Statute_${sectionNoClean}.doc`;
    htmlContent = `
      <h1>${data.title || 'ตัวบทกฎหมาย'}</h1>
      <h2>${data.section_label || 'ตัวบท'}</h2>
      <hr>
      <div style="background-color: #f4f6f5; padding: 16px; font-size: 1.1em; line-height: 1.7; white-space: pre-line;">
        ${data.section_text || 'ไม่มีข้อมูลตัวบท'}
      </div>
    `;
  }
  
  const fullHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>Document Download</title>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Sarabun', 'Tahoma', 'Arial', sans-serif; line-height: 1.6; color: #333333; }
        h1 { color: #ea580c; font-size: 18pt; border-bottom: 1px solid #ea580c; padding-bottom: 4px; }
        h2 { color: #1e2924; font-size: 14pt; margin-top: 14pt; }
        strong { font-weight: bold; }
        hr { border: 0; border-top: 1px solid #dddddd; margin: 15pt 0; }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Workspace & Citations Pack ---

function addToWorkspace(dekaNo, title) {
  if (state.workspace.some(w => w.deka_no === dekaNo)) return;
  
  state.workspace.push({ deka_no: dekaNo, title: title });
  localStorage.setItem('slegaltools_workspace', JSON.stringify(state.workspace));
  
  updateWorkspaceUI();
}

function removeFromWorkspace(dekaNo) {
  state.workspace = state.workspace.filter(w => w.deka_no !== dekaNo);
  localStorage.setItem('slegaltools_workspace', JSON.stringify(state.workspace));
  
  updateWorkspaceUI();
  
  // Also refresh deka search results view if we have one to re-enable button
  const searchResultsBtn = DOM.searchResultsList.querySelector(`.btn-toggle-workspace[data-deka="${dekaNo}"]`);
  if (searchResultsBtn) {
    searchResultsBtn.disabled = false;
    searchResultsBtn.textContent = 'เพิ่มใน Workspace';
    searchResultsBtn.className = 'btn btn-purple btn-sm btn-toggle-workspace';
  }
  
  // Disable button in viewer drawer if matches
  if (state.currentViewingDoc && state.currentViewingDoc.type === 'deka' && state.currentViewingDoc.id === dekaNo) {
    DOM.btnDrawerAddWorkspace.disabled = false;
    DOM.btnDrawerAddWorkspace.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather" style="width: 14px; height: 14px; margin-right: 6px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      เพิ่มใน Workspace
    `;
  }
}

function addDrawerDocToWorkspace() {
  if (state.currentViewingDoc && state.currentViewingDoc.type === 'deka') {
    const dekaNo = state.currentViewingDoc.id;
    const title = state.currentViewingDoc.data ? state.currentViewingDoc.data.title : `คำพิพากษาศาลฎีกาที่ ${dekaNo}`;
    addToWorkspace(dekaNo, title);
    
    DOM.btnDrawerAddWorkspace.disabled = true;
    DOM.btnDrawerAddWorkspace.textContent = 'เพิ่มแล้ว';
  }
}

function updateWorkspaceUI() {
  const count = state.workspace.length;
  DOM.workspaceTotalCount.textContent = count;
  
  if (count > 0) {
    DOM.workspaceBadge.textContent = count;
    DOM.workspaceBadge.style.display = 'inline-block';
    DOM.btnBuildCitation.disabled = false;
    DOM.btnBuildCitation.textContent = `สร้างชุดเอกสารอ้างอิงคดี (${count} คดี)`;
    
    // Render Workspace List
    let html = '';
    state.workspace.forEach(w => {
      html += `
        <div class="workspace-item">
          <div>
            <div class="workspace-item-title">${w.title}</div>
            <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-en); font-weight: 700;">${w.deka_no}</div>
          </div>
          <button class="workspace-item-remove" data-deka="${w.deka_no}" title="นำออก">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      `;
    });
    DOM.workspaceCasesList.innerHTML = html;
    
    // Attach remove handlers
    DOM.workspaceCasesList.querySelectorAll('.workspace-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const deka = btn.getAttribute('data-deka');
        removeFromWorkspace(deka);
      });
    });
    
  } else {
    DOM.workspaceBadge.style.display = 'none';
    DOM.btnBuildCitation.disabled = true;
    DOM.btnBuildCitation.textContent = 'สร้างชุดเอกสารอ้างอิงคดี';
    DOM.workspaceCasesList.innerHTML = `
      <div class="empty-state mini">
        <p>ยังไม่มีคดีในรายการอ้างอิงของคุณ</p>
        <p class="small">ย้อนกลับไปค้นหาคำพิพากษาศาลฎีกาแล้วกดปุ่ม "เพิ่มลง Workspace" เพื่อเริ่มรวบรวมคดี</p>
      </div>
    `;
  }
}

async function handleBuildCitationPack(e) {
  e.preventDefault();
  if (state.workspace.length === 0) return;

  const issue = document.getElementById('cite-issue').value.trim();
  const facts = document.getElementById('cite-facts').value.trim();
  const includeLongText = document.getElementById('cite-include-long').checked;
  const maxChars = parseInt(document.getElementById('cite-char-limit').value);
  const dekaNos = state.workspace.map(w => w.deka_no);

  const engineRadio = document.querySelector('input[name="cite-engine"]:checked');
  const engine = engineRadio ? engineRadio.value : 'slegaltools';

  DOM.citationResultCard.style.display = 'block';
  DOM.citationLoading.style.display = 'flex';
  DOM.citationOutput.innerHTML = '';
  
  // Scroll down to the citation result card
  DOM.citationResultCard.scrollIntoView({ behavior: 'smooth' });

  if (engine === 'bedrock') {
    try {
      DOM.citationLoading.innerHTML = `<div class="spinner"></div><p>กำลังดึงเนื้อหาคดีเต็มเพื่อนำส่ง AWS Bedrock...</p>`;
      
      const fetchPromises = dekaNos.map(dekaNo => 
        API.getDekaCase(dekaNo, { include_long_text: includeLongText, max_long_text_chars: maxChars })
          .then(res => (res && res.ok && res.data) ? res.data : null)
          .catch(() => null)
      );
      
      const fetchedCases = (await Promise.all(fetchPromises)).filter(Boolean);
      
      if (fetchedCases.length === 0) {
        throw new Error('ไม่สามารถดึงข้อมูลรายละเอียดคดีจากระบบเพื่อสรุปได้');
      }

      DOM.citationLoading.innerHTML = `<div class="spinner"></div><p>ส่งคดีอ้างอิงและประเด็นข้อพิพาทไปให้ AWS Bedrock สรุป...</p>`;
      
      const modelId = DOM.settingsDefaultBedrockModel ? DOM.settingsDefaultBedrockModel.value : 'us.anthropic.claude-sonnet-4-20250514-v1:0';
      const bedrockRes = await API.buildBedrockCitation(fetchedCases, issue, facts, modelId);
      
      DOM.citationLoading.style.display = 'none';
      DOM.citationLoading.innerHTML = `<div class="spinner"></div><p>กำลังวิเคราะห์ประเด็นกฎหมายและจัดเตรียมเอกสารอ้างอิง...</p>`;

      if (bedrockRes && bedrockRes.ok && bedrockRes.text) {
        DOM.citationOutput.innerHTML = renderMarkdown(bedrockRes.text);
      } else {
        DOM.citationOutput.innerHTML = `<p style="color: var(--color-red)">ไม่สามารถสร้าง Citation Pack จาก AWS Bedrock ได้สำเร็จ</p>`;
      }
    } catch (error) {
      DOM.citationLoading.style.display = 'none';
      DOM.citationLoading.innerHTML = `<div class="spinner"></div><p>กำลังวิเคราะห์ประเด็นกฎหมายและจัดเตรียมเอกสารอ้างอิง...</p>`;
      DOM.citationOutput.innerHTML = `<p style="color: var(--color-red)">เกิดข้อผิดพลาดในการเชื่อมต่อ AWS Bedrock: ${error.message}</p>`;
    }
    return;
  }

  // Default SLegalTools engine
  try {
    const response = await API.makeCitationPack({
      deka_nos: dekaNos,
      issue: issue || undefined,
      facts: facts || undefined,
      include_long_text: includeLongText,
      max_long_text_chars_per_case: maxChars
    });

    DOM.citationLoading.style.display = 'none';
    if (response && response.ok && response.data) {
      let resultText = '';
      if (response.data.citation_pack && Array.isArray(response.data.citation_pack)) {
        resultText += `# ชุดเอกสารอ้างอิงคดีความ\n\n`;
        response.data.citation_pack.forEach(item => {
          if (item.found && item.case) {
            resultText += `## ${item.case.title} (เลขฎีกา: ${item.case.deka_no})\n`;
            if (item.case.short_text) {
              resultText += `**ข้อเท็จจริงและคำวินิจฉัย:**\n${item.case.short_text}\n\n`;
            }
            if (item.case.law_refs && item.case.law_refs.length > 0) {
              resultText += `**กฎหมายที่เกี่ยวข้อง:**\n`;
              item.case.law_refs.forEach(law => {
                const lawName = law.law_full_name || law.law_code;
                const lawSection = law.section_text || law.section_no ? ` - ${law.section_text || law.section_no}` : '';
                resultText += `- ${lawName}${lawSection}\n`;
              });
              resultText += `\n`;
            }
            if (item.case.long_text) {
              resultText += `**เนื้อหาฉบับเต็ม (บางส่วน):**\n${item.case.long_text}\n\n`;
            }
          }
        });
      } else if (response.data.citation_pack && typeof response.data.citation_pack === 'string') {
        resultText = response.data.citation_pack;
      } else {
        resultText = response.data.text || JSON.stringify(response.data, null, 2);
      }
      DOM.citationOutput.innerHTML = renderMarkdown(resultText);
    } else {
      DOM.citationOutput.innerHTML = `<p style="color: var(--color-red)">ไม่สามารถสร้าง Citation Pack ได้สำเร็จ</p>`;
    }
  } catch (error) {
    DOM.citationLoading.style.display = 'none';
    DOM.citationOutput.innerHTML = `<p style="color: var(--color-red)">เกิดข้อผิดพลาดในการสร้างเอกสาร: ${error.message}</p>`;
  }
}

function copyCitationOutput() {
  const text = DOM.citationOutput.innerText;
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    alert('คัดลอกชุดข้อมูลอ้างอิงลงคลิปบอร์ดแล้ว คุณสามารถนำไปใช้วางในโปรแกรมประมวลผลคำได้ทันที');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

function downloadCitationDoc() {
  const contentHtml = DOM.citationOutput.innerHTML;
  if (!contentHtml) return;

  // Wrap HTML in Word doc template format for proper styling and encoding
  const fullHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>SLegalTools Citation Pack</title>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Sarabun', 'Tahoma', 'Arial', sans-serif; line-height: 1.6; color: #333333; }
        h1 { color: #8b5cf6; font-size: 20pt; border-bottom: 2px solid #8b5cf6; padding-bottom: 6px; }
        h2 { color: #7c3aed; font-size: 16pt; margin-top: 18pt; }
        h3 { color: #6d28d9; font-size: 14pt; margin-top: 14pt; }
        strong { color: #111111; font-weight: bold; }
        pre, code { font-family: 'Courier New', monospace; background-color: #f4f6f5; border: 1px solid #dbe2de; padding: 6px; }
        li { margin-bottom: 4pt; }
        br { mso-data-placement: same-cell; }
      </style>
    </head>
    <body>
      ${contentHtml}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SLegalTools_Citation_Pack_${new Date().toISOString().slice(0,10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Very simple Markdown-to-HTML parser ---
function renderMarkdown(md) {
  if (!md) return '';
  
  // Escape HTML tags to prevent XSS
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers (H3, H2, H1)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullets (* item or - item)
  html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // Line breaks
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

// --- AWS Bedrock Status Check ---
async function checkAwsBedrockStatus() {
  if (!DOM.settingsAwsStatus) return;
  
  DOM.settingsAwsStatus.textContent = 'กำลังตรวจสอบ...';
  DOM.settingsAwsStatus.className = 'status-value badge badge-year';
  DOM.settingsAwsStatus.style.backgroundColor = '';
  DOM.settingsAwsStatus.style.color = '';

  try {
    const res = await API.getBedrockStatus();
    if (res && res.ok) {
      state.awsConnected = true;
      
      // Update settings widgets
      DOM.settingsAwsStatus.textContent = 'เชื่อมต่อสำเร็จ';
      DOM.settingsAwsStatus.className = 'status-value badge badge-type'; // green badge
      DOM.settingsAwsAccount.textContent = res.account || '-';
      DOM.settingsAwsArn.textContent = res.arn || '-';
      DOM.settingsAwsRegion.textContent = res.region || '-';

      // Update Chat UI header
      if (DOM.chatStatusText) {
        DOM.chatStatusText.textContent = 'เชื่อมต่อกับ AWS Bedrock แล้ว (พร้อมใช้งาน)';
        DOM.chatUserInput.disabled = false;
        DOM.chatSendBtn.disabled = false;
      }
    }
  } catch (err) {
    state.awsConnected = false;
    console.error('AWS Bedrock connection failed:', err);
    
    // Update settings widgets
    DOM.settingsAwsStatus.textContent = 'เชื่อมต่อล้มเหลว';
    DOM.settingsAwsStatus.className = 'status-value badge badge-cancelled-status'; // red badge
    DOM.settingsAwsAccount.textContent = '-';
    DOM.settingsAwsArn.textContent = err.message;
    DOM.settingsAwsRegion.textContent = '-';

    // Update Chat UI header
    if (DOM.chatStatusText) {
      DOM.chatStatusText.textContent = `การเชื่อมต่อผิดพลาด: ${err.message}`;
      DOM.chatUserInput.disabled = true;
      DOM.chatSendBtn.disabled = true;
    }
  }
}

// Update helper text when context source changes in chat panel
function updateChatContextHelp() {
  const source = DOM.chatContextSource.value;
  const helpEl = document.getElementById('chat-context-help');
  let helpText = '';
  
  if (source === 'none') {
    helpText = 'AI จะพูดคุยโดยใช้ความรู้ทั่วไปเกี่ยวกับกฎหมายไทย โดยไม่มีข้อมูลคดีความอ้างอิงส่งเข้าไปเพิ่มเติม';
    DOM.chatActiveContextIndicator.style.display = 'none';
  } else if (source === 'workspace') {
    const count = state.workspace.length;
    helpText = `AI จะนำข้อมูลคำพิพากษาศาลฎีกาทั้งหมด ${count} คดีใน Workspace ของคุณมาวิเคราะห์ร่วมด้วย`;
    DOM.chatActiveContextIndicator.textContent = `บริบท: ${count} คดีใน Workspace`;
    DOM.chatActiveContextIndicator.style.display = 'inline-block';
  } else if (source === 'active-drawer') {
    const activeDoc = state.currentViewingDoc;
    if (activeDoc && activeDoc.type === 'deka') {
      helpText = `AI จะอ่านรายละเอียดของคดีฎีกาเลขที่ ${activeDoc.id} ที่คุณกำลังเปิดดูอยู่เป็นข้อมูลหลัก`;
      DOM.chatActiveContextIndicator.textContent = `บริบท: ฎีกาที่ ${activeDoc.id}`;
      DOM.chatActiveContextIndicator.style.display = 'inline-block';
    } else {
      helpText = '⚠️ คุณยังไม่ได้เปิดอ่านคดีฉบับเต็มใดๆ (เปิดอ่านฎีกาก่อนเพื่อเชื่อมโยงบริบทนี้)';
      DOM.chatActiveContextIndicator.style.display = 'none';
      DOM.chatContextSource.value = 'none'; // reset
    }
  }
  
  if (helpEl) {
    helpEl.textContent = helpText;
  }
}

// Clear chat history
function clearChatHistory() {
  state.chatHistory = [];
  DOM.chatMessagesBox.innerHTML = `
    <div class="message system-msg">
      <div class="message-bubble">
        สวัสดีครับ! ผมคือ **AI ผู้ช่วยกฎหมายไทยอัจฉริยะ (AWS Bedrock)** ⚖️<br><br>
        คุณสามารถปรึกษาข้อกฎหมาย หรือปรับตัวเลือกทางด้านซ้ายเพื่อนำข้อมูลคดีที่คุณกำลังรวบรวมใน **Workspace** หรือคดีที่กำลังเปิดอ่านอยู่ มาป้อนเป็นบริบทเพื่อให้ผมช่วยวิเคราะห์แนวทางสู้คดีหรือเขียนร่างคำฟ้องได้ครับ<br><br>
        *กรุณาระบุคำถามหรือประเด็นทางกฎหมายที่คุณต้องการตรวจสอบด้านล่างนี้ได้เลยครับ:*
      </div>
    </div>
  `;
}

// Append a bubble helper
function appendMessageToChat(role, text, contextSource = null) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}-msg`;
  
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble';
  bubbleDiv.innerHTML = text ? renderMarkdown(text) : '<span class="chat-cursor"></span>';
  msgDiv.appendChild(bubbleDiv);
  
  if (contextSource && contextSource !== 'none') {
    const badgeDiv = document.createElement('div');
    badgeDiv.className = 'msg-context-badge';
    const icon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather" style="width:12px; height:12px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
    `;
    const sourceText = contextSource === 'workspace' ? 'คดีใน Workspace' : 'คดีฎีกาที่เปิดอ่านล่าสุด';
    badgeDiv.innerHTML = `${icon} อ้างอิงบริบท: ${sourceText}`;
    msgDiv.appendChild(badgeDiv);
  }
  
  DOM.chatMessagesBox.appendChild(msgDiv);
  DOM.chatMessagesBox.scrollTop = DOM.chatMessagesBox.scrollHeight;
  
  return bubbleDiv;
}

// Handle chat form submit and stream response
async function handleSendChatMessage(e) {
  e.preventDefault();
  const inputEl = DOM.chatUserInput;
  const question = inputEl.value.trim();
  if (!question) return;

  // Disable UI inputs
  inputEl.disabled = true;
  DOM.chatSendBtn.disabled = true;
  inputEl.value = '';

  // Append user message
  appendMessageToChat('user', question);
  DOM.chatStatusText.textContent = 'AI กำลังประมวลผลคำตอบ...';

  try {
    const source = DOM.chatContextSource.value;
    let contextText = '';
    
    if (source === 'workspace') {
      const dekaNos = state.workspace.map(w => w.deka_no);
      if (dekaNos.length > 0) {
        DOM.chatStatusText.textContent = 'กำลังดึงรายละเอียดคดีใน Workspace...';
        const fetchPromises = dekaNos.map(dekaNo => 
          API.getDekaCase(dekaNo, { include_long_text: true, max_long_text_chars: 10000 })
            .then(res => (res && res.ok && res.data) ? res.data : null)
            .catch(() => null)
        );
        const fetchedCases = (await Promise.all(fetchPromises)).filter(Boolean);
        fetchedCases.forEach((c, idx) => {
          contextText += `--- คดีอ้างอิงที่ ${idx + 1}: ฎีกาที่ ${c.deka_no} ---\n`;
          contextText += `ย่อ: ${c.short_text || ''}\n`;
          if (c.long_text) {
            contextText += `เนื้อหาเต็ม: ${c.long_text.substring(0, 8000)}\n`;
          }
          contextText += `\n`;
        });
      }
    } else if (source === 'active-drawer') {
      const activeDoc = state.currentViewingDoc;
      if (activeDoc && activeDoc.type === 'deka' && activeDoc.data) {
        const c = activeDoc.data;
        contextText = `--- คดีที่เปิดอ่านล่าสุด (บริบทหลัก): ฎีกาที่ ${c.deka_no} ---\n`;
        contextText += `หัวข้อ: ${c.title || ''}\n`;
        contextText += `ย่อ: ${c.short_text || ''}\n`;
        if (c.long_text) {
          contextText += `เนื้อหาเต็ม: ${c.long_text.substring(0, 15000)}\n`;
        }
      }
    }

    // Set system prompt
    let systemPrompt = `คุณคือ AI ผู้ช่วยกฎหมายไทยอัจฉริยะ (AWS Bedrock) ที่ทำหน้าที่ให้คำปรึกษา แนะนำ และวิเคราะห์ข้อกฎหมายไทยอย่างถูกต้อง แม่นยำ และสุภาพเป็นมิตร

โทนการตอบ:
- มีความน่าเชื่อถือ สุภาพ เป็นทางการกึ่งวิชาการกฎหมาย
- หากนำมาตรากฎหมายมาตอบ ให้อ้างอิงชื่อกฎหมายและมาตราเสมอ
- หากผลลัพธ์คดีบริบทไม่ได้ครอบคลุมประเด็นคำถาม ให้ชี้แจงตามตรงและใช้ความรู้ทั่วไปของโมเดลประกอบการแนะนำโดยแยกให้ผู้ใช้เห็นว่าส่วนใดคือสิ่งที่อ้างอิงจากคดีบริบท และส่วนใดเป็นข้อเสนอแนะทั่วไป`;

    if (contextText) {
      systemPrompt += `\n\nนี่คือข้อมูลคำพิพากษาฎีกาอ้างอิงเพื่อใช้เป็นบริบทในการตอบคำถามนี้:\n${contextText}\n\nเมื่อตอบคำถาม ให้พยายามอ้างอิงจากคดีบริบทข้างต้นนี้เพื่อความแม่นยำสูงสุด`;
    }

    // Append to state history
    state.chatHistory.push({ role: 'user', content: question });

    // Limit history length to prevent token overflow
    const historyLimit = 16;
    if (state.chatHistory.length > historyLimit) {
      state.chatHistory = state.chatHistory.slice(-historyLimit);
    }

    // Append AI placeholder
    const aiBubble = appendMessageToChat('ai', '', source);
    
    const modelId = DOM.chatModelSelect.value;
    const temp = parseFloat(DOM.chatTemperature.value);
    
    DOM.chatStatusText.textContent = `กำลังเชื่อมต่อโมเดล ${modelId.includes('nova') ? 'Nova Pro' : 'Claude'}...`;

    let accumulatedText = '';
    
    await API.chatBedrockStream(
      state.chatHistory,
      { system: systemPrompt, modelId, temperature: temp },
      (chunk) => {
        accumulatedText += chunk;
        aiBubble.innerHTML = renderMarkdown(accumulatedText) + '<span class="chat-cursor"></span>';
        DOM.chatMessagesBox.scrollTop = DOM.chatMessagesBox.scrollHeight;
      },
      () => {
        // Done
        aiBubble.innerHTML = renderMarkdown(accumulatedText);
        state.chatHistory.push({ role: 'assistant', content: accumulatedText });
        DOM.chatStatusText.textContent = 'พร้อมรับคำถาม...';
        inputEl.disabled = false;
        DOM.chatSendBtn.disabled = false;
        inputEl.focus();
      },
      (err) => {
        // Error
        console.error('Bedrock Chat Stream Error:', err);
        aiBubble.innerHTML = `<span style="color: var(--color-red)">⚠️ เกิดข้อผิดพลาดในระบบแชต: ${err.message}</span>`;
        DOM.chatStatusText.textContent = 'พร้อมรับคำถาม...';
        inputEl.disabled = false;
        DOM.chatSendBtn.disabled = false;
      }
    );

  } catch (err) {
    console.error('Bedrock Chat Client Error:', err);
    appendMessageToChat('ai', `⚠️ ล้มเหลวเนื่องจาก: ${err.message}`);
    DOM.chatStatusText.textContent = 'พร้อมรับคำถาม...';
    inputEl.disabled = false;
    DOM.chatSendBtn.disabled = false;
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
