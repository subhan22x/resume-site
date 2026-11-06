(async () => {
  const config = window.LOCAL_EDITOR;
  const response = await fetch(`/__editor/state?${encodeURIComponent(config.page)}`);
  const state = await response.json();
  const edits = {}, sharedEdits = {};
  let editing = true, saving = false;
  const bar = document.createElement('aside');
  bar.id = 'local-editor';
  bar.setAttribute('aria-label', 'Website text editor');
  bar.innerHTML = `<div class="le-top"><span class="le-brand">✎ Site editor <small>LOCAL</small></span><select aria-label="Choose page"></select><button data-action="shared">Shared content</button><button data-action="preview" aria-pressed="false">Preview</button><button data-action="reset" disabled>Reset edits</button><button data-action="save" class="le-save" disabled>Save locally</button></div><div class="le-bottom"><span data-status role="status">Click highlighted text to edit. Save here, then tell Codex when to push.</span><span data-count>0 changes</span></div><div class="le-shared" hidden><div class="le-panel-head"><div><strong>Shared content</strong><p>Profile, project cards, and other text from site-data.js. Changes apply across pages after saving.</p></div><button data-action="close" aria-label="Close shared content">×</button></div><input type="search" aria-label="Find shared text" placeholder="Find text, a project, or a field…"><div class="le-fields"></div></div>`;
  document.body.append(bar);
  document.body.classList.add('le-editing');
  const status = bar.querySelector('[data-status]');
  const save = bar.querySelector('[data-action="save"]');
  const reset = bar.querySelector('[data-action="reset"]');
  const select = bar.querySelector('select');
  const panel = bar.querySelector('.le-shared');
  const nodes = [...document.querySelectorAll('[data-local-edit]')];
  for (const page of state.pages) {
    select.add(new Option(page.replace('.html', ''), page, false, page === state.page));
  }
  function count() { return Object.keys(edits).length + Object.keys(sharedEdits).length; }
  function update() {
    save.disabled = !count() || saving;
    reset.disabled = !count() || saving;
    bar.querySelector('[data-count]').textContent = `${count()} unsaved ${count() === 1 ? 'change' : 'changes'}`;
  }
  function remember(target, key, value, original) {
    if (value === original) delete target[key]; else target[key] = value;
    update();
  }
  function setEditing(value) {
    editing = value;
    document.body.classList.toggle('le-editing', value);
    nodes.forEach(node => { node.contentEditable = value ? 'plaintext-only' : 'false'; });
    bar.querySelector('[data-action="preview"]').textContent = value ? 'Preview' : 'Resume editing';
    bar.querySelector('[data-action="preview"]').setAttribute('aria-pressed', String(!value));
    if (!value) panel.hidden = true;
  }
  nodes.forEach(node => {
    node.contentEditable = 'plaintext-only';
    node.spellcheck = true;
    node.setAttribute('aria-label', 'Edit text');
    node.addEventListener('input', () => {
      const id = node.dataset.localEdit;
      remember(edits, id, node.textContent, state.segments[id]);
      node.classList.toggle('le-changed', id in edits);
      status.textContent = 'Unsaved edits. Save locally when ready.';
    });
    node.addEventListener('keydown', event => {
      if (!((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's')) event.stopPropagation();
      if (event.key === 'Enter') { event.preventDefault(); node.blur(); }
      if (event.key === 'Escape') node.blur();
    });
  });
  document.addEventListener('click', event => {
    if (editing && event.target.closest('[data-local-edit]')?.closest('a')) event.preventDefault();
  }, true);
  select.addEventListener('change', () => {
    if (count() && !confirm('Leave this page and discard unsaved edits?')) { select.value = state.page; return; }
    for (const key of Object.keys(edits)) delete edits[key];
    for (const key of Object.keys(sharedEdits)) delete sharedEdits[key];
    location.href = select.value;
  });
  const fields = bar.querySelector('.le-fields');
  for (const item of state.shared) {
    const label = document.createElement('label');
    label.className = 'le-field';
    label.dataset.search = `${item.label} ${item.value}`.toLowerCase();
    const title = document.createElement('span');
    title.textContent = item.label;
    const input = document.createElement('textarea');
    input.value = item.value;
    input.rows = item.value.length > 100 ? 3 : 2;
    input.dataset.sharedId = item.id;
    input.addEventListener('input', () => {
      remember(sharedEdits, item.id, input.value, item.value);
      status.textContent = 'Shared content edited. Save locally to update the preview.';
    });
    label.append(title, input);
    fields.append(label);
  }
  bar.querySelector('input[type="search"]').addEventListener('input', event => {
    const term = event.target.value.toLowerCase();
    fields.querySelectorAll('label').forEach(label => { label.hidden = !label.dataset.search.includes(term); });
  });
  async function saveChanges() {
    if (!count() || saving) return;
    saving = true;
    update();
    save.textContent = 'Saving…';
    try {
      const response = await fetch('/__editor/save', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Editor-Token': config.token }, body: JSON.stringify({ page: state.page, version: state.version, sharedVersion: state.sharedVersion, edits, sharedEdits }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Save failed.');
      for (const key of Object.keys(edits)) delete edits[key];
      for (const key of Object.keys(sharedEdits)) delete sharedEdits[key];
      sessionStorage.setItem('local-editor-saved', 'true');
      location.reload();
    } catch (error) {
      status.textContent = error.message;
      status.setAttribute('data-error', '');
      saving = false;
      save.textContent = 'Save locally';
      update();
    }
  }
  bar.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'save') saveChanges();
    if (action === 'preview') setEditing(!editing);
    if (action === 'shared') { panel.hidden = !panel.hidden; if (!panel.hidden) bar.querySelector('input[type="search"]').focus(); }
    if (action === 'close') panel.hidden = true;
    if (action === 'reset' && confirm('Discard your unsaved edits?')) {
      nodes.forEach(node => { node.textContent = state.segments[node.dataset.localEdit]; node.classList.remove('le-changed'); });
      fields.querySelectorAll('textarea').forEach(input => { input.value = state.shared[input.dataset.sharedId].value; });
      for (const key of Object.keys(edits)) delete edits[key];
      for (const key of Object.keys(sharedEdits)) delete sharedEdits[key];
      status.textContent = 'Unsaved edits discarded.';
      update();
    }
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveChanges(); }
  });
  window.addEventListener('beforeunload', event => { if (count()) { event.preventDefault(); event.returnValue = ''; } });
  if (sessionStorage.getItem('local-editor-saved')) {
    status.textContent = 'Saved to local files. Review the page, then tell Codex when to push.';
    sessionStorage.removeItem('local-editor-saved');
  }
})();
