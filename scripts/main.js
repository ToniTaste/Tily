/**
 * main.js — Blockly-Init + Runner + Save/Load + Settings-Toggle
 */
(function(){
  "use strict";

  window.workspace = window.workspace || null;
  const DEFAULT_ROWS = 15, DEFAULT_COLS = 15;
  let queue = [];
  let running = false;

  // ---------- UI Helpers ----------
  function getEl(id){ return document.getElementById(id); }
  function disable(el, flag){ if (el) el.disabled = !!flag; }
  function setBlocklyEnabled(flag){
    const div = getEl('blocklyDiv');
    if (!div) return;
    div.style.pointerEvents = flag ? 'auto' : 'none';
    div.style.opacity = flag ? '1' : '0.6';
  }
  function lockProgram(flag){
    ['btnStart','btnStop','btnStep','btnReset','btnLoad','btnSave']
      .forEach(id=>disable(getEl(id), flag));
    setBlocklyEnabled(!flag);
  }

  const tilyTheme = Blockly.Theme.defineTheme('tilyTheme', {
    base: Blockly.Themes.Classic,
    blockStyles: {
      start_blocks: {
        colourPrimary: '#FFBF00',
        hat: 'cap'
      },
      command_blocks: {
      colourPrimary: '#4C97FF'
      },
    loop_blocks: {
      colourPrimary: '#FFAB19'
      }
    }
  });

  // ---------- Blockly ----------
  window.initBlockly = function(){
    const blocklyDiv = getEl('blocklyDiv');
    const toolbox = getEl('toolbox');
    window.workspace = Blockly.inject(blocklyDiv, {
      toolbox,
      trashcan: false,
      zoom: { controls: true, wheel: false, startScale: 0.9 },
      scrollbars: true,
      renderer: 'zelos',
      theme: tilyTheme
    });
    ensureStartBlock();
    window.addEventListener('resize', ()=> Blockly.svgResize(window.workspace));
  };
  function ensureStartBlock() {
  const ws = window.workspace;
  if (!ws) return;

  const starts = ws.getAllBlocks(false).filter(b => b.type === 'tile_start');

  if (starts.length === 0) {
    const start = ws.newBlock('tile_start');
    start.initSvg();
    start.render();
    start.moveBy(30, 30);
    start.setDeletable(false);
    return;
  }

  starts.forEach(start => {
    start.setDeletable(false);
  });
}

  // ---------- enroll ----------
  function enroll(block, arr, fn){
    if (!block) return;
    const id = block.id;
    arr.push({type:'highlight', id});
    fn(block, arr);
    arr.push({type:'unhighlight', id});
  }

  // ---------- Step Collection ----------
  function collectStepsFromBlock(block, arr){
    if (!block) return;
    switch(block.type){
      case 'tile_go':
        enroll(block, arr, (b,a)=> {
          a.push({type:'go', dir:b.getFieldValue('DIR')});
        });
        break;
      case 'tile_fill':
        enroll(block, arr, (b,a)=> {
          a.push({type:'fill', color:b.getFieldValue('COLOR')||'#ffd54f'});
        });
        break;
      case 'custom_repeat': {
        const times = Math.max(0, Math.floor(block.getFieldValue('TIMES')||0));
        const first = block.getInputTargetBlock('DO');
        for(let i=0;i<times;i++){
          let b=first;
          while(b){ collectStepsFromBlock(b, arr); b=b.getNextBlock(); }
        }
      } break;
      case 'tile_start': 
        //Der Startblock erzeugt keinen Schritt		
	  break;
    }
  }
  
  function getStartBlock() {
  const starts = workspace.getAllBlocks(false)
    .filter(b => b.type === 'tile_start');

  if (starts.length === 0) {
    alert("⚠️ Kein Startblock vorhanden.");
    return null;
  }

  if (starts.length > 1) {
    alert("⚠️ Es gibt mehrere Startblöcke.");
    return null;
  }

  return starts[0];
}
  
  function buildSteps() {
  const start = getStartBlock();
  if (!start) return [];

  const steps = [];

  let b = start.getNextBlock();
  while (b) {
    collectStepsFromBlock(b, steps);
    b = b.getNextBlock();
  }

  return steps;
}

  // ---------- Runner ----------
  function getDelayMs(){
    const slider = getEl('timeoutSlider');
    const v = parseInt(slider?.value ?? "50", 10); // 5..100
    const ms = Math.round((100 - v) * 2); // rechts=0ms
    return Math.max(0, ms);
  }
  async function doStep(step){
    const delay = getDelayMs();
    switch(step.type){
      case 'highlight':
        workspace?.highlightBlock(step.id);
        if (delay>0) await new Promise(r=>setTimeout(r, delay/2));
        break;
      case 'unhighlight':
        workspace?.highlightBlock(null);
        break;
      case 'go':
        await window.tile_go(step.dir, 1, delay);
        break;
      case 'fill':
        window.tile_fill(step.color);
        if (delay>0) await new Promise(r=>setTimeout(r, delay/2));
        break;
    }
  }
  async function runQueue() {
  if (running) return;

  running = true;

  try {
    while (queue.length) {
      await doStep(queue.shift());
    }

    alert("✅ Das Programm ist beendet.");
  } catch (e) {
    alert("❌ Fehler im Programm:\n" + e.message);
  } finally {
    running = false;
    workspace?.highlightBlock(null);
  }
}

  // ---------- Public Run Controls ----------
  window.startRun = function() {
  if (running) return;

  if (window.tile_apply_start) window.tile_apply_start();

  queue = buildSteps();

  if (queue.length === 0) {
    alert("⚠️ Das Programm enthält keine ausführbaren Blöcke.");
    return;
  }

  runQueue();
};
  window.startStep = async function() {
  if (running) return;

  if (!queue.length) {
    if (window.tile_apply_start) window.tile_apply_start();
    queue = buildSteps();

    if (queue.length === 0) {
      alert("⚠️ Das Programm enthält keine ausführbaren Blöcke.");
      return;
    }
  }

  const step = queue.shift();

  if (step) {
    await doStep(step);
  }

  if (!queue.length) {
    workspace?.highlightBlock(null);
    alert("✅ Das Programm ist beendet.");
  }
};
  window.stoppAll = function(){
    queue.length=0; running=false; workspace?.highlightBlock(null);
    if (window.tile_apply_start) window.tile_apply_start();
  };
  window.resetProgram = function(){
    window.stoppAll(); workspace?.clear(); ensureStartBlock();
    if (window.tile_apply_start) window.tile_apply_start();
  };
  window.reloadAll = function(){ location.reload(); };

  // ---------- Save/Load ----------
  function sanitizeBlockIds(xmlDom){
    const blocks=xmlDom.querySelectorAll('block[id]');
    blocks.forEach((block,i)=> block.setAttribute('id', `b${i}_${Date.now()}`));
  }
  function saveProgram(){
    const xml = Blockly.Xml.workspaceToDom(workspace);
    const settings = document.createElement("settings");
    const b = window.Tily?._board;
    if (b){
      settings.setAttribute("rows", b.rows);
      settings.setAttribute("cols", b.cols);
      settings.setAttribute("startrow", b.startRow);   // lowercase
      settings.setAttribute("startcol", b.startCol);   // lowercase
    }
    xml.appendChild(settings);

    sanitizeBlockIds(xml);
    const text = Blockly.Xml.domToText(xml);
    const blob = new Blob([text], {type:'text/xml'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'project.xml'; a.click();
    URL.revokeObjectURL(a.href);
  }
  function loadProgram(file){
    const reader = new FileReader();
    reader.onload = () => {
      let xmlDom;
      try {
        xmlDom = Blockly.utils.xml.textToDom(reader.result);
      } catch (e) {
        alert("❌ Fehler beim Parsen der Datei:\n" + e.message);
        return;
      }

      const settings = xmlDom.querySelector("settings");
      if (settings){
        const rows = parseInt(settings.getAttribute("rows") || DEFAULT_ROWS, 10);
        const cols = parseInt(settings.getAttribute("cols") || DEFAULT_COLS, 10);
        const startRow = parseInt(settings.getAttribute("startrow") || 0, 10);
        const startCol = parseInt(settings.getAttribute("startcol") || 0, 10);

        if (window.tile_set_grid) window.tile_set_grid(rows, cols);
        if (window.tile_set_pos) window.tile_set_pos(startRow, startCol);
        if (window.tile_apply_start) window.tile_apply_start();

        getEl('rows').value = rows;
        getEl('cols').value = cols;

        if (getEl('startSelect')) {
          let where = "center";
          if (startRow === 0 && startCol === 0) where = "tl";
          else if (startRow === 0 && startCol === cols-1) where = "tr";
          else if (startRow === rows-1 && startCol === 0) where = "bl";
          else if (startRow === rows-1 && startCol === cols-1) where = "br";
          getEl('startSelect').value = where;
        }
      }

      workspace.clear();
      Blockly.Xml.domToWorkspace(xmlDom, workspace);
      ensureStartBlock();
    };
    reader.readAsText(file);
  }

  // ---------- Init ----------
  function init(){
    window.Tily = window.Tily||{};
    if (window.tile_reset) window.tile_reset();
    window.initBlockly();
    lockProgram(false);

    // Werte aus HTML übernehmen (oder Default)
    let rows = parseInt(getEl('rows').value, 10) || DEFAULT_ROWS;
    let cols = parseInt(getEl('cols').value, 10) || DEFAULT_COLS;
    let startVal = getEl('startSelect').value || "tl";

    if (window.tile_set_grid) window.tile_set_grid(rows, cols);
    switch(startVal){
      case 'tl': window.tile_set_pos(0, 0); break;
      case 'tr': window.tile_set_pos(0, cols-1); break;
      case 'bl': window.tile_set_pos(rows-1, 0); break;
      case 'br': window.tile_set_pos(rows-1, cols-1); break;
      case 'center': default: 
        window.tile_set_pos(Math.floor(rows/2), Math.floor(cols/2));
        break;
    }

    getEl('btnSave').addEventListener('click', saveProgram);
    getEl('btnLoad').addEventListener('click', ()=> getEl('xmlInput').click());
    getEl('xmlInput').addEventListener('change', e=>{
      if(e.target.files[0]) loadProgram(e.target.files[0]);
    });
  }

  if (document.readyState==='loading') 
    document.addEventListener('DOMContentLoaded', init);
  else 
    init();

  // ---------- Umschalt-Button für Einstellungen ----------
  window.toggleSettings = function(){
    const rows = getEl("rows");
    const cols = getEl("cols");
    const start = getEl("startSelect");
    const btn = getEl("settingsBtn");

    const editing = !rows.disabled;

    if (editing) {
      // --- Speichern ---
      rows.disabled = true;
      cols.disabled = true;
      start.disabled = true;
      btn.textContent = "✏️ Bearbeiten";

      const r = parseInt(rows.value, 10) || DEFAULT_ROWS;
      const c = parseInt(cols.value, 10) || DEFAULT_COLS;
      if (window.tile_set_grid) window.tile_set_grid(r, c);

      let rr=0, cc=0;
      switch(start.value){
        case "tl": rr=0; cc=0; break;
        case "tr": rr=0; cc=c-1; break;
        case "bl": rr=r-1; cc=0; break;
        case "br": rr=r-1; cc=c-1; break;
        case "center": default: rr=Math.floor(r/2); cc=Math.floor(c/2); break;
      }
      if (window.tile_set_pos) window.tile_set_pos(rr, cc);
      if (window.tile_apply_start) window.tile_apply_start();

    } else {
      // --- Bearbeiten ---
      rows.disabled = false;
      cols.disabled = false;
      start.disabled = false;
      btn.textContent = "💾 Speichern";
    }
  };

})();
