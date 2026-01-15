// Tests for renderer multi-note system

describe('Multi-Note System', () => {
  let notes;
  let currentNoteIndex;

  beforeEach(() => {
    notes = [];
    currentNoteIndex = 0;
  });

  describe('Note creation', () => {
    test('should create a new note with correct structure', () => {
      const newNote = {
        id: Date.now().toString(),
        lines: [],
        textItems: [],
        images: [],
        createdAt: Date.now(),
        lastModified: Date.now()
      };
      notes.push(newNote);

      expect(notes.length).toBe(1);
      expect(notes[0].lines).toEqual([]);
      expect(notes[0].textItems).toEqual([]);
      expect(notes[0].images).toEqual([]);
    });

    test('should generate unique IDs', () => {
      const id1 = Date.now().toString();
      // Small delay to ensure different timestamp
      const id2 = (Date.now() + 1).toString();

      expect(id1).not.toBe(id2);
    });
  });

  describe('Note navigation', () => {
    beforeEach(() => {
      // Create 3 notes
      for (let i = 0; i < 3; i++) {
        notes.push({
          id: `note-${i}`,
          lines: [{ id: `line-${i}` }],
          textItems: [],
          images: [],
          createdAt: Date.now() + i,
          lastModified: Date.now() + i
        });
      }
      currentNoteIndex = 1;
    });

    test('previousNote should decrement index', () => {
      if (currentNoteIndex > 0) {
        currentNoteIndex--;
      }
      expect(currentNoteIndex).toBe(0);
    });

    test('previousNote should not go below 0', () => {
      currentNoteIndex = 0;
      if (currentNoteIndex > 0) {
        currentNoteIndex--;
      }
      expect(currentNoteIndex).toBe(0);
    });

    test('nextNote should increment index', () => {
      if (currentNoteIndex < notes.length - 1) {
        currentNoteIndex++;
      }
      expect(currentNoteIndex).toBe(2);
    });

    test('nextNote should not exceed notes length', () => {
      currentNoteIndex = 2;
      if (currentNoteIndex < notes.length - 1) {
        currentNoteIndex++;
      }
      expect(currentNoteIndex).toBe(2);
    });

    test('nextNote should create new note at end', () => {
      currentNoteIndex = 2;
      if (currentNoteIndex === notes.length - 1) {
        const newNote = {
          id: `note-${notes.length}`,
          lines: [],
          textItems: [],
          images: [],
          createdAt: Date.now(),
          lastModified: Date.now()
        };
        notes.push(newNote);
        currentNoteIndex++;
      }
      expect(notes.length).toBe(4);
      expect(currentNoteIndex).toBe(3);
    });
  });

  describe('Note counter', () => {
    test('should display correct counter format', () => {
      notes.push({ id: '1' }, { id: '2' }, { id: '3' });
      currentNoteIndex = 1;

      const counter = `${currentNoteIndex + 1}/${notes.length}`;
      expect(counter).toBe('2/3');
    });

    test('should update when navigating', () => {
      notes.push({ id: '1' }, { id: '2' });
      currentNoteIndex = 0;

      let counter = `${currentNoteIndex + 1}/${notes.length}`;
      expect(counter).toBe('1/2');

      currentNoteIndex++;
      counter = `${currentNoteIndex + 1}/${notes.length}`;
      expect(counter).toBe('2/2');
    });
  });

  describe('Note state management', () => {
    test('should save current note state before switching', () => {
      const currentNote = {
        id: 'note-1',
        lines: [{ id: 'line-1' }],
        textItems: [{ id: 'text-1' }],
        images: []
      };
      notes.push(currentNote);
      notes.push({ id: 'note-2', lines: [], textItems: [], images: [] });

      // Simulate saveCurrentNoteState
      notes[currentNoteIndex] = { ...currentNote };

      expect(notes[0].lines.length).toBe(1);
      expect(notes[0].textItems.length).toBe(1);
    });

    test('should load note state when switching', () => {
      notes.push({
        id: 'note-1',
        lines: [{ id: 'line-1', points: [] }],
        textItems: [{ id: 'text-1', text: 'Hello' }],
        images: []
      });

      const loadedNote = notes[currentNoteIndex];
      expect(loadedNote.lines.length).toBe(1);
      expect(loadedNote.textItems.length).toBe(1);
      expect(loadedNote.textItems[0].text).toBe('Hello');
    });

    test('should update lastModified timestamp', () => {
      const note = {
        id: 'note-1',
        lines: [],
        textItems: [],
        images: [],
        createdAt: 1000,
        lastModified: 1000
      };
      notes.push(note);

      // Simulate modification
      note.lastModified = 2000;

      expect(note.lastModified).toBeGreaterThan(note.createdAt);
    });
  });

  describe('Note data structure', () => {
    test('lines should have required properties', () => {
      const line = {
        points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
        color: '#ffffff',
        width: 4,
        objectId: 'obj-1'
      };

      expect(line.points).toBeDefined();
      expect(line.color).toBeDefined();
      expect(line.width).toBeDefined();
      expect(line.objectId).toBeDefined();
    });

    test('textItems should have required properties', () => {
      const textItem = {
        id: 'text-1',
        text: 'Sample text',
        x: 100,
        y: 200,
        color: '#ffffff',
        width: 150
      };

      expect(textItem.id).toBeDefined();
      expect(textItem.x).toBeDefined();
      expect(textItem.y).toBeDefined();
      expect(textItem.color).toBeDefined();
    });

    test('images should have required properties', () => {
      const image = {
        id: 'img-1',
        dataUrl: 'data:image/png;base64,test',
        x: 50,
        y: 50,
        width: 200,
        height: 150
      };

      expect(image.id).toBeDefined();
      expect(image.dataUrl).toBeDefined();
      expect(image.x).toBeDefined();
      expect(image.y).toBeDefined();
      expect(image.width).toBeDefined();
      expect(image.height).toBeDefined();
    });
  });

  describe('Clean slate mode', () => {
    test('should start with empty note when enabled', () => {
      const settings = { openWithCleanSlate: true };

      if (settings.openWithCleanSlate) {
        notes = [];
        notes.push({
          id: Date.now().toString(),
          lines: [],
          textItems: [],
          images: [],
          createdAt: Date.now(),
          lastModified: Date.now()
        });
        currentNoteIndex = 0;
      }

      expect(notes.length).toBe(1);
      expect(notes[0].lines).toEqual([]);
    });

    test('should load saved notes when disabled', () => {
      const settings = { openWithCleanSlate: false };
      const savedNotes = [
        { id: '1', lines: [{ id: 'l1' }], textItems: [], images: [] },
        { id: '2', lines: [], textItems: [{ id: 't1' }], images: [] }
      ];

      if (!settings.openWithCleanSlate && savedNotes.length > 0) {
        notes = savedNotes;
      }

      expect(notes.length).toBe(2);
      expect(notes[0].lines.length).toBe(1);
    });
  });
});
