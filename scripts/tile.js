/**
 * tile.js — Schachbrett-Spielfeld + Spielfigur (ohne Orientierung)
 * Quadratische Zellen, Wrap-around.
 * Startzustand speicherbar. Export als PPM (P3 ASCII).
 */
(function () {
  "use strict";

  const DIRS = {
    "UP": {dr: -1, dc: 0}, "DOWN": {dr: 1, dc: 0},
    "LEFT": {dr: 0, dc: -1}, "RIGHT": {dr: 0, dc: 1}
  };
  function mod(a, n){ return ((a % n) + n) % n; }

  class Board {
    constructor(canvas, rows, cols, opts = {}){
      this.canvas = canvas;
      this.ctx = this.canvas.getContext("2d"); // <<< WICHTIG!
      this.rows = rows;
      this.cols = cols;
      const {maxSize = 480, scale = 0.95, margin = 8} = opts;
      this.maxSize = maxSize;
      this.scale = scale;
      this.margin = margin;
      this.cellW = this.cellH = 10;
      this.pieceR = 4;
      this.computeGeometry();
    }


    computeGeometry(){
      // Platz im Layout abfragen
      const parentW = this.canvas.parentElement.clientWidth || 500;
      const parentH = this.canvas.parentElement.clientHeight || 500;

      // verfügbare Breite/Höhe (durch Layout, Skalierung und Maximalgröße)
      const limitW = Math.min(parentW, this.maxSize) * this.scale;
      const limitH = Math.min(parentH, this.maxSize) * this.scale;
      const availW = Math.max(0, limitW - this.margin * 2);
      const availH = Math.max(0, limitH - this.margin * 2);

      // Zellgröße so bestimmen, dass Quadrate entstehen
      const cellW = Math.floor(availW / this.cols);
      const cellH = Math.floor(availH / this.rows);
      const size = Math.max(1, Math.min(cellW, cellH));

      this.cellW = this.cellH = size;

      // Canvas-Pixelgröße entsprechend setzen
      this.canvas.width  = this.cols * size + this.margin * 2;
      this.canvas.height = this.rows * size + this.margin * 2;

      this.pieceR = size * 0.35;
    }


    setGrid(r,c){
      this.rows = Math.max(1, r|0);
      this.cols = Math.max(1, c|0);
      this.applyStart(true);
      this.computeGeometry(); this.draw();
    }
    reset(){ this.applyStart(true); }
    applyStart(clear=true){
      if (clear) this.fillColors = {};
      this.row = this.startRow; this.col = this.startCol;
      this.draw();
    }
    setStartPos(r,c){
      this.startRow = Math.min(this.rows-1, Math.max(0, r|0));
      this.startCol = Math.min(this.cols-1, Math.max(0, c|0));
      this.applyStart(true);
    }

    fillCell(r,c,color){
      if (r>=0 && c>=0 && r<this.rows && c<this.cols){
        this.fillColors[`${r},${c}`]=color; this.draw();
      }
    }
    getCellRect(r,c){ 
      return {x:this.margin+c*this.cellW,y:this.margin+r*this.cellH,w:this.cellW,h:this.cellH}; 
    }

    draw(){
      const ctx=this.ctx;
      ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      for(let r=0;r<this.rows;r++){
        for(let c=0;c<this.cols;c++){
          const {x,y,w,h}=this.getCellRect(r,c);
          ctx.fillStyle="#fff"; ctx.fillRect(x,y,w,h);
          const key=`${r},${c}`;
          if(this.fillColors[key]){ctx.fillStyle=this.fillColors[key]; ctx.fillRect(x,y,w,h);}
          ctx.strokeStyle="#999"; ctx.strokeRect(x,y,w,h);
        }
      }
      const {x,y,w,h}=this.getCellRect(this.row,this.col);
      ctx.beginPath(); 
      ctx.arc(x+w/2,y+h/2,this.pieceR,0,2*Math.PI); 
      ctx.fillStyle="#1e90ff"; 
      ctx.fill();
    }

    async go(direction,steps=1,ms=200){
      const vec=DIRS[direction]; if(!vec) return;
      for(let i=0;i<steps;i++){
        this.row=mod(this.row+vec.dr,this.rows);
        this.col=mod(this.col+vec.dc,this.cols);
        this.draw();
        if(ms>0) await new Promise(r=>setTimeout(r,ms));
      }
    }

    // --- Export als PBM/PGM/PPM je nach Inhalt ---
    exportPortableBitmap(){
      const W = this.cols, H = this.rows;
      const used = new Set(Object.values(this.fillColors).map(c=>c.toLowerCase()));
      used.add("#ffffff"); // weiß immer möglich als Default

      const normalize = col=>{
        if(!col) return "#ffffff";
        col = col.toLowerCase();
        if(col.length===4 && col.startsWith("#")) {
          col = "#" + col[1]+col[1]+col[2]+col[2]+col[3]+col[3];
        }
        return col;
      };
      const get = (r,c)=> normalize(this.fillColors[`${r},${c}`] || "#ffffff");

      // 1) PBM?
      if(used.size === 2){
        const colors = Array.from(used);
        const black = colors.find(c=>c!="#ffffff") || "#000000";
        let out = `P1\n${W} ${H}\n`;
        for(let r=0;r<H;r++){
          let line="";
          for(let c=0;c<W;c++){
            line += (get(r,c)===black ? "1 " : "0 ");
          }
          out += line+"\n";
        }
        return {text:out, ext:"pbm"};
      }

      // 2) PGM?
      const grayMap = {
        "#ffffff": 6,
        "#cccccc": 5,
        "#c0c0c0": 4,
        "#999999": 3,
        "#666666": 2,
        "#333333": 1,
        "#000000": 0
      };
      if([...used].every(c => grayMap.hasOwnProperty(normalize(c)))){
        let out = `P2\n${W} ${H}\n6\n`;
        for(let r=0;r<H;r++){
          let line="";
          for(let c=0;c<W;c++){
            line += grayMap[get(r,c)] + " ";
          }
          out += line+"\n";
        }
        return {text:out, ext:"pgm"};
      }

      // 3) PPM
      function hexToRgb(hex){
        hex=normalize(hex);
        const n=parseInt(hex.slice(1),16);
        return [(n>>16)&255,(n>>8)&255,n&255];
      }
      let out = `P3\n${W} ${H}\n255\n`;
      for(let r=0;r<H;r++){
        let line="";
        for(let c=0;c<W;c++){
          const [R,G,B]=hexToRgb(get(r,c));
          line += `${R} ${G} ${B} `;
        }
        out+=line+"\n";
      }
      return {text:out, ext:"ppm"};
    }
  }

  const Tily=window.Tily||(window.Tily={});
  function getBoard(){
    if(!Tily._board){
      const canvas = document.getElementById("tileCanvas");
      const opts = Tily.boardOpts || {};
      Tily._board = new Board(canvas,15,15,opts);
    }
    return Tily._board;
  }

  window.tile_go=(dir,s,ms)=>getBoard().go(dir,s,ms);
  window.tile_fill=(color)=>getBoard().fillCell(getBoard().row,getBoard().col,color);
  window.tile_reset=()=>getBoard().reset();
  window.tile_set_grid=(r,c)=>getBoard().setGrid(r,c);
  window.tile_set_pos=(r,c)=>getBoard().setStartPos(r,c);
  window.tile_apply_start=()=>getBoard().applyStart(true);

  // --- Export-APIs ---
  window.tile_download_portable = (basename="board")=>{
    const {text, ext} = getBoard().exportPortableBitmap();
    const blob = new Blob([text],{type:"text/plain"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`${basename}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

})();
