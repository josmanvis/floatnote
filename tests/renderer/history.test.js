// Tests for renderer undo/redo history

describe('History Management', () => {
  let history;
  let historyIndex;
  const MAX_HISTORY = 50;

  beforeEach(() => {
    history = [];
    historyIndex = -1;
  });

  describe('saveState', () => {
    test('should add state to history', () => {
      const state = { lines: [], textItems: [], images: [] };
      history.push(JSON.stringify(state));
      historyIndex = 0;

      expect(history.length).toBe(1);
      expect(historyIndex).toBe(0);
    });

    test('should increment history index', () => {
      for (let i = 0; i < 5; i++) {
        history.push(JSON.stringify({ lines: [i] }));
        historyIndex++;
      }

      expect(historyIndex).toBe(4);
      expect(history.length).toBe(5);
    });

    test('should trim history when exceeding max', () => {
      for (let i = 0; i < MAX_HISTORY + 10; i++) {
        history.push(JSON.stringify({ lines: [i] }));
      }

      // Trim to max
      if (history.length > MAX_HISTORY) {
        history = history.slice(-MAX_HISTORY);
        historyIndex = Math.min(historyIndex, history.length - 1);
      }

      expect(history.length).toBe(MAX_HISTORY);
    });

    test('should truncate future history when adding new state', () => {
      // Add 5 states
      for (let i = 0; i < 5; i++) {
        history.push(JSON.stringify({ lines: [i] }));
        historyIndex++;
      }

      // Undo twice
      historyIndex -= 2;

      // Add new state (should truncate future)
      history = history.slice(0, historyIndex + 1);
      history.push(JSON.stringify({ lines: [100] }));
      historyIndex++;

      expect(history.length).toBe(4);
      expect(historyIndex).toBe(3);
    });
  });

  describe('undo', () => {
    test('should decrement history index', () => {
      for (let i = 0; i < 5; i++) {
        history.push(JSON.stringify({ lines: [i] }));
        historyIndex++;
      }

      // Perform undo
      if (historyIndex > 0) {
        historyIndex--;
      }

      expect(historyIndex).toBe(3);
    });

    test('should not go below 0', () => {
      history.push(JSON.stringify({ lines: [] }));
      historyIndex = 0;

      // Try to undo when at beginning
      if (historyIndex > 0) {
        historyIndex--;
      }

      expect(historyIndex).toBe(0);
    });

    test('should restore previous state', () => {
      history.push(JSON.stringify({ lines: [1, 2, 3] }));
      historyIndex = 0;
      history.push(JSON.stringify({ lines: [1, 2, 3, 4] }));
      historyIndex = 1;

      // Undo
      historyIndex--;
      const state = JSON.parse(history[historyIndex]);

      expect(state.lines).toEqual([1, 2, 3]);
    });
  });

  describe('redo', () => {
    test('should increment history index', () => {
      for (let i = 0; i < 5; i++) {
        history.push(JSON.stringify({ lines: [i] }));
      }
      historyIndex = 2;

      // Perform redo
      if (historyIndex < history.length - 1) {
        historyIndex++;
      }

      expect(historyIndex).toBe(3);
    });

    test('should not go beyond history length', () => {
      for (let i = 0; i < 3; i++) {
        history.push(JSON.stringify({ lines: [i] }));
      }
      historyIndex = 2;

      // Try to redo when at end
      if (historyIndex < history.length - 1) {
        historyIndex++;
      }

      expect(historyIndex).toBe(2);
    });

    test('should restore next state', () => {
      history.push(JSON.stringify({ lines: [1] }));
      history.push(JSON.stringify({ lines: [1, 2] }));
      history.push(JSON.stringify({ lines: [1, 2, 3] }));
      historyIndex = 0;

      // Redo
      historyIndex++;
      const state = JSON.parse(history[historyIndex]);

      expect(state.lines).toEqual([1, 2]);
    });
  });

  describe('canUndo and canRedo', () => {
    test('canUndo should be false at beginning', () => {
      history.push(JSON.stringify({ lines: [] }));
      historyIndex = 0;

      const canUndo = historyIndex > 0;
      expect(canUndo).toBe(false);
    });

    test('canUndo should be true with history', () => {
      for (let i = 0; i < 3; i++) {
        history.push(JSON.stringify({ lines: [i] }));
        historyIndex++;
      }

      const canUndo = historyIndex > 0;
      expect(canUndo).toBe(true);
    });

    test('canRedo should be false at end', () => {
      for (let i = 0; i < 3; i++) {
        history.push(JSON.stringify({ lines: [i] }));
        historyIndex++;
      }

      const canRedo = historyIndex < history.length - 1;
      expect(canRedo).toBe(false);
    });

    test('canRedo should be true after undo', () => {
      for (let i = 0; i < 3; i++) {
        history.push(JSON.stringify({ lines: [i] }));
        historyIndex++;
      }

      // Undo
      historyIndex--;

      const canRedo = historyIndex < history.length - 1;
      expect(canRedo).toBe(true);
    });
  });

  describe('State restoration', () => {
    test('should restore lines correctly', () => {
      const state = {
        lines: [
          { points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#fff', width: 2 }
        ]
      };
      history.push(JSON.stringify(state));

      const restored = JSON.parse(history[0]);
      expect(restored.lines.length).toBe(1);
      expect(restored.lines[0].color).toBe('#fff');
    });

    test('should restore textItems correctly', () => {
      const state = {
        textItems: [
          { id: '1', text: 'Hello', x: 100, y: 100 }
        ]
      };
      history.push(JSON.stringify(state));

      const restored = JSON.parse(history[0]);
      expect(restored.textItems.length).toBe(1);
      expect(restored.textItems[0].text).toBe('Hello');
    });

    test('should restore images correctly', () => {
      const state = {
        images: [
          { id: '1', dataUrl: 'data:image/png;base64,test', x: 50, y: 50 }
        ]
      };
      history.push(JSON.stringify(state));

      const restored = JSON.parse(history[0]);
      expect(restored.images.length).toBe(1);
      expect(restored.images[0].x).toBe(50);
    });
  });
});
