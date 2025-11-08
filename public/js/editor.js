document.addEventListener('DOMContentLoaded', async () => {
  const editor = document.getElementById('editor');
  const msg = document.getElementById('msg');
  const save = document.getElementById('save');
  const logout = document.getElementById('logout');
  const fileSelect = document.getElementById('file-select');
  const refresh = document.getElementById('refresh');
  
  // Upload elements
  const gpxFile = document.getElementById('gpx-file');
  const uploadBtn = document.getElementById('upload-btn');
  const selectedFile = document.getElementById('selected-file');
  const uploadStatus = document.getElementById('upload-status');
  
  // Delete elements
  const deleteBtn = document.getElementById('delete-track');
  const renameBtn = document.getElementById('rename-track');
  
  let currentFileId = '';
  let currentTrackName = '';

  async function loadNoteFiles() {
    fileSelect.disabled = true;
    try {
      const res = await fetch('note-files');
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
        
        // Enable/disable delete button based on selection
        updateActionButtonsState();
      }
    } catch (err) {
      console.error('Failed to load note files:', err);
    } finally {
      fileSelect.disabled = false;
    }
  }

  async function load() {
    const res = await fetch(`file-content?id=${currentFileId}`);
    if (res.ok) {
      const data = await res.json();
      editor.value = data.content || '';
      
      // Extract track name from file ID for delete functionality
      // File ID format: "data-tracks-TrackName-notes.md"
      if (currentFileId) {
        const parts = currentFileId.split('-');
        if (parts.length >= 3) {
          // Remove "data", "tracks", and "notes.md" parts
          const trackParts = parts.slice(2, -1); // Remove first 2 and last 1
          currentTrackName = trackParts.join('-');
        }
      }
      updateActionButtonsState();
    } else if (res.status === 401) {
      window.location.href = 'login.html';
    } else {
      editor.value = '';
      msg.textContent = 'Failed to load file';
    }
  }

  function updateActionButtonsState() {
    const hasSelection = currentFileId && currentTrackName;
    deleteBtn.disabled = !hasSelection;
    renameBtn.disabled = !hasSelection;
    
    if (hasSelection) {
      deleteBtn.title = `Delete track: ${currentTrackName}`;
      renameBtn.title = `Rename track: ${currentTrackName}`;
    } else {
      deleteBtn.title = 'Select a track to delete';
      renameBtn.title = 'Select a track to rename';
    }
  }

  save.addEventListener('click', async () => {
    msg.textContent = 'Saving...';
    const content = editor.value;
    const res = await fetch('save', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ content, fileId: currentFileId }) 
    });
    if (res.ok) {
      msg.style.color = '#080';
      msg.textContent = 'Saved';
      setTimeout(() => { msg.textContent = ''; }, 2000);
    } else if (res.status === 401) {
      window.location.href = 'login.html';
    } else {
      msg.style.color = '#a00';
      msg.textContent = 'Save failed';
    }
  });

  logout.addEventListener('click', () => { window.location.href = 'logout'; });
  
  fileSelect.addEventListener('change', (e) => {
    currentFileId = e.target.value;
    load();
  });

  refresh.addEventListener('click', async () => {
    refresh.textContent = '↻ ...';
    await loadNoteFiles();
    refresh.textContent = '↻';
  });

  deleteBtn.addEventListener('click', async () => {
    if (!currentTrackName) {
      alert('Please select a track to delete');
      return;
    }

    const confirmation = confirm(`Are you sure you want to delete the track "${currentTrackName}"?\n\nThis will permanently delete:\n- The GPX file\n- All notes\n- All metadata\n- All associated files\n\nThis action cannot be undone!`);
    
    if (!confirmation) {
      return;
    }

    deleteBtn.disabled = true;
    deleteBtn.textContent = '🗑️ Deleting...';

    try {
      const res = await fetch('delete-track', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackName: currentTrackName })
      });

      const result = await res.json();
      
      if (res.ok && result.ok) {
        msg.style.color = '#080';
        msg.textContent = `✅ Track "${currentTrackName}" deleted successfully`;
        
        // Clear editor and reset selection
        editor.value = '';
        currentFileId = '';
        currentTrackName = '';
        
        // Refresh the file list
        await loadNoteFiles();
        
        setTimeout(() => { msg.textContent = ''; }, 3000);
      } else {
        msg.style.color = '#a00';
        msg.textContent = `❌ ${result.message || 'Delete failed'}`;
      }
    } catch (err) {
      console.error('Delete error:', err);
      msg.style.color = '#a00';
      msg.textContent = `❌ Delete failed: ${err.message}`;
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.textContent = '🗑️ Delete';
      updateActionButtonsState();
    }
  });

  renameBtn.addEventListener('click', async () => {
    if (!currentTrackName) {
      alert('Please select a track to rename');
      return;
    }

    const newName = prompt(`Enter new name for track "${currentTrackName}":`, currentTrackName);
    
    if (!newName || newName.trim() === '') {
      return;
    }

    const trimmedNewName = newName.trim();
    if (trimmedNewName === currentTrackName) {
      alert('New name must be different from current name');
      return;
    }

    renameBtn.disabled = true;
    renameBtn.textContent = '✏️ Renaming...';

    try {
      const res = await fetch('rename-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          oldName: currentTrackName, 
          newName: trimmedNewName 
        })
      });

      const result = await res.json();
      
      if (res.ok && result.ok) {
        msg.style.color = '#080';
        msg.textContent = `✅ Track renamed successfully to "${result.newName}"`;
        
        // Update current track name
        currentTrackName = result.newName;
        
        // Refresh the file list to show new name
        await loadNoteFiles();
        
        // Try to select the renamed track
        const newFileId = `data-tracks-${result.newName.replace(/\s+/g, '-')}-notes-md`;
        if (fileSelect.querySelector(`option[value="${newFileId}"]`)) {
          currentFileId = newFileId;
          fileSelect.value = currentFileId;
          await load();
        }
        
        setTimeout(() => { msg.textContent = ''; }, 3000);
      } else {
        msg.style.color = '#a00';
        msg.textContent = `❌ ${result.message || 'Rename failed'}`;
      }
    } catch (err) {
      console.error('Rename error:', err);
      msg.style.color = '#a00';
      msg.textContent = `❌ Rename failed: ${err.message}`;
    } finally {
      renameBtn.disabled = false;
      renameBtn.textContent = '✏️ Rename';
      updateActionButtonsState();
    }
  });

  // Upload functionality
  gpxFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedFile.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      uploadBtn.disabled = false;
      uploadStatus.textContent = '';
    } else {
      selectedFile.textContent = '';
      uploadBtn.disabled = true;
    }
  });

  uploadBtn.addEventListener('click', async () => {
    const file = gpxFile.files[0];
    if (!file) {
      uploadStatus.textContent = 'Please select a file first';
      uploadStatus.className = 'upload-status error';
      return;
    }

    const formData = new FormData();
    formData.append('gpxFile', file);

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    uploadStatus.textContent = 'Uploading GPX file...';
    uploadStatus.className = 'upload-status';

    try {
      const res = await fetch('upload-gpx', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      
      if (res.ok && result.ok) {
        uploadStatus.textContent = `✅ ${result.message}`;
        uploadStatus.className = 'upload-status success';
        
        // Clear file selection
        gpxFile.value = '';
        selectedFile.textContent = '';
        
        // Refresh the file list to show new track
        setTimeout(async () => {
          await loadNoteFiles();
          uploadStatus.textContent = '';
        }, 3000);
      } else {
        uploadStatus.textContent = `❌ ${result.message || 'Upload failed'}`;
        uploadStatus.className = 'upload-status error';
      }
    } catch (err) {
      console.error('Upload error:', err);
      uploadStatus.textContent = `❌ Upload failed: ${err.message}`;
      uploadStatus.className = 'upload-status error';
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload Track';
    }
  });

  await loadNoteFiles();
});
