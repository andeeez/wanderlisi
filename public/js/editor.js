document.addEventListener('DOMContentLoaded', async () => {
  const editor = document.getElementById('editor');
  const msg = document.getElementById('msg');
  const save = document.getElementById('save');
  const logout = document.getElementById('logout');
  const fileSelect = document.getElementById('file-select');
  const refresh = document.getElementById('refresh');
  
  let currentFileId = '';

  async function loadNoteFiles() {
    fileSelect.disabled = true;
    try {
      const res = await fetch('/note-files');
      if (res.ok) {
        const { files } = await res.json();
        
        // Group files by directory
        const grouped = files.reduce((acc, f) => {
          const dir = f.directory || 'root';
          if (!acc[dir]) acc[dir] = [];
          acc[dir].push(f);
          return acc;
        }, {});

        // Create grouped options
        const options = [];
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).forEach(([dir, files]) => {
          if (Object.keys(grouped).length > 1) {
            options.push(`<optgroup label="${dir}">`);
          }
          files.forEach(f => {
            options.push(`<option value="${f.id}">${f.label}</option>`);
          });
          if (Object.keys(grouped).length > 1) {
            options.push('</optgroup>');
          }
        });

        fileSelect.innerHTML = options.join('');
        
        // Select first file if none selected
        if (!currentFileId && files.length > 0) {
          currentFileId = files[0].id;
          fileSelect.value = currentFileId;
          await load();
        }
      }
    } catch (err) {
      console.error('Failed to load note files:', err);
    } finally {
      fileSelect.disabled = false;
    }
  }

  async function load() {
    const res = await fetch(`/file-content?id=${currentFileId}`);
    if (res.ok) {
      const data = await res.json();
      editor.value = data.content || '';
    } else if (res.status === 401) {
      window.location.href = '/login.html';
    } else {
      editor.value = '';
      msg.textContent = 'Failed to load file';
    }
  }

  save.addEventListener('click', async () => {
    msg.textContent = 'Saving...';
    const content = editor.value;
    const res = await fetch('/save', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ content, fileId: currentFileId }) 
    });
    if (res.ok) {
      msg.style.color = '#080';
      msg.textContent = 'Saved';
      setTimeout(() => { msg.textContent = ''; }, 2000);
    } else if (res.status === 401) {
      window.location.href = '/login.html';
    } else {
      msg.style.color = '#a00';
      msg.textContent = 'Save failed';
    }
  });

  logout.addEventListener('click', () => { window.location.href = '/logout'; });
  
  fileSelect.addEventListener('change', (e) => {
    currentFileId = e.target.value;
    load();
  });

  refresh.addEventListener('click', async () => {
    refresh.textContent = '↻ ...';
    await loadNoteFiles();
    refresh.textContent = '↻';
  });

  await loadNoteFiles();
});
