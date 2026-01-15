// Glassboard Renderer Process
// Handles drawing canvas, text overlays, and UI interactions

class Glassboard {
    constructor() {
        this.app = document.getElementById('app');
        this.canvas = document.getElementById('draw-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.textContainer = document.getElementById('text-container');

        // Multi-note system
        this.notes = []; // Array of notes
        this.currentNoteIndex = 0;

        this.isDrawing = false;
        this.isTextMode = false;
        this.isSelectMode = false;
        this.currentColor = '#ffffff';
        this.currentStrokeWidth = 4;
        this.currentLine = null;
        this.selectedTextId = null;

        // Object grouping state
        this.currentObjectId = null;
        this.lastStrokeTime = 0;
        this.objectGroupTimeout = 500; // ms - strokes within this time are grouped

        // Selection state for drawing objects
        this.selectedObjectId = null;
        this.isDraggingObject = false;
        this.dragStartPoint = null;

        // Zoom state
        this.zoomLevel = 1;
        this.minZoom = 0.25;
        this.maxZoom = 4;

        // Pan state
        this.panX = 0;
        this.panY = 0;

        // Rotation state
        this.rotation = 0;

        // Settings
        this.settings = {
            pinchZoom: true,
            pan: true,
            rotate: true,
            showZoomControls: true,
            openWithCleanSlate: false
        };

        // Clipboard state (internal)
        this.clipboard = null; // { type: 'object' | 'text', data: ... }

        // System clipboard state
        this.systemClipboard = null; // Content from system clipboard
        this.pasteOverlayVisible = false;

        // Undo/redo history
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        this.isUndoRedoAction = false;

        // Auto-save debounce
        this.saveTimeout = null;

        // Select all state
        this.allSelected = false;
        this.selectedObjects = [];

        // Double command key tracking
        this.lastRightCommandTime = 0;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupToolbar();
        this.setupDrawing();
        this.setupTextMode();
        this.setupKeyboardShortcuts();
        this.setupFocusHandling();
        this.setupResize();
        this.setupZoom();
        this.setupContextMenu();
        this.setupClipboardPaste();
        this.setupSettings();
        this.setupGestures();

        // Initialize with empty note if needed
        if (this.notes.length === 0) {
            this.notes.push(this.createEmptyNote());
        }

        // Load saved data
        this.loadSavedData();

        // Setup left edge resize
        this.setupLeftResize();
    }

    // Note management - getters for current note's data
    get lines() {
        return this.notes[this.currentNoteIndex]?.lines || [];
    }
    set lines(value) {
        if (this.notes[this.currentNoteIndex]) {
            this.notes[this.currentNoteIndex].lines = value;
        }
    }

    get textItems() {
        return this.notes[this.currentNoteIndex]?.textItems || [];
    }
    set textItems(value) {
        if (this.notes[this.currentNoteIndex]) {
            this.notes[this.currentNoteIndex].textItems = value;
        }
    }

    get images() {
        return this.notes[this.currentNoteIndex]?.images || [];
    }
    set images(value) {
        if (this.notes[this.currentNoteIndex]) {
            this.notes[this.currentNoteIndex].images = value;
        }
    }

    createEmptyNote() {
        return {
            id: Date.now().toString(),
            lines: [],
            textItems: [],
            images: [],
            createdAt: Date.now(),
            lastModified: Date.now()
        };
    }

    // Navigate to previous note
    previousNote() {
        if (this.currentNoteIndex > 0) {
            this.saveCurrentNoteState();
            this.currentNoteIndex--;
            this.loadCurrentNote();
            this.updateNoteIndicator();
        }
    }

    // Navigate to next note or create new one
    nextNote() {
        this.saveCurrentNoteState();

        if (this.currentNoteIndex < this.notes.length - 1) {
            // Go to existing next note
            this.currentNoteIndex++;
        } else {
            // Create new note
            this.notes.push(this.createEmptyNote());
            this.currentNoteIndex = this.notes.length - 1;
        }

        this.loadCurrentNote();
        this.updateNoteIndicator();
    }

    // Save current note state before switching
    saveCurrentNoteState() {
        if (this.notes[this.currentNoteIndex]) {
            this.notes[this.currentNoteIndex].lastModified = Date.now();
        }
        this.autoSave();
    }

    // Load and display current note
    loadCurrentNote() {
        // Clear current display
        this.clearDisplay();

        const note = this.notes[this.currentNoteIndex];
        if (!note) return;

        // Restore text items
        note.textItems.forEach(item => {
            this.restoreTextItem(item);
        });

        // Restore images
        note.images.forEach(img => {
            this.restoreImage(img);
        });

        // Redraw canvas with lines
        this.redraw();

        // Reset history for this note
        this.history = [];
        this.historyIndex = -1;
        this.saveState();
    }

    // Clear the display without affecting note data
    clearDisplay() {
        this.textContainer.querySelectorAll('.text-item').forEach(el => el.remove());
        this.textContainer.querySelectorAll('.pasted-image').forEach(el => el.remove());
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.selectedTextId = null;
        this.selectedObjectId = null;
        this.allSelected = false;
    }

    // Update note indicator in UI
    updateNoteIndicator() {
        let indicator = document.getElementById('note-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'note-indicator';
            this.app.appendChild(indicator);
        }
        indicator.textContent = `${this.currentNoteIndex + 1} / ${this.notes.length}`;
        indicator.classList.add('visible');

        // Hide after 1.5 seconds
        clearTimeout(this.noteIndicatorTimeout);
        this.noteIndicatorTimeout = setTimeout(() => {
            indicator.classList.remove('visible');
        }, 1500);
    }

    setupCanvas() {
        const resize = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
            this.ctx.scale(dpr, dpr);
            this.redraw();
        };

        resize();
        window.addEventListener('resize', resize);
    }

    setupToolbar() {
        // Mode toggle
        const selectModeBtn = document.getElementById('select-mode');
        const drawModeBtn = document.getElementById('draw-mode');
        const textModeBtn = document.getElementById('text-mode');

        const setMode = (mode) => {
            this.isSelectMode = mode === 'select';
            this.isTextMode = mode === 'text';

            // Update button states
            selectModeBtn.classList.toggle('active', mode === 'select');
            drawModeBtn.classList.toggle('active', mode === 'draw');
            textModeBtn.classList.toggle('active', mode === 'text');

            // Update canvas/text container interactions
            if (mode === 'select') {
                this.canvas.style.pointerEvents = 'auto';
                this.canvas.style.cursor = 'default';
                this.textContainer.style.pointerEvents = 'auto';
                this.textContainer.style.cursor = 'default';
            } else if (mode === 'draw') {
                this.canvas.style.pointerEvents = 'auto';
                this.canvas.style.cursor = 'crosshair';
                this.textContainer.style.pointerEvents = 'none';
                this.textContainer.style.cursor = 'default';
            } else if (mode === 'text') {
                this.canvas.style.pointerEvents = 'none';
                this.textContainer.style.pointerEvents = 'auto';
                this.textContainer.style.cursor = 'crosshair';
            }
        };

        // Store setMode for keyboard shortcuts
        this.setMode = setMode;

        selectModeBtn.addEventListener('click', () => setMode('select'));
        drawModeBtn.addEventListener('click', () => setMode('draw'));
        textModeBtn.addEventListener('click', () => setMode('text'));

        // Color picker dropdown
        const colorBtns = document.querySelectorAll('.color-grid .color-btn');
        const currentColorSwatch = document.querySelector('.current-color');
        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                colorBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentColor = btn.dataset.color;
                if (currentColorSwatch) {
                    currentColorSwatch.style.background = btn.dataset.color;
                }
                // Update selected object's color
                if (this.selectedObjectId) {
                    this.changeObjectColor(this.selectedObjectId, btn.dataset.color);
                }
                // Update selected text item's color
                if (this.selectedTextId) {
                    this.changeTextColor(this.selectedTextId, btn.dataset.color);
                }
            });
        });

        // Stroke width dropdown
        const strokeOptions = document.querySelectorAll('.stroke-option');
        const currentStroke = document.querySelector('.current-stroke');
        strokeOptions.forEach(btn => {
            btn.addEventListener('click', () => {
                strokeOptions.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentStrokeWidth = parseInt(btn.dataset.width);
                if (currentStroke) {
                    const size = Math.min(16, 4 + parseInt(btn.dataset.width));
                    currentStroke.style.width = size + 'px';
                    currentStroke.style.height = size + 'px';
                }
            });
        });

        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clear();
        });

        // Background mode toggle
        this.setupBackgroundToggle();

        // Pin toggle
        this.setupPinToggle();

        // Size toggle
        this.setupSizeToggle();

        // Create zoom controls
        this.createZoomControls();
    }

    setupPinToggle() {
        const pinCheckbox = document.getElementById('pin-checkbox');
        if (pinCheckbox) {
            pinCheckbox.addEventListener('change', () => {
                window.glassboard.setPinned(pinCheckbox.checked);
            });
        }
    }

    setupSizeToggle() {
        const sizeItems = document.querySelectorAll('.dropdown-item[data-size]');
        sizeItems.forEach(item => {
            item.addEventListener('click', () => {
                sizeItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                window.glassboard.setWindowSize(item.dataset.size);
            });
        });
    }

    createZoomControls() {
        const zoomControls = document.createElement('div');
        zoomControls.id = 'zoom-controls';
        zoomControls.innerHTML = `
            <button class="zoom-btn" id="zoom-out" title="Zoom out (Cmd+-)">−</button>
            <span id="zoom-indicator">100%</span>
            <button class="zoom-btn" id="zoom-in" title="Zoom in (Cmd++)">+</button>
            <button class="zoom-btn" id="zoom-reset" title="Reset zoom (Cmd+0)">⟲</button>
        `;
        this.app.appendChild(zoomControls);

        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-reset').addEventListener('click', () => this.resetZoom());
    }

    setupBackgroundToggle() {
        const dropdownItems = document.querySelectorAll('.dropdown-item[data-bg]');

        // Set initial background mode
        this.app.classList.add('bg-transparent');
        this.currentBgMode = 'transparent';

        dropdownItems.forEach(item => {
            item.addEventListener('click', () => {
                // Update active state
                dropdownItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Update background class
                const bgMode = item.dataset.bg;
                this.currentBgMode = bgMode;
                this.app.classList.remove('bg-transparent', 'bg-blur', 'bg-dark');
                this.app.classList.add(`bg-${bgMode}`);

                // Tell main process to update vibrancy (for blur effect)
                window.glassboard.setBackgroundMode(bgMode);
            });
        });
    }

    setupDrawing() {
        const getPoint = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            let x, y;
            if (e.touches) {
                x = e.touches[0].clientX - rect.left;
                y = e.touches[0].clientY - rect.top;
            } else {
                x = e.clientX - rect.left;
                y = e.clientY - rect.top;
            }
            // Clamp coordinates to canvas bounds and adjust for zoom
            x = Math.max(0, Math.min(x, rect.width)) / this.zoomLevel;
            y = Math.max(0, Math.min(y, rect.height)) / this.zoomLevel;
            return { x, y };
        };

        const startDrawing = (e) => {
            if (this.isTextMode) return;

            const point = getPoint(e);

            // Check if clicking on an existing stroke (for selection)
            const clickedObjectId = this.findObjectAtPoint(point);
            if (clickedObjectId) {
                // Select the object
                this.selectObject(clickedObjectId);
                // Start dragging
                this.isDraggingObject = true;
                this.dragStartPoint = point;
                return;
            }

            // Deselect if clicking empty space
            this.deselectObject();

            // In select mode, show paste overlay if clipboard has content
            if (this.isSelectMode) {
                if (this.systemClipboard) {
                    this.showPasteOverlay(e.clientX, e.clientY);
                }
                return;
            }

            // Start new drawing (only in draw mode)
            this.isDrawing = true;
            this.app.classList.add('drawing');

            // Determine object ID based on timing
            const now = Date.now();
            if (now - this.lastStrokeTime > this.objectGroupTimeout) {
                this.currentObjectId = now.toString();
            }
            this.lastStrokeTime = now;

            this.currentLine = {
                points: [point],
                color: this.currentColor,
                width: this.currentStrokeWidth,
                objectId: this.currentObjectId
            };
        };

        const draw = (e) => {
            if (this.isTextMode) return;
            e.preventDefault();

            const point = getPoint(e);

            // Handle object dragging
            if (this.isDraggingObject && this.selectedObjectId) {
                const dx = point.x - this.dragStartPoint.x;
                const dy = point.y - this.dragStartPoint.y;
                this.moveObject(this.selectedObjectId, dx, dy);
                this.dragStartPoint = point;
                return;
            }

            if (!this.isDrawing) return;
            this.currentLine.points.push(point);
            this.redraw();
        };

        const stopDrawing = () => {
            if (this.isDraggingObject) {
                this.isDraggingObject = false;
                this.dragStartPoint = null;
                this.saveState(); // Save after dragging object
                return;
            }

            if (!this.isDrawing) return;
            this.isDrawing = false;
            this.app.classList.remove('drawing');
            if (this.currentLine && this.currentLine.points.length > 1) {
                this.lines.push(this.currentLine);
                this.saveState(); // Save after drawing
            }
            this.currentLine = null;
        };

        // Mouse events - use document for move/up to continue drawing over other elements
        this.canvas.addEventListener('mousedown', startDrawing);
        document.addEventListener('mousemove', draw);
        document.addEventListener('mouseup', stopDrawing);

        // Touch events - use document for move/end to continue drawing over other elements
        this.canvas.addEventListener('touchstart', startDrawing, { passive: false });
        document.addEventListener('touchmove', draw, { passive: false });
        document.addEventListener('touchend', stopDrawing);
    }

    // Find which object (if any) is at the given point
    findObjectAtPoint(point) {
        const hitRadius = 10; // pixels tolerance for clicking
        for (let i = this.lines.length - 1; i >= 0; i--) {
            const line = this.lines[i];
            for (const p of line.points) {
                const dist = Math.sqrt((p.x - point.x) ** 2 + (p.y - point.y) ** 2);
                if (dist < hitRadius + line.width / 2) {
                    return line.objectId;
                }
            }
        }
        return null;
    }

    // Select all strokes belonging to an object
    selectObject(objectId) {
        this.selectedObjectId = objectId;
        this.redraw();
    }

    // Deselect current object
    deselectObject() {
        this.selectedObjectId = null;
        this.redraw();
    }

    // Move all strokes of an object by dx, dy
    moveObject(objectId, dx, dy) {
        this.lines.forEach(line => {
            if (line.objectId === objectId) {
                line.points.forEach(p => {
                    p.x += dx;
                    p.y += dy;
                });
            }
        });
        this.redraw();
    }

    // Delete all strokes of an object
    deleteObject(objectId) {
        this.lines = this.lines.filter(line => line.objectId !== objectId);
        if (this.selectedObjectId === objectId) {
            this.selectedObjectId = null;
        }
        this.redraw();
        this.saveState();
    }

    // Change color of all strokes in an object
    changeObjectColor(objectId, color) {
        this.lines.forEach(line => {
            if (line.objectId === objectId) {
                line.color = color;
            }
        });
        this.redraw();
    }

    // Change color of a text item
    changeTextColor(textId, color) {
        const textItem = this.textItems.find(t => t.id === textId);
        if (textItem) {
            textItem.color = color;
        }
        const element = this.textContainer.querySelector(`[data-id="${textId}"]`);
        if (element) {
            element.style.color = color;
            const textarea = element.querySelector('.text-input');
            if (textarea) {
                textarea.style.color = color;
            }
        }
    }

    // Copy selected object to clipboard
    copyObject(objectId) {
        const objectLines = this.lines.filter(line => line.objectId === objectId);
        if (objectLines.length === 0) return;

        // Deep copy the lines
        const copiedLines = objectLines.map(line => ({
            points: line.points.map(p => ({ x: p.x, y: p.y })),
            color: line.color,
            width: line.width
        }));

        this.clipboard = {
            type: 'object',
            data: copiedLines
        };
    }

    // Copy selected text item to clipboard
    copyTextItem(textId) {
        const textItem = this.textItems.find(t => t.id === textId);
        if (!textItem) return;

        const element = this.textContainer.querySelector(`[data-id="${textId}"]`);
        const textarea = element?.querySelector('.text-input');

        this.clipboard = {
            type: 'text',
            data: {
                text: textItem.text,
                color: textItem.color,
                styles: {
                    fontWeight: textarea?.style.fontWeight || 'normal',
                    fontStyle: textarea?.style.fontStyle || 'normal',
                    textDecoration: textarea?.style.textDecoration || 'none'
                }
            }
        };
    }

    // Paste from clipboard
    paste() {
        if (!this.clipboard) return;

        const pasteOffset = 20; // Offset for pasted items

        if (this.clipboard.type === 'object') {
            // Create new object ID for pasted object
            const newObjectId = Date.now().toString();

            // Calculate bounding box to find offset
            let minX = Infinity, minY = Infinity;
            this.clipboard.data.forEach(line => {
                line.points.forEach(p => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                });
            });

            // Add lines with new objectId and offset
            this.clipboard.data.forEach(line => {
                this.lines.push({
                    points: line.points.map(p => ({
                        x: p.x + pasteOffset,
                        y: p.y + pasteOffset
                    })),
                    color: line.color,
                    width: line.width,
                    objectId: newObjectId
                });
            });

            // Select the pasted object
            this.selectedObjectId = newObjectId;
            this.redraw();

        } else if (this.clipboard.type === 'text') {
            // Get center of viewport for paste location
            const rect = this.textContainer.getBoundingClientRect();
            const x = rect.width / 2 / this.zoomLevel;
            const y = rect.height / 2 / this.zoomLevel;

            // Create new text item
            const id = Date.now().toString();
            const item = document.createElement('div');
            item.className = 'text-item selected';
            item.dataset.id = id;
            item.style.left = (x + pasteOffset) + 'px';
            item.style.top = (y + pasteOffset) + 'px';
            item.style.color = this.clipboard.data.color;

            // Add drag handle
            const dragHandle = document.createElement('div');
            dragHandle.className = 'text-drag-handle';
            dragHandle.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/>
                </svg>
            `;
            dragHandle.title = 'Drag to move';

            // Add format bar
            const formatBar = document.createElement('div');
            formatBar.className = 'text-format-bar';
            formatBar.innerHTML = `
                <button class="format-btn" data-format="bold" title="Bold">B</button>
                <button class="format-btn" data-format="italic" title="Italic">I</button>
                <button class="format-btn" data-format="underline" title="Underline">U</button>
                <button class="format-btn delete-btn" title="Delete">✕</button>
            `;

            // Create textarea
            const textarea = document.createElement('textarea');
            textarea.className = 'text-input';
            textarea.value = this.clipboard.data.text;
            textarea.style.color = this.clipboard.data.color;
            textarea.rows = 1;

            // Apply copied styles
            if (this.clipboard.data.styles) {
                textarea.style.fontWeight = this.clipboard.data.styles.fontWeight;
                textarea.style.fontStyle = this.clipboard.data.styles.fontStyle;
                textarea.style.textDecoration = this.clipboard.data.styles.textDecoration;

                // Update format buttons to reflect active styles
                if (this.clipboard.data.styles.fontWeight === 'bold') {
                    formatBar.querySelector('[data-format="bold"]').classList.add('active');
                }
                if (this.clipboard.data.styles.fontStyle === 'italic') {
                    formatBar.querySelector('[data-format="italic"]').classList.add('active');
                }
                if (this.clipboard.data.styles.textDecoration === 'underline') {
                    formatBar.querySelector('[data-format="underline"]').classList.add('active');
                }
            }

            // Add resize handle
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'text-resize-handle';

            item.appendChild(dragHandle);
            item.appendChild(formatBar);
            item.appendChild(textarea);
            item.appendChild(resizeHandle);
            this.textContainer.appendChild(item);

            this.textItems.push({
                id,
                x: x + pasteOffset,
                y: y + pasteOffset,
                text: this.clipboard.data.text,
                color: this.clipboard.data.color,
                styles: this.clipboard.data.styles
            });

            // Setup event handlers for the new text item
            this.setupPastedTextItem(item, id, textarea, formatBar);

            // Select the pasted item
            this.deselectAllText();
            this.selectedTextId = id;
            textarea.focus();

            // Auto-grow
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }
    }

    // Setup event handlers for a pasted text item
    setupPastedTextItem(item, id, textarea, formatBar) {
        // Auto-grow textarea
        const autoGrow = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };

        // Handle input changes
        textarea.addEventListener('input', () => {
            const textItem = this.textItems.find(t => t.id === id);
            if (textItem) {
                textItem.text = textarea.value;
            }
            autoGrow();
        });

        // Handle delete on empty backspace
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && textarea.value === '') {
                e.preventDefault();
                this.deleteTextItem(id);
            }
        });

        // Format button handlers
        formatBar.querySelectorAll('.format-btn[data-format]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const format = btn.dataset.format;
                btn.classList.toggle('active');
                this.applyTextFormat(textarea, format, btn.classList.contains('active'));
            });
        });

        // Delete button handler
        formatBar.querySelector('.delete-btn').addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.deleteTextItem(id);
        });

        // Delete empty text item when clicking away
        textarea.addEventListener('blur', () => {
            setTimeout(() => {
                if (textarea.value.trim() === '') {
                    this.deleteTextItem(id);
                }
            }, 100);
        });

        // Add resize handle if not already present
        let resizeHandle = item.querySelector('.text-resize-handle');
        if (!resizeHandle) {
            resizeHandle = document.createElement('div');
            resizeHandle.className = 'text-resize-handle';
            item.appendChild(resizeHandle);
        }

        // Setup drag and resize
        this.setupTextItemDrag(item, id);
        this.setupTextResize(item, id, resizeHandle);

        // Select on click
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectTextItem(id);
        });
    }

    setupTextMode() {
        this.textContainer.addEventListener('click', (e) => {
            if (!this.isTextMode) return;
            if (e.target !== this.textContainer) return;

            const rect = this.textContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.createTextItem(x, y);
        });

        // Deselect on click outside (only in draw mode)
        document.addEventListener('click', (e) => {
            if (this.isTextMode) return;
            if (!e.target.closest('.text-item') && !e.target.closest('#toolbar')) {
                this.deselectAllText();
            }
        });
    }

    createTextItem(x, y) {
        const id = Date.now().toString();
        const item = document.createElement('div');
        item.className = 'text-item selected';
        item.dataset.id = id;
        item.style.left = x + 'px';
        item.style.top = y + 'px';
        item.style.color = this.currentColor;

        // Add drag handle with move icon
        const dragHandle = document.createElement('div');
        dragHandle.className = 'text-drag-handle';
        dragHandle.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/>
            </svg>
        `;
        dragHandle.title = 'Drag to move';

        // Inline formatting toolbar
        const formatBar = document.createElement('div');
        formatBar.className = 'text-format-bar';
        formatBar.innerHTML = `
            <button class="format-btn" data-format="bold" title="Bold">B</button>
            <button class="format-btn" data-format="italic" title="Italic">I</button>
            <button class="format-btn" data-format="underline" title="Underline">U</button>
            <button class="format-btn delete-btn" title="Delete">✕</button>
        `;

        // Use textarea for multiline support
        const textarea = document.createElement('textarea');
        textarea.className = 'text-input';
        textarea.placeholder = 'Type here...';
        textarea.style.color = this.currentColor;
        textarea.rows = 1;

        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'text-resize-handle';

        item.appendChild(dragHandle);
        item.appendChild(formatBar);
        item.appendChild(textarea);
        item.appendChild(resizeHandle);
        this.textContainer.appendChild(item);

        this.textItems.push({ id, x, y, text: '', color: this.currentColor, styles: {} });
        this.selectedTextId = id;

        // Focus textarea
        textarea.focus();

        // Auto-grow textarea
        const autoGrow = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };

        // Handle input changes
        textarea.addEventListener('input', () => {
            const textItem = this.textItems.find(t => t.id === id);
            if (textItem) {
                textItem.text = textarea.value;
            }
            autoGrow();
        });

        // Handle delete on empty backspace
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && textarea.value === '') {
                e.preventDefault();
                this.deleteTextItem(id);
            }
        });

        // Format button handlers
        formatBar.querySelectorAll('.format-btn[data-format]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent focus loss
                const format = btn.dataset.format;
                btn.classList.toggle('active');
                this.applyTextFormat(textarea, format, btn.classList.contains('active'));
            });
        });

        // Delete button handler
        formatBar.querySelector('.delete-btn').addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.deleteTextItem(id);
        });

        // Delete empty text item when clicking away
        textarea.addEventListener('blur', () => {
            setTimeout(() => {
                if (textarea.value.trim() === '') {
                    this.deleteTextItem(id);
                }
            }, 100); // Small delay to allow format button clicks
        });

        // Setup drag and resize
        this.setupTextItemDrag(item, id);
        this.setupTextResize(item, id, resizeHandle);

        // Select on click
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectTextItem(id);
        });
    }

    applyTextFormat(textarea, format, active) {
        const styles = {
            bold: { fontWeight: active ? 'bold' : 'normal' },
            italic: { fontStyle: active ? 'italic' : 'normal' },
            underline: { textDecoration: active ? 'underline' : 'none' }
        };
        if (styles[format]) {
            Object.assign(textarea.style, styles[format]);
        }
    }

    setupTextItemDrag(element, id) {
        let isDragging = false;
        let startX, startY, origX, origY;

        const startDrag = (e) => {
            // Don't drag from textarea, format buttons, or resize handle
            if (e.target.closest('.text-input') || e.target.closest('.format-btn') || e.target.closest('.text-resize-handle')) return;
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            origX = parseInt(element.style.left) || 0;
            origY = parseInt(element.style.top) || 0;
            element.style.cursor = 'grabbing';
            element.classList.add('dragging');
        };

        const drag = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            element.style.left = (origX + dx) + 'px';
            element.style.top = (origY + dy) + 'px';

            const textItem = this.textItems.find(t => t.id === id);
            if (textItem) {
                textItem.x = origX + dx;
                textItem.y = origY + dy;
            }
        };

        const stopDrag = () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'grab';
                element.classList.remove('dragging');
            }
        };

        element.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    }

    setupTextResize(element, id, handle) {
        let isResizing = false;
        let startX, startY, initialWidth, initialHeight;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            initialWidth = element.offsetWidth;
            initialHeight = element.offsetHeight;
            element.classList.add('resizing');
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const dx = (e.clientX - startX) / this.zoomLevel;
            const dy = (e.clientY - startY) / this.zoomLevel;

            // Allow independent width/height resize
            const newWidth = Math.max(100, initialWidth + dx);
            const newHeight = Math.max(40, initialHeight + dy);

            element.style.width = newWidth + 'px';
            element.style.minHeight = newHeight + 'px';

            // Update textarea width to match
            const textarea = element.querySelector('.text-input');
            if (textarea) {
                textarea.style.width = '100%';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                element.classList.remove('resizing');

                // Update stored dimensions
                const textItem = this.textItems.find(t => t.id === id);
                if (textItem) {
                    textItem.width = element.offsetWidth;
                    textItem.height = element.offsetHeight;
                }
            }
        });
    }

    selectTextItem(id) {
        this.deselectAllText();
        this.selectedTextId = id;
        const element = this.textContainer.querySelector(`[data-id="${id}"]`);
        if (element) {
            element.classList.add('selected');
            const textarea = element.querySelector('.text-input');
            if (textarea) {
                textarea.focus();
            }
        }
    }

    deselectAllText() {
        this.selectedTextId = null;
        this.textContainer.querySelectorAll('.text-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    deleteTextItem(id) {
        const element = this.textContainer.querySelector(`[data-id="${id}"]`);
        if (element) {
            element.remove();
        }
        this.textItems = this.textItems.filter(t => t.id !== id);
        if (this.selectedTextId === id) {
            this.selectedTextId = null;
        }
        this.saveState();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Check if we're in a text input
            const isInTextInput = e.target.closest('.text-input');

            // Cmd+W to close window
            if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
                e.preventDefault();
                window.glassboard.closeWindow();
                return;
            }

            // Cmd+, to open settings
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                this.toggleSettings();
                return;
            }

            // Cmd+Z to undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                if (isInTextInput) return; // Let native undo handle it
                e.preventDefault();
                this.undo();
                return;
            }

            // Cmd+Shift+Z or Cmd+Y to redo
            if ((e.metaKey || e.ctrlKey) && (e.key === 'z' && e.shiftKey || e.key === 'y')) {
                if (isInTextInput) return; // Let native redo handle it
                e.preventDefault();
                this.redo();
                return;
            }

            // Cmd+C to copy
            if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
                // Allow native copy in text inputs with selected text
                if (isInTextInput && window.getSelection().toString()) {
                    return; // Let native copy handle it
                }
                // Copy selected object or text item
                if (this.selectedObjectId) {
                    e.preventDefault();
                    this.copyObject(this.selectedObjectId);
                    return;
                }
                if (this.selectedTextId && !isInTextInput) {
                    e.preventDefault();
                    this.copyTextItem(this.selectedTextId);
                    return;
                }
            }

            // Cmd+V to smart paste
            if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
                // Allow native paste in text inputs
                if (isInTextInput) {
                    return; // Let native paste handle it
                }
                e.preventDefault();
                this.smartPaste();
                return;
            }

            // Cmd+A to select all
            if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                if (isInTextInput) return; // Let native select all handle it
                e.preventDefault();
                this.selectAll();
                return;
            }

            // 'd' or Delete/Backspace to delete selected object or all selected
            if ((e.key === 'd' || e.key === 'Delete' || e.key === 'Backspace') && !isInTextInput) {
                // If all selected (after Cmd+A), delete everything
                if (this.allSelected) {
                    e.preventDefault();
                    this.deleteAllSelected();
                    return;
                }
                // Otherwise delete single selected object
                if (this.selectedObjectId) {
                    e.preventDefault();
                    this.deleteObject(this.selectedObjectId);
                    return;
                }
                // Or delete selected text item
                if (this.selectedTextId) {
                    e.preventDefault();
                    this.deleteTextItem(this.selectedTextId);
                    return;
                }
            }

            // Cmd+Plus to zoom in
            if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
                e.preventDefault();
                this.zoomIn();
                return;
            }

            // Cmd+Minus to zoom out
            if ((e.metaKey || e.ctrlKey) && e.key === '-') {
                e.preventDefault();
                this.zoomOut();
                return;
            }

            // Cmd+0 to reset zoom
            if ((e.metaKey || e.ctrlKey) && e.key === '0') {
                e.preventDefault();
                this.resetZoom();
                return;
            }

            // Escape to deselect
            if (e.key === 'Escape') {
                this.deselectObject();
                this.deselectAllText();
            }

            // Note navigation (only when not in text input)
            if (!isInTextInput) {
                // [ to go to previous note
                if (e.key === '[') {
                    e.preventDefault();
                    this.previousNote();
                    return;
                }

                // ] to go to next note or create new one
                if (e.key === ']') {
                    e.preventDefault();
                    this.nextNote();
                    return;
                }
            }

            // Mode shortcuts (only when not in text input)
            if (!isInTextInput) {
                if (e.key === 'v' || e.key === 'V') {
                    this.setMode('select');
                    return;
                }
                if (e.key === 'b' || e.key === 'B') {
                    this.setMode('draw');
                    return;
                }
                if (e.key === 't' || e.key === 'T') {
                    this.setMode('text');
                    return;
                }
            }

            // Double right Command key to toggle (hide) Glassboard
            if (e.code === 'MetaRight' && !e.repeat) {
                const now = Date.now();
                if (now - this.lastRightCommandTime < 300) {
                    // Double tap detected - hide the window
                    window.glassboard.hideWindow();
                    this.lastRightCommandTime = 0;
                } else {
                    this.lastRightCommandTime = now;
                }
            }
        });
    }

    setupFocusHandling() {
        window.glassboard.onFocusChange((focused) => {
            if (focused) {
                this.app.classList.add('focused');
                // Reapply background mode when focused
                if (this.currentBgMode) {
                    window.glassboard.setBackgroundMode(this.currentBgMode);
                }
            } else {
                this.app.classList.remove('focused');
                // Deselect all text items when window loses focus
                this.deselectAllText();
                // Remove vibrancy when unfocused
                window.glassboard.setBackgroundMode('transparent');
            }
        });
    }

    setupResize() {
        // Add resize handles to window (corners and edges)
        const handles = ['se', 'sw', 'ne', 'nw', 'n', 's', 'e', 'w'];
        handles.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${pos}`;
            this.app.appendChild(handle);

            // Add resizing class when dragging resize handles
            handle.addEventListener('mousedown', () => {
                this.app.classList.add('resizing');
            });
        });

        // Remove resizing class when mouse is released anywhere
        document.addEventListener('mouseup', () => {
            this.app.classList.remove('resizing');
        });

        // Also detect native window resize events for yellow border
        let resizeTimeout;
        window.addEventListener('resize', () => {
            this.app.classList.add('resizing');
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.app.classList.remove('resizing');
            }, 200);
        });
    }

    setupZoom() {
        // Zoom is now handled in setupGestures for trackpad support
        // This method is kept for future zoom-related setup
    }

    zoomIn() {
        this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + 0.25);
        this.applyZoom();
    }

    zoomOut() {
        this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - 0.25);
        this.applyZoom();
    }

    resetZoom() {
        this.zoomLevel = 1;
        this.applyZoom();
    }

    applyZoom() {
        this.applyTransform();
    }

    applyTransform() {
        // Build transform string with translate, scale, and rotate
        const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel}) rotate(${this.rotation}deg)`;
        this.canvas.style.transform = transform;
        this.canvas.style.transformOrigin = 'center center';
        this.textContainer.style.transform = transform;
        this.textContainer.style.transformOrigin = 'center center';

        // Update zoom indicator if exists
        const zoomIndicator = document.getElementById('zoom-indicator');
        if (zoomIndicator) {
            zoomIndicator.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
    }

    resetTransform() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.rotation = 0;
        this.applyTransform();
    }

    setupContextMenu() {
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.zoomLevel;
            const y = (e.clientY - rect.top) / this.zoomLevel;

            const clickedObjectId = this.findObjectAtPoint({ x, y });
            if (clickedObjectId) {
                this.selectObject(clickedObjectId);
                this.showContextMenu(e.clientX, e.clientY, 'object');
            } else {
                // Show general context menu for empty area
                this.showContextMenu(e.clientX, e.clientY, 'general');
            }
        });

        // Hide context menu on click elsewhere
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    }

    showContextMenu(x, y, type = 'object') {
        let menu = document.getElementById('context-menu');
        if (menu) {
            menu.remove();
        }

        menu = document.createElement('div');
        menu.id = 'context-menu';

        if (type === 'general') {
            // General context menu for empty area
            menu.innerHTML = `
                <button class="context-menu-item" data-action="zoom-in">
                    <span>Zoom In</span>
                    <span class="shortcut">⌘+</span>
                </button>
                <button class="context-menu-item" data-action="zoom-out">
                    <span>Zoom Out</span>
                    <span class="shortcut">⌘-</span>
                </button>
                <button class="context-menu-item" data-action="reset-zoom">
                    <span>Reset Zoom</span>
                    <span class="shortcut">⌘0</span>
                </button>
                <div class="context-menu-divider"></div>
                <button class="context-menu-item" data-action="paste">
                    <span>Paste</span>
                    <span class="shortcut">⌘V</span>
                </button>
                <div class="context-menu-divider"></div>
                <button class="context-menu-item" data-action="settings">
                    <span>Settings</span>
                    <span class="shortcut">⌘,</span>
                </button>
            `;

            menu.querySelector('[data-action="zoom-in"]').addEventListener('click', () => {
                this.zoomIn();
                this.hideContextMenu();
            });

            menu.querySelector('[data-action="zoom-out"]').addEventListener('click', () => {
                this.zoomOut();
                this.hideContextMenu();
            });

            menu.querySelector('[data-action="reset-zoom"]').addEventListener('click', () => {
                this.resetZoom();
                this.hideContextMenu();
            });

            menu.querySelector('[data-action="paste"]').addEventListener('click', () => {
                this.paste();
                this.hideContextMenu();
            });

            menu.querySelector('[data-action="settings"]').addEventListener('click', () => {
                this.toggleSettings();
                this.hideContextMenu();
            });
        } else {
            // Object context menu
            menu.innerHTML = `
                <button class="context-menu-item" data-action="copy">
                    <span>Copy</span>
                    <span class="shortcut">⌘C</span>
                </button>
                <button class="context-menu-item" data-action="paste">
                    <span>Paste</span>
                    <span class="shortcut">⌘V</span>
                </button>
                <div class="context-menu-divider"></div>
                <button class="context-menu-item" data-action="delete">
                    <span>Delete</span>
                    <span class="shortcut">D</span>
                </button>
            `;

            menu.querySelector('[data-action="copy"]').addEventListener('click', () => {
                if (this.selectedObjectId) {
                    this.copyObject(this.selectedObjectId);
                }
                this.hideContextMenu();
            });

            menu.querySelector('[data-action="paste"]').addEventListener('click', () => {
                this.paste();
                this.hideContextMenu();
            });

            menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
                if (this.selectedObjectId) {
                    this.deleteObject(this.selectedObjectId);
                }
                this.hideContextMenu();
            });
        }

        document.body.appendChild(menu);

        // Update paste button state
        const pasteBtn = menu.querySelector('[data-action="paste"]');
        if (pasteBtn) {
            pasteBtn.disabled = !this.clipboard;
            pasteBtn.style.opacity = this.clipboard ? '1' : '0.5';
        }

        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.add('visible');
    }

    hideContextMenu() {
        const menu = document.getElementById('context-menu');
        if (menu) {
            menu.classList.remove('visible');
        }
    }

    redraw() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width / this.zoomLevel, rect.height / this.zoomLevel);

        // Draw all saved lines
        this.lines.forEach(line => this.drawLine(line));

        // Draw current line
        if (this.currentLine) {
            this.drawLine(this.currentLine);
        }

        // Draw selection highlight
        if (this.selectedObjectId) {
            this.drawSelectionHighlight();
        }
    }

    drawLine(line) {
        if (line.points.length < 2) return;

        this.ctx.beginPath();
        this.ctx.strokeStyle = line.color;
        this.ctx.lineWidth = line.width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let i = 1; i < line.points.length; i++) {
            this.ctx.lineTo(line.points[i].x, line.points[i].y);
        }
        this.ctx.stroke();
    }

    drawSelectionHighlight() {
        // Get bounding box of selected object
        const selectedLines = this.lines.filter(l => l.objectId === this.selectedObjectId);
        if (selectedLines.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selectedLines.forEach(line => {
            line.points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
        });

        // Add padding
        const padding = 8;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        // Draw selection box
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        this.ctx.setLineDash([]);

        // Draw corner handles
        const handleSize = 8;
        this.ctx.fillStyle = '#3b82f6';
        const corners = [
            [minX, minY], [maxX, minY],
            [minX, maxY], [maxX, maxY]
        ];
        corners.forEach(([x, y]) => {
            this.ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
        });
    }

    clear() {
        this.lines = [];
        this.currentLine = null;
        this.textItems = [];
        this.images = [];
        this.textContainer.innerHTML = '';
        this.redraw();
    }

    setupClipboardPaste() {
        // Check clipboard when window gains focus
        window.glassboard.onFocusChange((focused) => {
            if (focused) {
                this.checkSystemClipboard();
            } else {
                this.hidePasteOverlay();
            }
        });

        // Also check on initial load
        setTimeout(() => this.checkSystemClipboard(), 500);
    }

    checkSystemClipboard() {
        const content = window.glassboard.getClipboardContent();
        if (content) {
            this.systemClipboard = content;
        } else {
            this.systemClipboard = null;
        }
    }

    showPasteOverlay(x, y) {
        if (!this.systemClipboard) return;

        // Remove existing overlay
        this.hidePasteOverlay();

        const overlay = document.createElement('div');
        overlay.id = 'paste-overlay';
        overlay.className = 'paste-overlay';

        if (this.systemClipboard.type === 'image') {
            // Image preview
            const img = document.createElement('img');
            img.src = this.systemClipboard.dataUrl;
            img.className = 'paste-preview-image';

            const label = document.createElement('div');
            label.className = 'paste-label';
            label.innerHTML = `
                <span class="paste-icon">📋</span>
                <span>Paste Image</span>
                <span class="paste-size">${this.systemClipboard.width}×${this.systemClipboard.height}</span>
            `;

            overlay.appendChild(img);
            overlay.appendChild(label);
        } else if (this.systemClipboard.type === 'text') {
            // Text preview
            const preview = document.createElement('div');
            preview.className = 'paste-preview-text';
            preview.textContent = this.systemClipboard.content.substring(0, 100) +
                (this.systemClipboard.content.length > 100 ? '...' : '');

            const label = document.createElement('div');
            label.className = 'paste-label';
            label.innerHTML = `
                <span class="paste-icon">📋</span>
                <span>Paste Text</span>
            `;

            overlay.appendChild(preview);
            overlay.appendChild(label);
        }

        // Position the overlay
        overlay.style.left = x + 'px';
        overlay.style.top = y + 'px';

        // Click to paste
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
            this.pasteFromSystemClipboard(x, y);
            this.hidePasteOverlay();
        });

        this.app.appendChild(overlay);
        this.pasteOverlayVisible = true;

        // Auto-hide after a delay if not clicked
        setTimeout(() => {
            if (this.pasteOverlayVisible) {
                this.hidePasteOverlay();
            }
        }, 5000);
    }

    hidePasteOverlay() {
        const overlay = document.getElementById('paste-overlay');
        if (overlay) {
            overlay.remove();
        }
        this.pasteOverlayVisible = false;
    }

    pasteFromSystemClipboard(x, y) {
        if (!this.systemClipboard) return;

        if (this.systemClipboard.type === 'image') {
            this.pasteImage(this.systemClipboard.dataUrl, x, y,
                this.systemClipboard.width, this.systemClipboard.height);
        } else if (this.systemClipboard.type === 'text') {
            this.pasteText(this.systemClipboard.content, x, y);
        }
    }

    pasteImage(dataUrl, x, y, width, height) {
        // Scale down if too large
        const maxSize = 400;
        let displayWidth = width;
        let displayHeight = height;

        if (width > maxSize || height > maxSize) {
            const scale = Math.min(maxSize / width, maxSize / height);
            displayWidth = width * scale;
            displayHeight = height * scale;
        }

        // Create image element
        const id = Date.now().toString();
        const imageItem = document.createElement('div');
        imageItem.className = 'pasted-image';
        imageItem.dataset.id = id;
        imageItem.style.left = (x / this.zoomLevel) + 'px';
        imageItem.style.top = (y / this.zoomLevel) + 'px';
        imageItem.style.width = displayWidth + 'px';
        imageItem.style.height = displayHeight + 'px';

        const img = document.createElement('img');
        img.src = dataUrl;
        img.draggable = false;

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'image-delete-btn';
        deleteBtn.innerHTML = '✕';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteImage(id);
        });

        // Resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'image-resize-handle';

        imageItem.appendChild(img);
        imageItem.appendChild(deleteBtn);
        imageItem.appendChild(resizeHandle);
        this.textContainer.appendChild(imageItem);

        // Store reference
        this.images.push({
            id,
            x: x / this.zoomLevel,
            y: y / this.zoomLevel,
            width: displayWidth,
            height: displayHeight,
            dataUrl
        });

        // Setup drag for image
        this.setupImageDrag(imageItem, id);
        this.setupImageResize(imageItem, id, resizeHandle);
        this.saveState();
    }

    setupImageDrag(element, id) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        element.addEventListener('mousedown', (e) => {
            if (e.target.closest('.image-delete-btn') || e.target.closest('.image-resize-handle')) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseInt(element.style.left);
            initialY = parseInt(element.style.top);
            element.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = (e.clientX - startX) / this.zoomLevel;
            const dy = (e.clientY - startY) / this.zoomLevel;

            element.style.left = (initialX + dx) + 'px';
            element.style.top = (initialY + dy) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'grab';

                // Update stored position
                const imageData = this.images.find(i => i.id === id);
                if (imageData) {
                    imageData.x = parseInt(element.style.left);
                    imageData.y = parseInt(element.style.top);
                }
            }
        });
    }

    setupImageResize(element, id, handle) {
        let isResizing = false;
        let startX, startY, initialWidth, initialHeight;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            initialWidth = element.offsetWidth;
            initialHeight = element.offsetHeight;
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const dx = (e.clientX - startX) / this.zoomLevel;
            const dy = (e.clientY - startY) / this.zoomLevel;

            // Maintain aspect ratio
            const scale = Math.max(dx / initialWidth, dy / initialHeight);
            const newWidth = Math.max(50, initialWidth * (1 + scale));
            const newHeight = Math.max(50, initialHeight * (1 + scale));

            element.style.width = newWidth + 'px';
            element.style.height = newHeight + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;

                // Update stored size
                const imageData = this.images.find(i => i.id === id);
                if (imageData) {
                    imageData.width = element.offsetWidth;
                    imageData.height = element.offsetHeight;
                }
            }
        });
    }

    deleteImage(id) {
        this.images = this.images.filter(i => i.id !== id);
        const element = this.textContainer.querySelector(`.pasted-image[data-id="${id}"]`);
        if (element) {
            element.remove();
        }
        this.saveState();
    }

    pasteText(text, x, y) {
        // Create a new text item at the paste location
        const id = Date.now().toString();
        const item = document.createElement('div');
        item.className = 'text-item';
        item.dataset.id = id;
        item.style.left = (x / this.zoomLevel) + 'px';
        item.style.top = (y / this.zoomLevel) + 'px';
        item.style.color = this.currentColor;

        // Add drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'text-drag-handle';
        dragHandle.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/>
            </svg>
        `;

        // Add format bar
        const formatBar = document.createElement('div');
        formatBar.className = 'text-format-bar';
        formatBar.innerHTML = `
            <button class="format-btn" data-format="bold" title="Bold">B</button>
            <button class="format-btn" data-format="italic" title="Italic">I</button>
            <button class="format-btn" data-format="underline" title="Underline">U</button>
            <button class="format-btn delete-btn" title="Delete">✕</button>
        `;

        // Create textarea with pasted text
        const textarea = document.createElement('textarea');
        textarea.className = 'text-input';
        textarea.value = text;
        textarea.style.color = this.currentColor;
        textarea.rows = 1;

        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'text-resize-handle';

        item.appendChild(dragHandle);
        item.appendChild(formatBar);
        item.appendChild(textarea);
        item.appendChild(resizeHandle);
        this.textContainer.appendChild(item);

        this.textItems.push({
            id,
            x: x / this.zoomLevel,
            y: y / this.zoomLevel,
            text,
            color: this.currentColor
        });

        // Setup event handlers
        this.setupPastedTextItem(item, id, textarea, formatBar);

        // Auto-grow
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
        this.saveState();
    }

    // Settings panel methods
    setupSettings() {
        this.settingsPanel = document.getElementById('settings-panel');
        const closeBtn = document.getElementById('settings-close');

        // Close button
        closeBtn.addEventListener('click', () => {
            this.hideSettings();
        });

        // Close on click outside
        this.settingsPanel.addEventListener('click', (e) => {
            if (e.target === this.settingsPanel) {
                this.hideSettings();
            }
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.settingsPanel.classList.contains('visible')) {
                e.preventDefault();
                this.hideSettings();
            }
        });

        // Gesture toggles
        document.getElementById('setting-pinch-zoom').addEventListener('change', (e) => {
            this.settings.pinchZoom = e.target.checked;
        });

        document.getElementById('setting-pan').addEventListener('change', (e) => {
            this.settings.pan = e.target.checked;
        });

        document.getElementById('setting-rotate').addEventListener('change', (e) => {
            this.settings.rotate = e.target.checked;
        });

        // Zoom controls toggle
        document.getElementById('setting-zoom-controls').addEventListener('change', (e) => {
            this.settings.showZoomControls = e.target.checked;
            const zoomControls = document.getElementById('zoom-controls');
            if (zoomControls) {
                zoomControls.style.display = e.target.checked ? '' : 'none';
            }
        });

        // Background mode options
        document.querySelectorAll('input[name="bg-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const mode = e.target.value;
                this.currentBgMode = mode;
                this.app.dataset.bg = mode;
                window.glassboard.setBackgroundMode(mode);
            });
        });

        // Clean slate setting
        const cleanSlateCheckbox = document.getElementById('setting-clean-slate');
        if (cleanSlateCheckbox) {
            cleanSlateCheckbox.addEventListener('change', (e) => {
                this.settings.openWithCleanSlate = e.target.checked;
                this.autoSave();
            });
        }
    }

    toggleSettings() {
        if (this.settingsPanel.classList.contains('visible')) {
            this.hideSettings();
        } else {
            this.showSettings();
        }
    }

    showSettings() {
        this.settingsPanel.classList.add('visible');
    }

    hideSettings() {
        this.settingsPanel.classList.remove('visible');
    }

    // Trackpad gesture support
    setupGestures() {
        // Pinch-to-zoom via wheel event (trackpad sends wheel events with ctrlKey)
        this.app.addEventListener('wheel', (e) => {
            // Pinch-to-zoom (trackpad sends ctrlKey with pinch)
            if (e.ctrlKey && this.settings.pinchZoom) {
                e.preventDefault();
                const delta = -e.deltaY * 0.01;
                const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + delta));
                this.zoomLevel = newZoom;
                this.applyTransform();
                return;
            }

            // Two-finger pan (no modifier key)
            if (this.settings.pan && !e.ctrlKey && !e.metaKey) {
                // Only pan if not drawing
                if (this.isDrawing) return;

                e.preventDefault();
                this.panX -= e.deltaX;
                this.panY -= e.deltaY;
                this.applyTransform();
            }
        }, { passive: false });

        // Safari/WebKit gesture events for pinch and rotate
        this.app.addEventListener('gesturestart', (e) => {
            e.preventDefault();
            this.gestureStartZoom = this.zoomLevel;
            this.gestureStartRotation = this.rotation;
        });

        this.app.addEventListener('gesturechange', (e) => {
            e.preventDefault();

            // Pinch-to-zoom
            if (this.settings.pinchZoom) {
                const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.gestureStartZoom * e.scale));
                this.zoomLevel = newZoom;
            }

            // Rotation
            if (this.settings.rotate) {
                this.rotation = this.gestureStartRotation + e.rotation;
            }

            this.applyTransform();
        });

        this.app.addEventListener('gestureend', (e) => {
            e.preventDefault();
        });

        // Double-tap to reset (via double-click)
        let lastTap = 0;
        this.app.addEventListener('click', (e) => {
            const now = Date.now();
            if (now - lastTap < 300) {
                // Double-tap detected - reset transform
                this.resetTransform();
            }
            lastTap = now;
        });
    }

    // Undo/Redo functionality
    saveState() {
        if (this.isUndoRedoAction) return;

        // Create a snapshot of current state
        const state = {
            lines: JSON.parse(JSON.stringify(this.lines)),
            textItems: this.textItems.map(t => ({ ...t })),
            images: this.images.map(i => ({ ...i }))
        };

        // Remove any states after current index (new branch)
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add new state
        this.history.push(state);
        this.historyIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }

        // Trigger auto-save
        this.autoSave();
    }

    undo() {
        if (this.historyIndex <= 0) return;

        this.isUndoRedoAction = true;
        this.historyIndex--;
        this.restoreState(this.history[this.historyIndex]);
        this.isUndoRedoAction = false;
        this.autoSave();
    }

    redo() {
        if (this.historyIndex >= this.history.length - 1) return;

        this.isUndoRedoAction = true;
        this.historyIndex++;
        this.restoreState(this.history[this.historyIndex]);
        this.isUndoRedoAction = false;
        this.autoSave();
    }

    restoreState(state) {
        // Restore lines
        this.lines = JSON.parse(JSON.stringify(state.lines));

        // Clear and restore text items
        this.textContainer.querySelectorAll('.text-item').forEach(el => el.remove());
        this.textItems = [];
        state.textItems.forEach(item => {
            this.restoreTextItem(item);
        });

        // Clear and restore images
        this.textContainer.querySelectorAll('.pasted-image').forEach(el => el.remove());
        this.images = [];
        state.images.forEach(img => {
            this.restoreImage(img);
        });

        this.redraw();
    }

    restoreTextItem(item) {
        const element = document.createElement('div');
        element.className = 'text-item';
        element.dataset.id = item.id;
        element.style.left = item.x + 'px';
        element.style.top = item.y + 'px';
        element.style.color = item.color;
        if (item.width) element.style.width = item.width + 'px';

        const dragHandle = document.createElement('div');
        dragHandle.className = 'text-drag-handle';
        dragHandle.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/></svg>`;

        const formatBar = document.createElement('div');
        formatBar.className = 'text-format-bar';
        formatBar.innerHTML = `
            <button class="format-btn" data-format="bold" title="Bold">B</button>
            <button class="format-btn" data-format="italic" title="Italic">I</button>
            <button class="format-btn" data-format="underline" title="Underline">U</button>
            <button class="format-btn delete-btn" title="Delete">✕</button>
        `;

        const textarea = document.createElement('textarea');
        textarea.className = 'text-input';
        textarea.value = item.text;
        textarea.style.color = item.color;
        textarea.rows = 1;

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'text-resize-handle';

        element.appendChild(dragHandle);
        element.appendChild(formatBar);
        element.appendChild(textarea);
        element.appendChild(resizeHandle);
        this.textContainer.appendChild(element);

        this.textItems.push({ ...item });
        this.setupPastedTextItem(element, item.id, textarea, formatBar);

        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    restoreImage(img) {
        const imageItem = document.createElement('div');
        imageItem.className = 'pasted-image';
        imageItem.dataset.id = img.id;
        imageItem.style.left = img.x + 'px';
        imageItem.style.top = img.y + 'px';
        imageItem.style.width = img.width + 'px';
        imageItem.style.height = img.height + 'px';

        const imgEl = document.createElement('img');
        imgEl.src = img.dataUrl;
        imgEl.draggable = false;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'image-delete-btn';
        deleteBtn.innerHTML = '✕';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteImage(img.id);
        });

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'image-resize-handle';

        imageItem.appendChild(imgEl);
        imageItem.appendChild(deleteBtn);
        imageItem.appendChild(resizeHandle);
        this.textContainer.appendChild(imageItem);

        this.images.push({ ...img });
        this.setupImageDrag(imageItem, img.id);
        this.setupImageResize(imageItem, img.id, resizeHandle);
    }

    // Smart paste - checks system clipboard first, then internal clipboard
    smartPaste() {
        // Check system clipboard first
        this.checkSystemClipboard();

        if (this.systemClipboard) {
            // Paste from system clipboard at center of canvas
            const rect = this.app.getBoundingClientRect();
            const x = rect.width / 2;
            const y = rect.height / 2;
            this.pasteFromSystemClipboard(x, y);
            this.saveState();
        } else if (this.clipboard) {
            // Paste from internal clipboard
            this.paste();
            this.saveState();
        }
    }

    // Data persistence
    autoSave() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveData();
        }, 1000); // Debounce saves to 1 second
    }

    async saveData() {
        const data = {
            notes: this.notes,
            currentNoteIndex: this.currentNoteIndex,
            settings: this.settings,
            transform: {
                zoomLevel: this.zoomLevel,
                panX: this.panX,
                panY: this.panY,
                rotation: this.rotation
            }
        };

        try {
            await window.glassboard.saveData(data);
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    async loadSavedData() {
        try {
            const result = await window.glassboard.loadData();
            if (result.success && result.data) {
                const data = result.data;

                // Restore settings first
                if (data.settings) {
                    this.settings = { ...this.settings, ...data.settings };
                    // Update settings UI
                    document.getElementById('setting-pinch-zoom').checked = this.settings.pinchZoom;
                    document.getElementById('setting-pan').checked = this.settings.pan;
                    document.getElementById('setting-rotate').checked = this.settings.rotate;
                    document.getElementById('setting-zoom-controls').checked = this.settings.showZoomControls;
                    const cleanSlateCheckbox = document.getElementById('setting-clean-slate');
                    if (cleanSlateCheckbox) {
                        cleanSlateCheckbox.checked = this.settings.openWithCleanSlate;
                    }
                    const zoomControls = document.getElementById('zoom-controls');
                    if (zoomControls) {
                        zoomControls.style.display = this.settings.showZoomControls ? '' : 'none';
                    }
                }

                // Check if we should open with clean slate
                if (this.settings.openWithCleanSlate) {
                    // Keep the notes but create/go to a new blank note
                    if (data.notes && data.notes.length > 0) {
                        this.notes = data.notes;
                        this.notes.push(this.createEmptyNote());
                        this.currentNoteIndex = this.notes.length - 1;
                    }
                    // Don't restore transform - start fresh
                    this.redraw();
                    this.saveState();
                    return;
                }

                // Restore notes (new multi-note format)
                if (data.notes && data.notes.length > 0) {
                    this.notes = data.notes;
                    this.currentNoteIndex = data.currentNoteIndex || 0;

                    // Make sure index is valid
                    if (this.currentNoteIndex >= this.notes.length) {
                        this.currentNoteIndex = this.notes.length - 1;
                    }

                    // Load current note display
                    this.loadCurrentNote();
                }
                // Legacy format support (single note)
                else if (data.lines || data.textItems || data.images) {
                    // Migrate old format to new format
                    this.notes = [{
                        id: Date.now().toString(),
                        lines: data.lines || [],
                        textItems: data.textItems || [],
                        images: data.images || [],
                        createdAt: Date.now(),
                        lastModified: Date.now()
                    }];
                    this.currentNoteIndex = 0;
                    this.loadCurrentNote();
                }

                // Restore transform
                if (data.transform) {
                    this.zoomLevel = data.transform.zoomLevel || 1;
                    this.panX = data.transform.panX || 0;
                    this.panY = data.transform.panY || 0;
                    this.rotation = data.transform.rotation || 0;
                    this.applyTransform();
                }

                // Initialize history with loaded state
                this.saveState();
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    setupLeftResize() {
        const handle = document.getElementById('left-resize-handle');
        if (!handle) return;

        let isResizing = false;
        let startX = 0;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.screenX;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const deltaX = e.screenX - startX;
            if (deltaX !== 0) {
                window.glassboard.resizeWindowLeft(deltaX);
                startX = e.screenX;
            }
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
    }

    // Select all items
    selectAll() {
        // Select all drawn objects (by selecting the most recent object group)
        const objectIds = [...new Set(this.lines.map(l => l.objectId))];
        this.selectedObjects = objectIds;

        // Select all text items
        this.textItems.forEach(item => {
            const element = this.textContainer.querySelector(`[data-id="${item.id}"]`);
            if (element) {
                element.classList.add('selected');
            }
        });

        // Select all images
        this.images.forEach(img => {
            const element = this.textContainer.querySelector(`.pasted-image[data-id="${img.id}"]`);
            if (element) {
                element.classList.add('selected');
            }
        });

        this.allSelected = true;
    }

    // Delete all selected items
    deleteAllSelected() {
        if (!this.allSelected) return;

        // Delete all lines
        this.lines = [];

        // Delete all text items
        this.textContainer.querySelectorAll('.text-item').forEach(el => el.remove());
        this.textItems = [];

        // Delete all images
        this.textContainer.querySelectorAll('.pasted-image').forEach(el => el.remove());
        this.images = [];

        this.allSelected = false;
        this.selectedObjectId = null;
        this.selectedTextId = null;

        this.redraw();
        this.saveState();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Glassboard();
});
