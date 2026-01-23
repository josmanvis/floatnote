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

        // Shape drawing state
        this.currentShape = null;       // 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' | null
        this.isShapeMode = false;
        this.shapeStartPoint = null;    // {x, y} where drag started
        this.shapePreviewLine = null;   // Preview line during drag

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

        // Freeze state (locks pan/zoom/rotation)
        this.frozen = false;

        // Settings
        this.settings = {
            pinchZoom: true,
            pan: true,
            rotate: true,
            showZoomControls: true,
            openWithCleanSlate: false,
            activeOpacity: 10,
            inactiveOpacity: 10,
            autoSaveToFolder: false,
            hideUnfocusedBorder: false
        };

        // Selection rectangle state
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionRect = document.getElementById('selection-rect');

        // Multi-selection state
        this.multiSelectedObjects = [];

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
        this.setupFreezeToggle();
        this.setupFileDrop();

        // Initialize with empty note if needed
        if (this.notes.length === 0) {
            this.notes.push(this.createEmptyNote());
        }

        // Load saved data
        this.loadSavedData();

        // Setup left edge resize
        this.setupLeftResize();

        // Setup pagination controls
        this.setupPagination();

        // Setup window toggle handler for clean slate
        this.setupWindowToggleHandler();
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

    get attachments() {
        return this.notes[this.currentNoteIndex]?.attachments || [];
    }
    set attachments(value) {
        if (this.notes[this.currentNoteIndex]) {
            this.notes[this.currentNoteIndex].attachments = value;
        }
    }

    createEmptyNote() {
        // Get viewport dimensions for origin calculation
        const rect = this.canvas?.getBoundingClientRect() || { width: 800, height: 600 };
        const zoom = this.zoomLevel || 1;
        return {
            id: Date.now().toString(),
            lines: [],
            textItems: [],
            images: [],
            attachments: [],
            // Store the origin point in content-space (center of viewport when note was created)
            originX: (rect.width / 2) / zoom,
            originY: (rect.height / 2) / zoom,
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
        // Update pagination counter
        this.updatePaginationCounter();

        // Show temporary indicator
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
            this.isShapeMode = false;
            this.currentShape = null;

            // Update button states
            selectModeBtn.classList.toggle('active', mode === 'select');
            drawModeBtn.classList.toggle('active', mode === 'draw');
            textModeBtn.classList.toggle('active', mode === 'text');

            // Deactivate shape mode
            const shapeToggleBtn = document.getElementById('shape-toggle');
            if (shapeToggleBtn) shapeToggleBtn.classList.remove('active');
            document.querySelectorAll('.shape-option').forEach(b => b.classList.remove('active'));

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

        // Shape tool dropdown
        const shapeToggle = document.getElementById('shape-toggle');
        const shapeOptions = document.querySelectorAll('.shape-option');

        shapeOptions.forEach(btn => {
            btn.addEventListener('click', () => {
                shapeOptions.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentShape = btn.dataset.shape;
                this.isShapeMode = true;
                // Activate shape mode (similar to draw mode but with shape behavior)
                this.isSelectMode = false;
                this.isTextMode = false;
                selectModeBtn.classList.remove('active');
                drawModeBtn.classList.remove('active');
                textModeBtn.classList.remove('active');
                shapeToggle.classList.add('active');
                this.canvas.style.pointerEvents = 'auto';
                this.canvas.style.cursor = 'crosshair';
                this.textContainer.style.pointerEvents = 'none';
            });
        });

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
                this.animatePinIcon();
            });
        }
    }

    togglePin() {
        const pinCheckbox = document.getElementById('pin-checkbox');
        if (pinCheckbox) {
            pinCheckbox.checked = !pinCheckbox.checked;
            window.glassboard.setPinned(pinCheckbox.checked);
            this.animatePinIcon();
        }
    }

    setupFreezeToggle() {
        const freezeBtn = document.getElementById('freeze-btn');
        if (freezeBtn) {
            freezeBtn.addEventListener('click', () => {
                this.toggleFreeze();
            });
        }
    }

    toggleFreeze() {
        this.frozen = !this.frozen;
        const freezeBtn = document.getElementById('freeze-btn');
        if (freezeBtn) {
            freezeBtn.classList.toggle('active', this.frozen);
        }
        this.autoSave();
    }

    animatePinIcon() {
        const pinToggle = document.querySelector('.pin-toggle');
        if (pinToggle) {
            pinToggle.classList.add('animate');
            setTimeout(() => {
                pinToggle.classList.remove('animate');
            }, 400);
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

    updateSizeDropdown(size) {
        const sizeItems = document.querySelectorAll('.dropdown-item[data-size]');
        sizeItems.forEach(item => {
            item.classList.toggle('active', item.dataset.size === size);
        });
    }

    createZoomControls() {
        const zoomControls = document.createElement('div');
        zoomControls.id = 'zoom-controls';
        zoomControls.innerHTML = `
            <button class="zoom-btn" id="zoom-out" title="Zoom out (Cmd+-)">−</button>
            <span id="zoom-indicator">100%</span>
            <button class="zoom-btn" id="zoom-in" title="Zoom in (Cmd++)">+</button>
            <button class="zoom-btn" id="zoom-reset" title="Reset view (Cmd+0)">⟲</button>
        `;
        this.app.appendChild(zoomControls);

        document.getElementById('zoom-out').addEventListener('click', () => { if (!this.frozen) this.zoomOut(); });
        document.getElementById('zoom-in').addEventListener('click', () => { if (!this.frozen) this.zoomIn(); });
        document.getElementById('zoom-reset').addEventListener('click', () => { if (!this.frozen) this.resetTransform(); });
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

            // Shape mode: start shape drawing
            if (this.isShapeMode && this.currentShape) {
                this.isDrawing = true;
                this.app.classList.add('drawing');
                this.shapeStartPoint = point;
                // Create a preview line that will be updated during drag
                const now = Date.now();
                this.currentObjectId = now.toString();
                this.shapePreviewLine = {
                    points: [point],
                    color: this.currentColor,
                    width: this.currentStrokeWidth,
                    objectId: this.currentObjectId,
                    tool: this.currentShape
                };
                this.currentLine = this.shapePreviewLine;
                return;
            }

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
            this.clearMultiSelection();

            // In select mode, start drag-box selection
            if (this.isSelectMode) {
                this.isSelecting = true;
                this.selectionStart = point;
                this.selectionRect.style.left = point.x + 'px';
                this.selectionRect.style.top = point.y + 'px';
                this.selectionRect.style.width = '0px';
                this.selectionRect.style.height = '0px';
                this.selectionRect.classList.add('active');
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

            // Shape mode: update preview
            if (this.isShapeMode && this.isDrawing && this.shapeStartPoint) {
                const shapePoints = this.generateShapePoints(this.currentShape, this.shapeStartPoint, point);
                this.shapePreviewLine.points = shapePoints;
                this.currentLine = this.shapePreviewLine;
                this.redraw();
                return;
            }

            // Handle drag-box selection
            if (this.isSelecting && this.selectionStart) {
                const x = Math.min(point.x, this.selectionStart.x);
                const y = Math.min(point.y, this.selectionStart.y);
                const width = Math.abs(point.x - this.selectionStart.x);
                const height = Math.abs(point.y - this.selectionStart.y);
                this.selectionRect.style.left = x + 'px';
                this.selectionRect.style.top = y + 'px';
                this.selectionRect.style.width = width + 'px';
                this.selectionRect.style.height = height + 'px';
                return;
            }

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

        const stopDrawing = (e) => {
            // Shape mode: finalize shape
            if (this.isShapeMode && this.isDrawing && this.shapeStartPoint) {
                this.isDrawing = false;
                this.app.classList.remove('drawing');
                if (this.shapePreviewLine && this.shapePreviewLine.points.length > 1) {
                    this.lines.push(this.shapePreviewLine);
                    this.saveState();
                }
                this.shapePreviewLine = null;
                this.shapeStartPoint = null;
                this.currentLine = null;
                return;
            }

            // Handle drag-box selection completion
            if (this.isSelecting) {
                this.isSelecting = false;
                this.selectionRect.classList.remove('active');

                if (this.selectionStart) {
                    const point = e ? getPoint(e) : this.selectionStart;
                    const rect = {
                        x: Math.min(point.x, this.selectionStart.x),
                        y: Math.min(point.y, this.selectionStart.y),
                        width: Math.abs(point.x - this.selectionStart.x),
                        height: Math.abs(point.y - this.selectionStart.y)
                    };
                    this.selectObjectsInRect(rect);
                }
                this.selectionStart = null;
                return;
            }

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

    // Determine shape type from a line object
    getShapeType(line) {
        if (line.tool) return line.tool;
        // Heuristic fallback: infer from points array
        const pts = line.points;
        if (!pts || pts.length === 0) return 'freehand';
        if (pts.length >= 60) return 'circle';
        if (pts.length === 5 && Math.abs(pts[0].x - pts[4].x) < 1 && Math.abs(pts[0].y - pts[4].y) < 1) return 'rectangle';
        if (pts.length === 4 && Math.abs(pts[0].x - pts[3].x) < 1 && Math.abs(pts[0].y - pts[3].y) < 1) return 'triangle';
        if (pts.length === 2) return 'line';
        if (pts.length === 5 && !(Math.abs(pts[0].x - pts[4].x) < 1 && Math.abs(pts[0].y - pts[4].y) < 1)) return 'arrow';
        return 'freehand';
    }

    // Check if a point is inside a closed shape's fill area
    isPointInsideShape(point, line) {
        const shapeType = this.getShapeType(line);

        if (shapeType === 'circle') {
            // Ellipse: compute center and radii from bounding box
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of line.points) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;
            const rx = (maxX - minX) / 2;
            const ry = (maxY - minY) / 2;
            if (rx === 0 || ry === 0) return false;
            const dx = (point.x - cx) / rx;
            const dy = (point.y - cy) / ry;
            return (dx * dx + dy * dy) <= 1;
        }

        if (shapeType === 'rectangle' || shapeType === 'triangle') {
            // Ray casting point-in-polygon
            const vertices = line.points.slice(0, -1); // exclude closing duplicate
            let inside = false;
            for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
                if ((vertices[i].y > point.y) !== (vertices[j].y > point.y) &&
                    point.x < (vertices[j].x - vertices[i].x) * (point.y - vertices[i].y) / (vertices[j].y - vertices[i].y) + vertices[i].x) {
                    inside = !inside;
                }
            }
            return inside;
        }

        // Lines, arrows, freehand: no fill area
        return false;
    }

    // Find which object (if any) is at the given point
    findObjectAtPoint(point) {
        const hitRadius = 10; // pixels tolerance for clicking

        for (let i = this.lines.length - 1; i >= 0; i--) {
            const line = this.lines[i];

            // In select mode, check fill-area detection for closed shapes first
            if (this.isSelectMode && this.isPointInsideShape(point, line)) {
                return line.objectId;
            }

            // Fallback: point proximity to stroke
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

    // Select all objects within a rectangle
    selectObjectsInRect(rect) {
        const selectedIds = new Set();

        // Find all objects with points inside the rectangle
        this.lines.forEach(line => {
            for (const p of line.points) {
                if (p.x >= rect.x && p.x <= rect.x + rect.width &&
                    p.y >= rect.y && p.y <= rect.y + rect.height) {
                    selectedIds.add(line.objectId);
                    break;
                }
            }
        });

        this.multiSelectedObjects = Array.from(selectedIds);

        // If only one object, use single selection
        if (this.multiSelectedObjects.length === 1) {
            this.selectObject(this.multiSelectedObjects[0]);
            this.multiSelectedObjects = [];
        } else if (this.multiSelectedObjects.length > 1) {
            this.redraw();
        }
    }

    // Clear multi-selection
    clearMultiSelection() {
        this.multiSelectedObjects = [];
        this.redraw();
    }

    // Check if object is in multi-selection
    isObjectMultiSelected(objectId) {
        return this.multiSelectedObjects.includes(objectId);
    }

    // Setup pagination controls
    setupPagination() {
        const prevBtn = document.getElementById('prev-note');
        const nextBtn = document.getElementById('next-note');
        const newNoteBtn = document.getElementById('new-note');
        const counter = document.getElementById('note-counter');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousNote());
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextNote());
        }
        if (newNoteBtn) {
            newNoteBtn.addEventListener('click', () => this.createNewNoteAndSwitch());
        }

        // Update counter display
        this.updatePaginationCounter();
    }

    // Create a new note and switch to it
    createNewNoteAndSwitch() {
        this.saveCurrentNoteState();
        this.notes.push(this.createEmptyNote());
        this.currentNoteIndex = this.notes.length - 1;
        this.loadCurrentNote();
        this.updateNoteIndicator();
        this.updatePaginationCounter();
    }

    // Update pagination counter display
    updatePaginationCounter() {
        const counter = document.getElementById('note-counter');
        if (counter) {
            counter.textContent = `${this.currentNoteIndex + 1}/${this.notes.length}`;
        }

        // Update button states
        const prevBtn = document.getElementById('prev-note');
        const nextBtn = document.getElementById('next-note');
        if (prevBtn) {
            prevBtn.disabled = this.currentNoteIndex === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = false; // Always enabled (creates new note)
        }
    }

    // Handle window toggle for clean slate mode
    setupWindowToggleHandler() {
        if (window.glassboard?.onWindowToggledOpen) {
            window.glassboard.onWindowToggledOpen(() => {
                this.handleWindowToggledOpen();
            });
        }
    }

    handleWindowToggledOpen() {
        // Only activate clean slate behavior if setting is enabled
        if (!this.settings.openWithCleanSlate) {
            return;
        }

        // Create a new blank note
        this.notes.push(this.createEmptyNote());
        this.currentNoteIndex = this.notes.length - 1;
        this.updatePaginationCounter();
        this.redraw();

        // Switch to text mode
        this.setMode('text');

        // Create a text item at top-left (under window controls)
        // Position: x=20 (left margin), y=50 (below toolbar)
        const x = 20;
        const y = 50;
        this.createTextItem(x, y);

        // Save state
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
            const editor = element.querySelector('.text-input');
            if (editor) {
                editor.style.color = color;
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
        const editor = element?.querySelector('.text-input');

        this.clipboard = {
            type: 'text',
            data: {
                content: editor?.innerHTML || textItem.content || '',
                color: textItem.color
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
            // Apply counter-scale so text doesn't zoom
            item.style.transform = `scale(${1 / this.zoomLevel})`;
            item.style.transformOrigin = 'top left';

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

            // Create contentEditable div
            const editor = document.createElement('div');
            editor.className = 'text-input';
            editor.contentEditable = 'true';
            // Support both old 'text' and new 'content' formats
            editor.innerHTML = this.clipboard.data.content || this.clipboard.data.text || '';
            editor.style.color = this.clipboard.data.color;

            // Add resize handle
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'text-resize-handle';

            item.appendChild(dragHandle);
            item.appendChild(formatBar);
            item.appendChild(editor);
            item.appendChild(resizeHandle);
            this.textContainer.appendChild(item);

            this.textItems.push({
                id,
                x: x + pasteOffset,
                y: y + pasteOffset,
                content: this.clipboard.data.content || this.clipboard.data.text || '',
                color: this.clipboard.data.color
            });

            // Setup event handlers for the new text item
            this.setupPastedTextItem(item, id, editor, formatBar);

            // Select the pasted item
            this.deselectAllText();
            this.selectedTextId = id;
            editor.focus();
        }
    }

    // Setup event handlers for a pasted/restored text item
    setupPastedTextItem(item, id, editor, formatBar) {
        // Handle input changes
        editor.addEventListener('input', () => {
            const textItem = this.textItems.find(t => t.id === id);
            if (textItem) {
                textItem.content = editor.innerHTML;
            }
        });

        // Handle delete on empty backspace and rich text shortcuts
        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && editor.textContent.trim() === '') {
                e.preventDefault();
                this.deleteTextItem(id);
            }
            // Rich text keyboard shortcuts
            if (e.metaKey && !e.shiftKey) {
                if (e.key === 'b') {
                    e.preventDefault();
                    document.execCommand('bold', false, null);
                    this.updateFormatButtonStates(formatBar);
                } else if (e.key === 'i') {
                    e.preventDefault();
                    document.execCommand('italic', false, null);
                    this.updateFormatButtonStates(formatBar);
                } else if (e.key === 'u') {
                    e.preventDefault();
                    document.execCommand('underline', false, null);
                    this.updateFormatButtonStates(formatBar);
                }
            }
        });

        // Format button handlers - use execCommand for selection-based formatting
        formatBar.querySelectorAll('.format-btn[data-format]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const format = btn.dataset.format;
                document.execCommand(format, false, null);
                this.updateFormatButtonStates(formatBar);
            });
        });

        // Delete button handler
        formatBar.querySelector('.delete-btn').addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.deleteTextItem(id);
        });

        // Delete empty text item when clicking away
        editor.addEventListener('blur', () => {
            setTimeout(() => {
                if (editor.textContent.trim() === '') {
                    this.deleteTextItem(id);
                }
            }, 100);
        });

        // Update format button states when selection changes
        editor.addEventListener('mouseup', () => this.updateFormatButtonStates(formatBar));
        editor.addEventListener('keyup', () => this.updateFormatButtonStates(formatBar));

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
        // Apply counter-scale so text doesn't zoom
        item.style.transform = `scale(${1 / this.zoomLevel})`;
        item.style.transformOrigin = 'top left';

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

        // Use contentEditable div for rich text support
        const editor = document.createElement('div');
        editor.className = 'text-input';
        editor.contentEditable = 'true';
        editor.dataset.placeholder = 'Type here...';
        editor.style.color = this.currentColor;

        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'text-resize-handle';

        item.appendChild(dragHandle);
        item.appendChild(formatBar);
        item.appendChild(editor);
        item.appendChild(resizeHandle);
        this.textContainer.appendChild(item);

        this.textItems.push({ id, x, y, content: '', color: this.currentColor });
        this.selectedTextId = id;

        // Focus editor
        editor.focus();

        // Handle input changes
        editor.addEventListener('input', () => {
            const textItem = this.textItems.find(t => t.id === id);
            if (textItem) {
                textItem.content = editor.innerHTML;
            }
        });

        // Handle delete on empty backspace
        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && editor.textContent.trim() === '') {
                e.preventDefault();
                this.deleteTextItem(id);
            }
            // Rich text keyboard shortcuts
            if (e.metaKey && !e.shiftKey) {
                if (e.key === 'b') {
                    e.preventDefault();
                    document.execCommand('bold', false, null);
                    this.updateFormatButtonStates(formatBar);
                } else if (e.key === 'i') {
                    e.preventDefault();
                    document.execCommand('italic', false, null);
                    this.updateFormatButtonStates(formatBar);
                } else if (e.key === 'u') {
                    e.preventDefault();
                    document.execCommand('underline', false, null);
                    this.updateFormatButtonStates(formatBar);
                }
            }
        });

        // Format button handlers - use execCommand for selection-based formatting
        formatBar.querySelectorAll('.format-btn[data-format]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent focus loss
                const format = btn.dataset.format;
                document.execCommand(format, false, null);
                this.updateFormatButtonStates(formatBar);
            });
        });

        // Delete button handler
        formatBar.querySelector('.delete-btn').addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.deleteTextItem(id);
        });

        // Delete empty text item when clicking away
        editor.addEventListener('blur', () => {
            setTimeout(() => {
                if (editor.textContent.trim() === '') {
                    this.deleteTextItem(id);
                }
            }, 100); // Small delay to allow format button clicks
        });

        // Update format button states when selection changes
        editor.addEventListener('mouseup', () => this.updateFormatButtonStates(formatBar));
        editor.addEventListener('keyup', () => this.updateFormatButtonStates(formatBar));

        // Setup drag and resize
        this.setupTextItemDrag(item, id);
        this.setupTextResize(item, id, resizeHandle);

        // Select on click
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectTextItem(id);
        });
    }

    updateFormatButtonStates(formatBar) {
        // Update format button active states based on current selection
        const boldBtn = formatBar.querySelector('[data-format="bold"]');
        const italicBtn = formatBar.querySelector('[data-format="italic"]');
        const underlineBtn = formatBar.querySelector('[data-format="underline"]');

        if (boldBtn) {
            boldBtn.classList.toggle('active', document.queryCommandState('bold'));
        }
        if (italicBtn) {
            italicBtn.classList.toggle('active', document.queryCommandState('italic'));
        }
        if (underlineBtn) {
            underlineBtn.classList.toggle('active', document.queryCommandState('underline'));
        }
    }

    setupTextItemDrag(element, id) {
        let isDragging = false;
        let startX, startY, origX, origY;

        const startDrag = (e) => {
            // Don't drag from text editor, format buttons, or resize handle
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

            // Update editor width to match
            const editor = element.querySelector('.text-input');
            if (editor) {
                editor.style.width = '100%';
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
            const editor = element.querySelector('.text-input');
            if (editor) {
                editor.focus();
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

            // Cmd+N - do nothing (prevent default new window behavior)
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                return;
            }

            // Cmd+W to close window
            if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
                e.preventDefault();
                window.glassboard.closeWindow();
                return;
            }

            // Cmd+S to export as PNG
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                this.exportAsPNG();
                return;
            }

            // Cmd+, to open settings
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                this.toggleSettings();
                return;
            }

            // Cmd+P to toggle pin
            if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
                e.preventDefault();
                this.togglePin();
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
                if (!this.frozen) this.zoomIn();
                return;
            }

            // Cmd+Minus to zoom out
            if ((e.metaKey || e.ctrlKey) && e.key === '-') {
                e.preventDefault();
                if (!this.frozen) this.zoomOut();
                return;
            }

            // Cmd+0 to reset view (zoom, pan, rotation)
            if ((e.metaKey || e.ctrlKey) && e.key === '0') {
                e.preventDefault();
                if (!this.frozen) this.resetTransform();
                return;
            }

            // Escape to deselect
            if (e.key === 'Escape') {
                this.deselectObject();
                this.deselectAllText();
            }

            // Note navigation (only when not in text input)
            if (!isInTextInput) {
                // [ or ArrowLeft to go to previous note
                if (e.key === '[' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.previousNote();
                    return;
                }

                // ] or ArrowRight to go to next note or create new one
                if (e.key === ']' || e.key === 'ArrowRight') {
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
                if ((e.key === 's' || e.key === 'S') && !e.metaKey && !e.ctrlKey) {
                    if (this.currentShape) {
                        // Re-activate shape mode with last used shape
                        this.isShapeMode = true;
                        this.isSelectMode = false;
                        this.isTextMode = false;
                        const shapeToggle = document.getElementById('shape-toggle');
                        const selectModeBtn = document.getElementById('select-mode');
                        const drawModeBtn = document.getElementById('draw-mode');
                        const textModeBtn = document.getElementById('text-mode');
                        selectModeBtn.classList.remove('active');
                        drawModeBtn.classList.remove('active');
                        textModeBtn.classList.remove('active');
                        shapeToggle.classList.add('active');
                        this.canvas.style.pointerEvents = 'auto';
                        this.canvas.style.cursor = 'crosshair';
                        this.textContainer.style.pointerEvents = 'none';
                    }
                    return;
                }
                if (e.key === 'f' || e.key === 'F') {
                    this.toggleFreeze();
                    return;
                }
                // Size shortcuts: Cmd+1=sm, Cmd+2=md, Cmd+3=lg
                if (e.metaKey && e.key === '1') {
                    e.preventDefault();
                    window.glassboard.setWindowSize('sm');
                    this.updateSizeDropdown('sm');
                    return;
                }
                if (e.metaKey && e.key === '2') {
                    e.preventDefault();
                    window.glassboard.setWindowSize('md');
                    this.updateSizeDropdown('md');
                    return;
                }
                if (e.metaKey && e.key === '3') {
                    e.preventDefault();
                    window.glassboard.setWindowSize('lg');
                    this.updateSizeDropdown('lg');
                    return;
                }
                // N for new note
                if (e.key === 'n' || e.key === 'N') {
                    this.createNewNoteAndSwitch();
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
            } else {
                this.app.classList.remove('focused');
                // Deselect all text items when window loses focus
                this.deselectAllText();
            }
            this.applyBackgroundOpacity();
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

        // Counter-scale text items so they maintain visual size
        // Text items should move with pan/zoom but not change visual size
        const counterScale = 1 / this.zoomLevel;
        this.textContainer.querySelectorAll('.text-item').forEach(item => {
            item.style.transform = `scale(${counterScale})`;
            item.style.transformOrigin = 'top left';
        });

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
                    <span>Reset View</span>
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
                if (!this.frozen) this.zoomIn();
                this.hideContextMenu();
            });

            menu.querySelector('[data-action="zoom-out"]').addEventListener('click', () => {
                if (!this.frozen) this.zoomOut();
                this.hideContextMenu();
            });

            menu.querySelector('[data-action="reset-zoom"]').addEventListener('click', () => {
                if (!this.frozen) this.resetTransform();
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

        // Draw center origin dot (2x2px, zoom-independent)
        this.drawCenterDot();

        // Draw all saved lines
        this.lines.forEach(line => this.drawLine(line));

        // Draw current line
        if (this.currentLine) {
            this.drawLine(this.currentLine);
        }

        // Draw selection highlight for single selection
        if (this.selectedObjectId) {
            this.drawSelectionHighlight();
        }

        // Draw selection highlights for multi-selected objects
        if (this.multiSelectedObjects.length > 0) {
            this.multiSelectedObjects.forEach(objectId => {
                this.drawSelectionHighlightForObject(objectId);
            });
        }

        // Draw selection highlights for all-selected objects
        if (this.allSelected && this.selectedObjects.length > 0) {
            this.selectedObjects.forEach(objectId => {
                this.drawSelectionHighlightForObject(objectId);
            });
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

    generateShapePoints(shape, start, end) {
        const points = [];
        switch (shape) {
            case 'rectangle': {
                points.push(
                    { x: start.x, y: start.y },
                    { x: end.x, y: start.y },
                    { x: end.x, y: end.y },
                    { x: start.x, y: end.y },
                    { x: start.x, y: start.y } // close the rectangle
                );
                break;
            }
            case 'circle': {
                // Generate points along an ellipse
                const cx = (start.x + end.x) / 2;
                const cy = (start.y + end.y) / 2;
                const rx = Math.abs(end.x - start.x) / 2;
                const ry = Math.abs(end.y - start.y) / 2;
                const segments = 64;
                for (let i = 0; i <= segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    points.push({
                        x: cx + rx * Math.cos(angle),
                        y: cy + ry * Math.sin(angle)
                    });
                }
                break;
            }
            case 'triangle': {
                // Isoceles triangle: top-center, bottom-right, bottom-left
                const topX = (start.x + end.x) / 2;
                const topY = Math.min(start.y, end.y);
                const bottomY = Math.max(start.y, end.y);
                const leftX = Math.min(start.x, end.x);
                const rightX = Math.max(start.x, end.x);
                points.push(
                    { x: topX, y: topY },
                    { x: rightX, y: bottomY },
                    { x: leftX, y: bottomY },
                    { x: topX, y: topY } // close the triangle
                );
                break;
            }
            case 'line': {
                points.push(
                    { x: start.x, y: start.y },
                    { x: end.x, y: end.y }
                );
                break;
            }
            case 'arrow': {
                // Line with arrowhead at end
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len === 0) {
                    points.push(start, end);
                    break;
                }
                const headLen = Math.min(20, len * 0.3); // arrowhead length
                const angle = Math.atan2(dy, dx);
                const headAngle = Math.PI / 6; // 30 degrees

                // Main line
                points.push({ x: start.x, y: start.y });
                points.push({ x: end.x, y: end.y });
                // Left wing of arrowhead (pen-up simulated by returning to tip)
                points.push({
                    x: end.x - headLen * Math.cos(angle - headAngle),
                    y: end.y - headLen * Math.sin(angle - headAngle)
                });
                points.push({ x: end.x, y: end.y }); // back to tip
                // Right wing of arrowhead
                points.push({
                    x: end.x - headLen * Math.cos(angle + headAngle),
                    y: end.y - headLen * Math.sin(angle + headAngle)
                });
                break;
            }
        }
        return points;
    }

    drawCenterDot() {
        // Draw a 2x2px bright yellow dot at the note's stored origin
        // Size is compensated for zoom so it always appears 2x2px visually
        const dotSize = 2 / this.zoomLevel;

        // Get origin from current note (already in content-space)
        const note = this.notes[this.currentNoteIndex];
        const rect = this.canvas.getBoundingClientRect();
        // Fallback for notes without origin (legacy) or if note doesn't exist
        const originX = note?.originX ?? (rect.width / 2 / this.zoomLevel);
        const originY = note?.originY ?? (rect.height / 2 / this.zoomLevel);

        this.ctx.fillStyle = '#facc15'; // Bright yellow
        this.ctx.fillRect(
            originX - dotSize / 2,
            originY - dotSize / 2,
            dotSize,
            dotSize
        );
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

    // Draw selection highlight for a specific object (used for multi-select)
    drawSelectionHighlightForObject(objectId) {
        const selectedLines = this.lines.filter(l => l.objectId === objectId);
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

        // Draw selection box (green for multi-select to distinguish)
        this.ctx.strokeStyle = '#22c55e';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        this.ctx.setLineDash([]);
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

    // File drag-and-drop support
    setupFileDrop() {
        // Prevent default drag behaviors on document
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            document.addEventListener(event, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Visual feedback on dragover
        this.app.addEventListener('dragenter', () => {
            this.app.classList.add('drag-over');
        });

        this.app.addEventListener('dragleave', (e) => {
            if (!this.app.contains(e.relatedTarget)) {
                this.app.classList.remove('drag-over');
            }
        });

        // Handle drop
        this.app.addEventListener('drop', (e) => {
            this.app.classList.remove('drag-over');
            this.handleFileDrop(e);
        });
    }

    handleFileDrop(e) {
        const files = e.dataTransfer.files;
        if (!files.length) return;

        const dropX = e.clientX - this.app.getBoundingClientRect().left;
        const dropY = e.clientY - this.app.getBoundingClientRect().top;

        // Process each file
        Array.from(files).forEach((file, index) => {
            const x = dropX + (index * 20); // Offset multiple files
            const y = dropY + (index * 20);

            if (this.isImageFile(file)) {
                this.handleDroppedImage(file, x, y);
            } else {
                this.handleDroppedFile(file, x, y);
            }
        });

        this.saveState();
    }

    isImageFile(file) {
        const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
        return imageTypes.includes(file.type) || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name);
    }

    handleDroppedImage(file, x, y) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.pasteImage(e.target.result, x, y, img.width, img.height);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleDroppedFile(file, x, y) {
        const id = Date.now().toString();

        // Create attachment element
        const attachment = document.createElement('div');
        attachment.className = 'file-attachment';
        attachment.dataset.id = id;
        attachment.style.left = (x / this.zoomLevel) + 'px';
        attachment.style.top = (y / this.zoomLevel) + 'px';

        // File icon based on extension
        const icon = this.getFileIcon(file.name);

        attachment.innerHTML = `
            <div class="attachment-icon">${icon}</div>
            <div class="attachment-name" title="${file.name}">${file.name}</div>
            <button class="attachment-delete-btn">✕</button>
        `;

        this.textContainer.appendChild(attachment);

        // Store attachment data
        this.attachments.push({
            id,
            x: x / this.zoomLevel,
            y: y / this.zoomLevel,
            filePath: file.path, // Electron provides full path
            fileName: file.name,
            fileType: file.type || this.getExtension(file.name)
        });

        // Setup interactions
        this.setupAttachmentDrag(attachment, id);
        this.setupAttachmentClick(attachment, id);

        // Delete button
        attachment.querySelector('.attachment-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteAttachment(id);
        });
    }

    getFileIcon(fileName) {
        const ext = this.getExtension(fileName).toLowerCase();
        const icons = {
            pdf: '📄', doc: '📝', docx: '📝', txt: '📃',
            xls: '📊', xlsx: '📊', csv: '📊',
            ppt: '📽️', pptx: '📽️',
            zip: '🗜️', rar: '🗜️', '7z': '🗜️',
            mp3: '🎵', wav: '🎵', m4a: '🎵',
            mp4: '🎬', mov: '🎬', avi: '🎬',
            js: '📜', py: '📜', html: '📜', css: '📜',
            default: '📎'
        };
        return icons[ext] || icons.default;
    }

    getExtension(fileName) {
        return fileName.split('.').pop() || '';
    }

    setupAttachmentDrag(element, id) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('attachment-delete-btn')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseInt(element.style.left);
            initialY = parseInt(element.style.top);
            element.classList.add('dragging');
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
                element.classList.remove('dragging');
                // Update stored position
                const att = this.attachments.find(a => a.id === id);
                if (att) {
                    att.x = parseInt(element.style.left);
                    att.y = parseInt(element.style.top);
                }
            }
        });
    }

    setupAttachmentClick(element, id) {
        element.addEventListener('dblclick', () => {
            const att = this.attachments.find(a => a.id === id);
            if (att?.filePath) {
                window.glassboard.openFile(att.filePath);
            }
        });
    }

    deleteAttachment(id) {
        this.attachments = this.attachments.filter(a => a.id !== id);
        const element = this.textContainer.querySelector(`.file-attachment[data-id="${id}"]`);
        if (element) element.remove();
        this.saveState();
    }

    restoreAttachment(att) {
        const attachment = document.createElement('div');
        attachment.className = 'file-attachment';
        attachment.dataset.id = att.id;
        attachment.style.left = att.x + 'px';
        attachment.style.top = att.y + 'px';

        const icon = this.getFileIcon(att.fileName);
        attachment.innerHTML = `
            <div class="attachment-icon">${icon}</div>
            <div class="attachment-name" title="${att.fileName}">${att.fileName}</div>
            <button class="attachment-delete-btn">✕</button>
        `;

        this.textContainer.appendChild(attachment);
        this.setupAttachmentDrag(attachment, att.id);
        this.setupAttachmentClick(attachment, att.id);

        attachment.querySelector('.attachment-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteAttachment(att.id);
        });
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
        // Apply counter-scale so text doesn't zoom
        item.style.transform = `scale(${1 / this.zoomLevel})`;
        item.style.transformOrigin = 'top left';

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

        // Create contentEditable div with pasted text
        const editor = document.createElement('div');
        editor.className = 'text-input';
        editor.contentEditable = 'true';
        // Escape HTML to prevent XSS when pasting plain text
        editor.textContent = text;
        editor.style.color = this.currentColor;

        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'text-resize-handle';

        item.appendChild(dragHandle);
        item.appendChild(formatBar);
        item.appendChild(editor);
        item.appendChild(resizeHandle);
        this.textContainer.appendChild(item);

        this.textItems.push({
            id,
            x: x / this.zoomLevel,
            y: y / this.zoomLevel,
            content: editor.innerHTML,
            color: this.currentColor
        });

        // Setup event handlers
        this.setupPastedTextItem(item, id, editor, formatBar);
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
            this.autoSave();
        });

        document.getElementById('setting-pan').addEventListener('change', (e) => {
            this.settings.pan = e.target.checked;
            this.autoSave();
        });

        document.getElementById('setting-rotate').addEventListener('change', (e) => {
            this.settings.rotate = e.target.checked;
            this.autoSave();
        });

        // Zoom controls toggle
        document.getElementById('setting-zoom-controls').addEventListener('change', (e) => {
            this.settings.showZoomControls = e.target.checked;
            const zoomControls = document.getElementById('zoom-controls');
            if (zoomControls) {
                zoomControls.style.display = e.target.checked ? '' : 'none';
            }
            this.autoSave();
        });

        document.getElementById('setting-hide-unfocused-border').addEventListener('change', (e) => {
            this.settings.hideUnfocusedBorder = e.target.checked;
            if (e.target.checked) {
                this.app.classList.add('hide-unfocused-border');
            } else {
                this.app.classList.remove('hide-unfocused-border');
            }
            this.autoSave();
        });

        // Active opacity slider
        const activeOpacitySlider = document.getElementById('setting-active-opacity');
        const activeOpacityValue = document.getElementById('active-opacity-value');
        if (activeOpacitySlider) {
            activeOpacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.settings.activeOpacity = value;
                if (activeOpacityValue) {
                    activeOpacityValue.textContent = `${value}%`;
                }
                this.applyBackgroundOpacity();
                this.autoSave();
            });
        }

        // Inactive opacity slider
        const inactiveOpacitySlider = document.getElementById('setting-inactive-opacity');
        const inactiveOpacityValue = document.getElementById('inactive-opacity-value');
        if (inactiveOpacitySlider) {
            inactiveOpacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.settings.inactiveOpacity = value;
                if (inactiveOpacityValue) {
                    inactiveOpacityValue.textContent = `${value}%`;
                }
                this.applyBackgroundOpacity();
                this.autoSave();
            });
        }

        // Clean slate setting
        const cleanSlateCheckbox = document.getElementById('setting-clean-slate');
        if (cleanSlateCheckbox) {
            cleanSlateCheckbox.addEventListener('change', (e) => {
                this.settings.openWithCleanSlate = e.target.checked;
                this.autoSave();
            });
        }

        // Auto-save to folder setting
        const autoSaveFolderCheckbox = document.getElementById('setting-auto-save-folder');
        if (autoSaveFolderCheckbox) {
            autoSaveFolderCheckbox.addEventListener('change', (e) => {
                this.settings.autoSaveToFolder = e.target.checked;
                this.autoSave();
            });
        }

        // Open folder button
        const openFolderBtn = document.getElementById('open-folder-btn');
        if (openFolderBtn) {
            openFolderBtn.addEventListener('click', () => {
                this.openFloatnoteFolder();
            });
        }
    }

    // Apply background opacity based on focus state
    applyBackgroundOpacity() {
        const isFocused = this.app.classList.contains('focused');
        const opacity = isFocused ? this.settings.activeOpacity : this.settings.inactiveOpacity;
        this.app.style.setProperty('--bg-opacity', opacity / 100);
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
                if (this.frozen) return;
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
                if (this.isDrawing || this.frozen) return;

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
            if (this.frozen) return;

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
                if (!this.frozen) this.resetTransform();
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
        // Apply counter-scale so text doesn't zoom
        element.style.transform = `scale(${1 / this.zoomLevel})`;
        element.style.transformOrigin = 'top left';

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

        const editor = document.createElement('div');
        editor.className = 'text-input';
        editor.contentEditable = 'true';
        // Support both old 'text' and new 'content' formats for backwards compatibility
        editor.innerHTML = item.content || item.text || '';
        editor.style.color = item.color;

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'text-resize-handle';

        element.appendChild(dragHandle);
        element.appendChild(formatBar);
        element.appendChild(editor);
        element.appendChild(resizeHandle);
        this.textContainer.appendChild(element);

        // Normalize to new format
        const normalizedItem = { ...item, content: item.content || item.text || '' };
        delete normalizedItem.text;
        this.textItems.push(normalizedItem);
        this.setupPastedTextItem(element, item.id, editor, formatBar);
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
                rotation: this.rotation,
                frozen: this.frozen
            }
        };

        try {
            await window.glassboard.saveData(data);

            // Also save to ~/.floatnote folder if enabled
            if (this.settings.autoSaveToFolder && this.notes[this.currentNoteIndex]) {
                await window.glassboard.exportToFloatnote(this.notes[this.currentNoteIndex]);
            }
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    // Export current note as PNG
    async exportAsPNG() {
        try {
            // Create a temporary canvas to render everything
            const exportCanvas = document.createElement('canvas');
            const rect = this.canvas.getBoundingClientRect();
            exportCanvas.width = rect.width;
            exportCanvas.height = rect.height;
            const exportCtx = exportCanvas.getContext('2d');

            // Fill with transparent background
            exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);

            // Draw all lines from current note
            this.lines.forEach(line => {
                if (line.points.length < 2) return;
                exportCtx.beginPath();
                exportCtx.strokeStyle = line.color;
                exportCtx.lineWidth = line.width;
                exportCtx.lineCap = 'round';
                exportCtx.lineJoin = 'round';
                exportCtx.moveTo(line.points[0].x, line.points[0].y);
                for (let i = 1; i < line.points.length; i++) {
                    exportCtx.lineTo(line.points[i].x, line.points[i].y);
                }
                exportCtx.stroke();
            });

            // Draw text items
            this.textItems.forEach(item => {
                const element = this.textContainer.querySelector(`[data-id="${item.id}"]`);
                if (element) {
                    const editor = element.querySelector('.text-input');
                    if (editor && editor.textContent) {
                        exportCtx.font = '16px system-ui, -apple-system, sans-serif';
                        exportCtx.fillStyle = item.color;
                        const lines = editor.textContent.split('\n');
                        lines.forEach((line, i) => {
                            exportCtx.fillText(line, item.x, item.y + 20 + (i * 20));
                        });
                    }
                }
            });

            // Draw images
            for (const img of this.images) {
                const imgElement = document.querySelector(`.pasted-image[data-id="${img.id}"] img`);
                if (imgElement) {
                    exportCtx.drawImage(imgElement, img.x, img.y, img.width, img.height);
                }
            }

            // Get data URL and export
            const dataUrl = exportCanvas.toDataURL('image/png');
            const result = await window.glassboard.exportPNG(dataUrl);

            if (result.success) {
                console.log('Exported to:', result.path);
            }
        } catch (error) {
            console.error('Failed to export PNG:', error);
        }
    }

    // Open ~/.floatnote folder in Finder
    async openFloatnoteFolder() {
        try {
            await window.glassboard.openFloatnoteFolder();
        } catch (error) {
            console.error('Failed to open folder:', error);
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
                    const autoSaveFolderCheckbox = document.getElementById('setting-auto-save-folder');
                    if (autoSaveFolderCheckbox) {
                        autoSaveFolderCheckbox.checked = this.settings.autoSaveToFolder || false;
                    }
                    const zoomControls = document.getElementById('zoom-controls');
                    if (zoomControls) {
                        zoomControls.style.display = this.settings.showZoomControls ? '' : 'none';
                    }
                    const hideUnfocusedBorderCheckbox = document.getElementById('setting-hide-unfocused-border');
                    if (hideUnfocusedBorderCheckbox) {
                        hideUnfocusedBorderCheckbox.checked = this.settings.hideUnfocusedBorder || false;
                    }
                    if (this.settings.hideUnfocusedBorder) {
                        this.app.classList.add('hide-unfocused-border');
                    }

                    // Restore opacity settings
                    const activeOpacitySlider = document.getElementById('setting-active-opacity');
                    const activeOpacityValue = document.getElementById('active-opacity-value');
                    if (activeOpacitySlider) {
                        activeOpacitySlider.value = this.settings.activeOpacity || 10;
                        if (activeOpacityValue) activeOpacityValue.textContent = `${this.settings.activeOpacity || 10}%`;
                    }

                    const inactiveOpacitySlider = document.getElementById('setting-inactive-opacity');
                    const inactiveOpacityValue = document.getElementById('inactive-opacity-value');
                    if (inactiveOpacitySlider) {
                        inactiveOpacitySlider.value = this.settings.inactiveOpacity || 10;
                        if (inactiveOpacityValue) inactiveOpacityValue.textContent = `${this.settings.inactiveOpacity || 10}%`;
                    }

                    this.applyBackgroundOpacity();
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
                    this.frozen = data.transform.frozen || false;
                    this.applyTransform();
                    document.getElementById('freeze-btn')?.classList.toggle('active', this.frozen);
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
        // Redraw to show selection highlights on drawn objects
        this.redraw();
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
    const glassboard = new Glassboard();
    // Expose instance for E2E testing (harmless in production - nothing reads it)
    window.glassboardInstance = glassboard;
});
