// file-io.js
// Vereinheitlicht das Speichern von Programm- und Bilddateien in Tily.
// Die eigentliche Ausführungslogik bleibt in main.js und tile.js.

(function () {
  "use strict";

  function sanitizeBlockIds(xmlDom) {
    const blocks = xmlDom.querySelectorAll('block[id]');
    const now = Date.now();
    blocks.forEach((block, i) => block.setAttribute('id', `b${i}_${now}`));
  }

  function addSettings(xmlDom) {
    const oldSettings = xmlDom.querySelector('settings');
    if (oldSettings) {
      oldSettings.remove();
    }

    const settings = document.createElement('settings');
    const board = window.Tily?._board;

    if (board) {
      settings.setAttribute('rows', board.rows);
      settings.setAttribute('cols', board.cols);
      settings.setAttribute('startrow', board.startRow);
      settings.setAttribute('startcol', board.startCol);
    }

    xmlDom.appendChild(settings);
  }

  function getStartBlocks() {
    if (!window.workspace) {
      return [];
    }

    return window.workspace
      .getAllBlocks(false)
      .filter(block => block.type === 'tile_start');
  }

  async function saveTextFile(content, defaultName, mimeType, extension, description) {
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description,
            accept: { [mimeType]: [extension] }
          }]
        });

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          alert('❌ Fehler beim Speichern:\n' + err.message);
        }
        return;
      }
    }

    let filename = prompt('Dateiname für den Export:', defaultName);

    if (!filename) {
      return;
    }

    if (!filename.toLowerCase().endsWith(extension)) {
      filename += extension;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function saveProgramPretty() {
    if (!window.workspace || !window.Blockly) {
      alert('⚠️ Blockly ist noch nicht bereit.');
      return;
    }

    const starts = getStartBlocks();

    if (starts.length === 0) {
      alert('⚠️ Kein Startblock vorhanden.');
      return;
    }

    if (starts.length > 1) {
      alert('⚠️ Es gibt mehrere Startblöcke.');
      return;
    }

    const xml = Blockly.Xml.workspaceToDom(window.workspace);
    addSettings(xml);
    sanitizeBlockIds(xml);

    // Wichtig: mit Umbrüchen und Einrückungen speichern
    const xmlText = Blockly.Xml.domToPrettyText(xml);

    await saveTextFile(
      xmlText,
      'Tily.xml',
      'text/xml',
      '.xml',
      'Blockly-Programmdatei'
    );
  }

  function installProgramSaveHandler() {
    const btnSave = document.getElementById('btnSave');
    if (!btnSave) {
      return;
    }

    // Der ursprüngliche Listener aus main.js bleibt bestehen,
    // wird aber bei Klicks abgefangen.
    btnSave.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      saveProgramPretty();
    }, true);
  }

  window.tile_download_portable = async function (basename = 'Tily-Bild') {
    if (!window.Tily?._board) {
      alert('⚠️ Es ist noch kein Bild vorhanden.');
      return;
    }

    const { text, ext } = window.Tily._board.exportPortableBitmap();

    await saveTextFile(
      text,
      `${basename}.${ext}`,
      'text/plain',
      `.${ext}`,
      `${ext.toUpperCase()}-Bilddatei`
    );
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installProgramSaveHandler);
  } else {
    installProgramSaveHandler();
  }
})();