(() => {
  'use strict';
  const api = (document.querySelector('meta[name="cashnote-download-api"]')?.content || location.origin).replace(/\/$/, '');
  const site = (document.querySelector('meta[name="cashnote-site-url"]')?.content || 'https://cashnote-website.onrender.com').replace(/\/$/, '');
  const $ = (selector) => document.querySelector(selector);
  const loginCard = $('#login-card');
  const editorCard = $('#editor-card');
  const logout = $('#logout');
  const form = $('#content-form');
  const mediaKeys = ['heroImage', 'tourVideo', 'galleryTransactions', 'galleryProfiles', 'galleryPreferences'];
  let loadedContent = null;

  async function request(path, options = {}) {
    const response = await fetch(api + path, {
      credentials: 'include',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  function setStatus(selector, message, state = '') {
    const node = $(selector);
    node.textContent = message;
    node.dataset.state = state;
  }

  function previewPath(key, rawPath) {
    const path = String(rawPath || '').trim();
    const preview = document.querySelector(`[data-preview="${key}"]`);
    const empty = document.querySelector(`[data-preview-empty="${key}"]`);
    if (!preview || !empty) return;
    const validLocalPath = path.startsWith('/assets/') && !path.startsWith('//') && !path.includes('..') && !/[\\?#%]/.test(path);
    if (!path || !validLocalPath) {
      preview.hidden = true;
      if (preview.tagName === 'VIDEO') preview.removeAttribute('src');
      empty.hidden = false;
      return;
    }
    preview.src = site + path;
    preview.hidden = false;
    empty.hidden = true;
    if (preview.tagName === 'VIDEO') preview.load();
    if (preview.tagName === 'IMG') preview.onerror = () => { preview.hidden = true; empty.hidden = false; empty.textContent = 'Preview unavailable. Check the path and confirm the file is pushed to GitHub.'; };
  }

  function setFormContent(content) {
    loadedContent = content;
    for (const key of ['heroTitle', 'heroAccent', 'heroCopy', 'featuresTitle', 'aboutTitle', 'tourCaption']) {
      if (form.elements[key]) form.elements[key].value = content[key] || '';
    }
    for (const key of mediaKeys) {
      const value = content.media?.[key] || '';
      const input = form.elements[`media.${key}`];
      if (input) input.value = value;
      previewPath(key, value);
    }
  }

  function collectContent() {
    const content = {};
    for (const key of ['heroTitle', 'heroAccent', 'heroCopy', 'featuresTitle', 'aboutTitle', 'tourCaption']) content[key] = form.elements[key].value.trim();
    content.media = {};
    for (const key of mediaKeys) content.media[key] = form.elements[`media.${key}`].value.trim();
    return content;
  }

  async function loadContent() {
    setStatus('#save-status', 'Loading current content from GitHub…');
    try {
      const data = await request('/api/admin/content');
      setFormContent(data.content || {});
      const repo = data.repository;
      $('#repository-note').textContent = repo ? `${repo.owner}/${repo.repository} · ${repo.branch} · ${repo.contentPath}` : 'Connected to GitHub CMS';
      setStatus('#save-status', 'Loaded the latest saved GitHub content.', 'success');
    } catch (error) {
      setStatus('#save-status', error.message, 'error');
    }
  }

  function showEditor() {
    loginCard.hidden = true;
    editorCard.hidden = false;
    logout.hidden = false;
    loadContent();
  }

  $('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#login-status', 'Signing in…');
    try {
      await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('#password').value }) });
      $('#password').value = '';
      showEditor();
    } catch (error) {
      setStatus('#login-status', error.message, 'error');
    }
  });

  form.addEventListener('input', (event) => {
    const name = event.target?.name || '';
    if (name.startsWith('media.')) previewPath(name.slice('media.'.length), event.target.value);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('#save-content');
    button.disabled = true;
    button.textContent = 'Saving to GitHub…';
    setStatus('#save-status', 'Validating paths and creating a GitHub commit…');
    try {
      const data = await request('/api/admin/content', { method: 'PUT', body: JSON.stringify({ content: collectContent() }) });
      setFormContent(data.content || collectContent());
      setStatus('#save-status', data.message || 'Saved to GitHub. Wait for the Render static site deploy to finish.', 'success');
      if (data.commitUrl) {
        const link = document.createElement('a');
        link.href = data.commitUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = ' View GitHub commit';
        $('#save-status').append(link);
      }
    } catch (error) {
      setStatus('#save-status', error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Save website changes';
    }
  });

  $('#backup').addEventListener('click', async () => {
    try {
      const data = await request('/api/admin/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'cashnote-website-content-backup.json';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('#save-status', 'Content and media-path backup downloaded.', 'success');
    } catch (error) {
      setStatus('#save-status', error.message, 'error');
    }
  });

  $('#restore').addEventListener('click', async () => {
    const file = $('#restore-file').files?.[0];
    if (!file) { setStatus('#save-status', 'Choose a JSON backup file first.', 'error'); return; }
    try {
      const backup = JSON.parse(await file.text());
      if (!backup.content || !window.confirm('Restore this website content and media paths to GitHub?')) return;
      const data = await request('/api/admin/content', { method: 'PUT', body: JSON.stringify({ content: backup.content }) });
      setFormContent(data.content || backup.content);
      setStatus('#save-status', 'Backup restored to GitHub. Render will redeploy the website.', 'success');
    } catch (error) {
      setStatus('#save-status', error.message, 'error');
    }
  });

  logout.addEventListener('click', async () => {
    try { await request('/api/admin/logout', { method: 'POST', body: '{}' }); } catch (_) { /* Expired sessions can be cleared locally by reloading. */ }
    location.reload();
  });

  request('/api/admin/session').then(showEditor).catch(() => {});
})();
