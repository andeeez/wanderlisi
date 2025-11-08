export default class Note {

    editLink = "";
    currentTrack = null;
    rawNoteContent = "";
    isEditing = false;

    constructor() {
        console.log("Note constructor called");
        
        document.getElementById("notes-button").addEventListener("click", () => this.toggle());
        document.getElementById("edit-button").addEventListener("click", () => {
            window.open(this.editLink);
        });
        
        // Simple, direct event listener setup
        this.setupInlineEditButton();
        this.setupInlineEditor();
        
        console.log("Note constructor completed");
    }

    setupInlineEditButton() {
        console.log("setupInlineEditButton called");
        
        // Setup with a small delay to ensure DOM is ready
        setTimeout(() => {
            const btn = document.getElementById("inline-edit-button");
            console.log("Looking for inline-edit-button...", btn);
            
            if (btn) {
                // Remove any existing listeners first
                btn.replaceWith(btn.cloneNode(true));
                const newBtn = document.getElementById("inline-edit-button");
                
                newBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Edit button clicked - starting inline edit");
                    alert("Edit button clicked!"); // Temporary visual confirmation
                    this.startInlineEdit();
                });
                
                // Also add onclick as fallback
                newBtn.onclick = (e) => {
                    e.preventDefault();
                    console.log("Edit button onclick triggered");
                    this.startInlineEdit();
                };
                
                console.log("Inline edit button event listener added");
            } else {
                console.error("Could not find inline-edit-button");
            }
        }, 500);
    }

    setupInlineEditor() {
        console.log("Setting up inline editor");
        
        // Create inline editor elements if they don't exist
        const notesContainer = document.getElementById("notes-container");
        
        if (!document.getElementById("notes-editor")) {
            console.log("Creating notes-editor div");
            const editorDiv = document.createElement("div");
            editorDiv.id = "notes-editor";
            editorDiv.innerHTML = `
                <textarea id="notes-textarea" placeholder="Enter your notes here..."></textarea>
                <div class="edit-controls">
                    <button class="save-btn" id="save-notes"><i class="fas fa-save"></i> Spichärä</button>
                    <button class="cancel-btn" id="cancel-edit"><i class="fas fa-times"></i> Abbräche</button>
                </div>
            `;
            notesContainer.appendChild(editorDiv);
            console.log("notes-editor div created and added to DOM");
        }

        // Add event listeners
        const saveBtn = document.getElementById("save-notes");
        const cancelBtn = document.getElementById("cancel-edit");
        const textarea = document.getElementById("notes-textarea");
        
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                console.log("Save button clicked");
                this.saveInlineEdit();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                console.log("Cancel button clicked");
                this.cancelInlineEdit();
            });
        }
        
        if (textarea) {
            // Add keyboard shortcuts
            textarea.addEventListener("keydown", (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    console.log("Ctrl+Enter pressed");
                    this.saveInlineEdit();
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    console.log("Escape pressed");
                    this.cancelInlineEdit();
                }
            });
        }
        
        console.log("Inline editor setup complete");
    }

    load(track, callback) {
        var folder = track.folder();
        fetchUrl(folder + "/notes.md", response => {
            var record = {};
            this.rawNoteContent = response.responseText; // Store raw content for editing
            record.note = marked.parse(response.responseText);
            var values = response.responseText.split('\n')
                .filter(line => /^\s*-/.test(line))
                .filter(line => line.indexOf(":") > 0)
                .map(line => line.split(":")[1])
                .filter(line => line.length > 0)
                .map(line => line.trim()[0])
                .map(line => line.toLowerCase())
            if (values.length >= 2) {
                record.done = (values[0] != "n") * 1 + (values[1] != "n") * 2;
            }
            callback(record);
        }, true);
    }

    show(track) {
        this.currentTrack = track;
        document.getElementById("notes").innerHTML = track.note;
        this.editLink = track.metadata.notes;
        
        // Load the raw markdown content for this track for editing
        this.loadRawContent(track);
        
        // Show/hide inline edit button based on notes visibility
        this.updateInlineEditVisibility();
    }

    loadRawContent(track) {
        // Load raw markdown content for editing
        var folder = track.folder();
        fetchUrl(folder + "/notes.md", response => {
            this.rawNoteContent = response.responseText || "";
            console.log("Raw content loaded for editing:", this.rawNoteContent);
        }, true);
    }

    updateInlineEditVisibility() {
        const notesContainer = document.getElementById("notes-container");
        const inlineEditBtn = document.getElementById("inline-edit-button");
        
        if (!notesContainer || !inlineEditBtn) {
            return;
        }
        
        const notesVisible = notesContainer.style.display !== "none";
        
        if (notesVisible && this.currentTrack && !this.isEditing) {
            inlineEditBtn.style.visibility = "visible";
            inlineEditBtn.style.opacity = "0.4";
        } else {
            inlineEditBtn.style.visibility = "hidden";
            inlineEditBtn.style.opacity = "0";
        }
    }

    startInlineEdit() {
        console.log("startInlineEdit called", {
            isEditing: this.isEditing,
            currentTrack: !!this.currentTrack
        });
        
        if (this.isEditing || !this.currentTrack) {
            console.log("Cannot start edit: already editing or no track");
            return;
        }
        
        this.isEditing = true;
        const notesDiv = document.getElementById("notes");
        const editorDiv = document.getElementById("notes-editor");
        const textarea = document.getElementById("notes-textarea");
        
        console.log("Editor elements:", {
            notesDiv: !!notesDiv,
            editorDiv: !!editorDiv,
            textarea: !!textarea
        });
        
        if (!editorDiv || !textarea) {
            console.error("Editor elements not found");
            this.isEditing = false;
            return;
        }
        
        // Hide notes display and show editor
        notesDiv.style.display = "none";
        editorDiv.style.display = "block";
        
        // Load current content into textarea
        if (this.rawNoteContent) {
            textarea.value = this.rawNoteContent;
        } else {
            // If no raw content, extract from HTML or use empty
            textarea.value = "";
        }
        textarea.focus();
        
        // Update button states
        document.getElementById("inline-edit-button").classList.add("active-button");
        
        console.log("Inline edit started successfully");
    }

    async saveInlineEdit() {
        if (!this.isEditing || !this.currentTrack) return;
        
        const textarea = document.getElementById("notes-textarea");
        const newContent = textarea.value;
        
        console.log("Saving content:", newContent);
        console.log("Current track:", this.currentTrack);
        console.log("Track folder:", this.currentTrack.folder());
        
        try {
            // Get track name from folder path
            const trackFolder = this.currentTrack.folder();
            // Remove 'data/tracks/' prefix to get just the folder name
            let trackName = trackFolder.replace('data/tracks/', '');
            
            // Decode any URL encoding that might be present
            trackName = decodeURIComponent(trackName);
            
            console.log("Extracted track name:", trackName);
            
            const requestBody = { 
                trackName: trackName,
                content: newContent 
            };
            
            console.log("Request body:", requestBody);
            
            const res = await fetch('http://localhost:3000/save-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            console.log("Save response status:", res.status);
            
            if (res.ok) {
                const result = await res.json();
                console.log("Save successful:", result);
                
                // Update the stored content and re-render
                this.rawNoteContent = newContent;
                this.currentTrack.note = marked.parse(newContent);
                
                // Update the display
                document.getElementById("notes").innerHTML = this.currentTrack.note;
                
                // Exit edit mode
                this.exitEditMode();
                
                // Show success message briefly
                this.showEditMessage("Notes saved successfully", "success");
                console.log("Notes saved successfully");
            } else {
                const errorData = await res.json();
                console.error("Save failed:", res.status, errorData);
                throw new Error(`Failed to save notes: ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error saving notes:', error);
            this.showEditMessage("Failed to save notes: " + error.message, "error");
        }
    }

    cancelInlineEdit() {
        if (!this.isEditing) return;
        this.exitEditMode();
    }

    exitEditMode() {
        this.isEditing = false;
        const notesDiv = document.getElementById("notes");
        const editorDiv = document.getElementById("notes-editor");
        
        // Show notes display and hide editor
        notesDiv.style.display = "block";
        editorDiv.style.display = "none";
        
        // Update button states
        document.getElementById("inline-edit-button").classList.remove("active-button");
    }

    showEditMessage(message, type) {
        // Create or update a temporary message element
        let msgEl = document.getElementById("edit-message");
        if (!msgEl) {
            msgEl = document.createElement("div");
            msgEl.id = "edit-message";
            msgEl.style.position = "absolute";
            msgEl.style.top = "5px";
            msgEl.style.right = "12px";
            msgEl.style.padding = "5px 10px";
            msgEl.style.borderRadius = "3px";
            msgEl.style.fontSize = "12px";
            msgEl.style.zIndex = "100";
            document.getElementById("notes-container").appendChild(msgEl);
        }
        
        msgEl.textContent = message;
        msgEl.style.background = type === "success" ? "#d4edda" : "#f8d7da";
        msgEl.style.color = type === "success" ? "#155724" : "#721c24";
        msgEl.style.border = type === "success" ? "1px solid #c3e6cb" : "1px solid #f5c6cb";
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (msgEl && msgEl.parentNode) {
                msgEl.parentNode.removeChild(msgEl);
            }
        }, 3000);
    }

    hide() {
        document.getElementById("notes-container").style.display = "none";
        document.getElementById("track-data").style.display = "block";
        document.getElementById("notes-button").classList.remove("active-button");
        
        // Exit edit mode if active
        if (this.isEditing) {
            this.exitEditMode();
        }
        
        this.updateInlineEditVisibility();
    }

    toggle() {
        const notesContainer = document.getElementById("notes-container");
        const trackData = document.getElementById("track-data");
        const notesButton = document.getElementById("notes-button");
        
        if (notesContainer.style.display == "none") {
            notesContainer.style.display = "block";
            trackData.style.display = "none";
            notesButton.classList.add("active-button");
        } else {
            this.hide();
            return;
        }
        
        this.updateInlineEditVisibility();
    }
}