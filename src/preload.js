const { contextBridge, ipcRenderer, clipboard, nativeImage } = require('electron');

contextBridge.exposeInMainWorld('glassboard', {
    onFocusChange: (callback) => {
        ipcRenderer.on('window-focus', (event, focused) => callback(focused));
    },
    closeWindow: () => {
        ipcRenderer.send('close-window');
    },
    hideWindow: () => {
        ipcRenderer.send('hide-window');
    },
    setPinned: (pinned) => {
        ipcRenderer.send('set-pinned', pinned);
    },
    setWindowSize: (size) => {
        ipcRenderer.send('set-window-size', size);
    },
    setBackgroundMode: (mode) => {
        ipcRenderer.send('set-background-mode', mode);
    },
    // Clipboard access
    getClipboardContent: () => {
        const formats = clipboard.availableFormats();
        const hasImage = formats.some(f => f.includes('image'));
        const hasText = formats.some(f => f.includes('text'));

        if (hasImage) {
            const image = clipboard.readImage();
            if (!image.isEmpty()) {
                const size = image.getSize();
                return {
                    type: 'image',
                    dataUrl: image.toDataURL(),
                    width: size.width,
                    height: size.height
                };
            }
        }

        if (hasText) {
            const text = clipboard.readText();
            if (text && text.trim()) {
                return {
                    type: 'text',
                    content: text
                };
            }
        }

        return null;
    },
    readClipboardImage: () => {
        const image = clipboard.readImage();
        if (!image.isEmpty()) {
            return image.toDataURL();
        }
        return null;
    },
    readClipboardText: () => {
        return clipboard.readText();
    },
    // Data persistence
    saveData: (data) => {
        return ipcRenderer.invoke('save-data', data);
    },
    loadData: () => {
        return ipcRenderer.invoke('load-data');
    },
    // Window resize
    resizeWindowLeft: (deltaX) => {
        ipcRenderer.send('resize-window-left', deltaX);
    }
});
