import { useState, useRef, useEffect, useCallback } from "react";

// ─── BUNDLED CONTENT FILES ───────────────────────────────────────────────────
const mdModules = import.meta.glob('/content/*.md', { eager: true, query: '?raw', import: 'default' });
const BUNDLED_FILES = Object.entries(mdModules).map(([path, content]) => {
  const name = path.split('/').pop();
  const dateMatch = name.match(/^(\d{4}-\d{2}-\d{2})/);
  const lastModified = dateMatch ? new Date(dateMatch[1] + "T12:00:00") : new Date();
  return { name, lastModified, content };
});

// ─── COLORS ──────────────────────────────────────────────────────────────────
const COLORS = ["#00e5ff","#00ff88","#ff6b35","#c77dff","#ffb300","#ff4d8d","#4fc3f7","#a5d6a7"];

// ─── MARKDOWN PARSER ─────────────────────────────────────────────────────────
function parseArticle(content, name, date) {
  const lines = content.split("\n");
  let title = name.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}_/, "");
  let subtitle = "";
  const sections = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith("# ")) { title = line.slice(2).trim(); }
    else if (!subtitle && /^\*.+\*$/.test(line.trim())) { subtitle = line.trim().slice(1, -1); }
    else if (line.startsWith("## ")) {
      if (cur) sections.push(cur);
      cur = { title: line.slice(3).trim(), rawLines: [] };
    } else if (cur) { cur.rawLines.push(line); }
  }
  if (cur) sections.push(cur);
  return {
    id: name, title, subtitle, date,
    color: COLORS[Math.abs((name.charCodeAt(0) + (name.charCodeAt(5) || 0)) % COLORS.length)],
    sections: sections.map(s => ({ title: s.title, blocks: parseBlocks(s.rawLines) })),
  };
}

function parseBlocks(lines) {
  const out = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("|") && lines[i+1] && lines[i+1].trim().match(/^\|[-:| ]+\|/)) {
      const headers = line.split("|").filter(function(c){return c.trim();}).map(function(c){return c.trim();});
      i += 2; const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").filter(function(c){return c.trim();}).map(function(c){return c.trim();})); i++;
      }
      out.push({ type:"table", headers:headers, rows:rows }); continue;
    }
    if (line.startsWith("> ")) {
      var t = ""; while (i < lines.length && lines[i].startsWith("> ")) { t += lines[i].slice(2) + " "; i++; }
      out.push({ type:"quote", text:t.trim() }); continue;
    }
    if (/^\d+\.\s/.test(line)) {
      var items = []; while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, "").trim()); i++; }
      out.push({ type:"olist", items:items }); continue;
    }
    if (/^[-*]\s/.test(line)) {
      var items2 = []; while (i < lines.length && /^[-*]\s/.test(lines[i])) { items2.push(lines[i].replace(/^[-*]\s/, "").trim()); i++; }
      out.push({ type:"list", items:items2 }); continue;
    }
    if (line.trim() && !line.startsWith("#")) {
      var t2 = line; i++;
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith("|") && !lines[i].startsWith(">") && !/^[-*\d]/.test(lines[i].trim())) { t2 += " " + lines[i]; i++; }
      out.push({ type:"p", text:t2.trim() }); continue;
    }
    i++;
  }
  return out;
}

function Inl({ text }) {
  if (!text) return null;
  var parts = [];
  var re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  var last = 0, m, key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={key++}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={key++}>{m[4]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span>{parts}</span>;
}

// ─── BLOCK RENDERER ──────────────────────────────────────────────────────────
function Block({ block, accent }) {
  switch (block.type) {
    case "p":
      return <p style={{fontSize:12,lineHeight:1.8,color:"rgba(210,228,255,0.7)",marginBottom:10}}><Inl text={block.text}/></p>;
    case "quote":
      return <blockquote style={{borderLeft:"3px solid "+accent,margin:"0 0 12px",padding:"8px 12px",background:accent+"0a",borderRadius:"0 5px 5px 0",fontSize:11,color:accent+"c0",lineHeight:1.75,fontStyle:"italic"}}><Inl text={block.text}/></blockquote>;
    case "list":
      return <ul style={{margin:"0 0 10px",padding:0,listStyle:"none"}}>{block.items.map(function(item,i){return(
        <li key={i} style={{display:"flex",gap:7,marginBottom:5,fontSize:11.5,lineHeight:1.65,color:"rgba(200,218,255,0.62)",alignItems:"flex-start"}}>
          <span style={{color:accent,flexShrink:0,fontSize:7,marginTop:5}}>{"\u25B6"}</span>
          <span><Inl text={item}/></span>
        </li>
      );})}</ul>;
    case "olist":
      return <ol style={{margin:"0 0 10px",padding:0,listStyle:"none"}}>{block.items.map(function(item,i){return(
        <li key={i} style={{display:"flex",gap:7,marginBottom:5,fontSize:11.5,lineHeight:1.65,color:"rgba(200,218,255,0.62)",alignItems:"flex-start"}}>
          <span style={{color:accent,flexShrink:0,fontFamily:"'JetBrains Mono',monospace",fontSize:9,minWidth:16,textAlign:"right",paddingTop:2}}>{i+1}.</span>
          <span><Inl text={item}/></span>
        </li>
      );})}</ol>;
    case "table":
      return (
        <div style={{overflowX:"auto",marginBottom:12}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{block.headers.map(function(h,i){return(
              <th key={i} style={{padding:"4px 8px",textAlign:"left",color:accent,fontFamily:"'JetBrains Mono',monospace",fontSize:8.5,letterSpacing:"0.1em",borderBottom:"1px solid "+accent+"40",fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>
            );})}</tr></thead>
            <tbody>{block.rows.map(function(row,ri){return(
              <tr key={ri} style={{background:ri%2===0?"rgba(255,255,255,0.02)":"transparent"}}>
                {row.map(function(cell,ci){return(
                  <td key={ci} style={{padding:"4px 8px",color:ci===0?"rgba(215,232,255,0.85)":"rgba(175,198,230,0.48)",borderBottom:"1px solid rgba(255,255,255,0.035)",lineHeight:1.55,fontSize:ci===0?10.5:10}}><Inl text={cell}/></td>
                );})}
              </tr>
            );})}</tbody>
          </table>
        </div>
      );
    default: return <span />;
  }
}

// ─── ARC WHEEL ───────────────────────────────────────────────────────────────
var R = 200;
var CARD_W = 190;
var CARD_H = 68;
var SEMICIRCLE_W = 36;
var CARD_PUSH = R - SEMICIRCLE_W;
var SENS = 0.62;
var VISIBLE_ARC = 110;

function ArcWheel({ articles, isOpen, onToggle, onSelect }) {
  var n = articles.length;
  var STEP = n > 1 ? Math.min(360 / n, 46) : 46;

  var [rotOffset, setRotOffset] = useState(0);
  var [isSnapping, setIsSnapping] = useState(false);
  var dragRef = useRef(null);
  var overlayRef = useRef(null);

  var getEffAngle = useCallback(function(i, off) { return ((i * STEP + off) % 360 + 360) % 360; }, [STEP]);

  var distFrom180 = useCallback(function(i, off) {
    var eff = getEffAngle(i, off);
    var d = Math.abs(eff - 180);
    return d > 180 ? 360 - d : d;
  }, [getEffAngle]);

  var getActiveIdx = useCallback(function(off) {
    if (!n) return 0;
    var best = 0, bestDist = Infinity;
    for (var i = 0; i < n; i++) {
      var d = distFrom180(i, off);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }, [n, distFrom180]);

  var snapToIdx = useCallback(function(idx, currentOff) {
    var target = 180 - idx * STEP;
    var raw = ((target - currentOff + 180) % 360 + 360) % 360 - 180;
    return currentOff + raw;
  }, [STEP]);

  var doSnap = useCallback(function(rawOff) {
    var idx = getActiveIdx(rawOff);
    setIsSnapping(true);
    setRotOffset(snapToIdx(idx, rawOff));
    setTimeout(function() { setIsSnapping(false); }, 420);
    dragRef.current = null;
  }, [getActiveIdx, snapToIdx]);

  // Native touch listeners
  useEffect(function() {
    var el = overlayRef.current;
    if (!el || !isOpen) return;

    var onTouchStart = function(e) {
      dragRef.current = { startY: e.touches[0].clientY, startOff: rotOffset, moved: false };
    };
    var onTouchMove = function(e) {
      if (!dragRef.current) return;
      var dy = e.touches[0].clientY - dragRef.current.startY;
      if (Math.abs(dy) > 6) {
        e.preventDefault();
        dragRef.current.moved = true;
        setRotOffset(dragRef.current.startOff + dy * SENS);
      }
    };
    var onTouchEnd = function(e) {
      if (!dragRef.current) return;
      if (dragRef.current.moved) {
        var dy = e.changedTouches[0].clientY - dragRef.current.startY;
        doSnap(dragRef.current.startOff + dy * SENS);
      }
      dragRef.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return function() {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, [isOpen, rotOffset, doSnap]);

  // Mouse drag
  var handleMouseDown = useCallback(function(e) {
    e.preventDefault();
    var startY = e.clientY, startOff = rotOffset;
    var onMove = function(e2) { setRotOffset(startOff + (e2.clientY - startY) * SENS); };
    var onUp = function(e2) {
      doSnap(startOff + (e2.clientY - startY) * SENS);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [rotOffset, doSnap]);

  var activeIdx = getActiveIdx(rotOffset);

  var handleCardClick = function(i) {
    if (i === activeIdx) {
      onSelect(articles[i].id);
      onToggle();
    } else {
      var snapped = snapToIdx(i, rotOffset);
      setIsSnapping(true);
      setRotOffset(snapped);
      setTimeout(function() { setIsSnapping(false); }, 450);
    }
  };

  // SAFARI-SAFE: Always render everything, use CSS to show/hide
  return (
    <div>
      {/* Semi-circle toggle button — always visible */}
      <div
        onClick={onToggle}
        style={{
          position:"fixed", right:0, top:"50%", transform:"translateY(-50%)",
          width:36, height:100, zIndex:810,
          background: isOpen
            ? "linear-gradient(270deg,rgba(0,229,255,0.18),rgba(0,229,255,0.06))"
            : "linear-gradient(270deg,rgba(0,229,255,0.1),rgba(0,229,255,0.03))",
          borderRadius:"50px 0 0 50px",
          border:"1px solid rgba(0,229,255,0.28)", borderRight:"none",
          cursor:"pointer",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:5,
          boxShadow:"-4px 0 24px rgba(0,229,255,"+(isOpen?"0.12":"0.05")+")",
          transition:"background 0.3s, box-shadow 0.3s",
          userSelect:"none", WebkitTapHighlightColor:"transparent",
        }}
      >
        <div style={{width:14,height:1,background:"rgba(0,229,255,"+(isOpen?"0.9":"0.5")+")",transition:"background 0.3s",borderRadius:1}}/>
        <div style={{width:10,height:1,background:"rgba(0,229,255,"+(isOpen?"0.6":"0.3")+")",transition:"background 0.3s",borderRadius:1}}/>
        <div style={{width:14,height:1,background:"rgba(0,229,255,"+(isOpen?"0.9":"0.5")+")",transition:"background 0.3s",borderRadius:1}}/>
        <div style={{marginTop:3,fontSize:8,color:"rgba(0,229,255,"+(isOpen?"0.8":"0.4")+")",fontFamily:"'JetBrains Mono',monospace",transition:"all 0.3s"}}>
          {isOpen ? "\u25B6" : "\u25C0"}
        </div>
      </div>

      {/* Wheel overlay — ALWAYS in DOM, CSS visibility toggle */}
      <div
        ref={overlayRef}
        style={{
          position:"fixed", right:0, top:0, bottom:0,
          width: R + CARD_W + 20,
          zIndex:790,
          touchAction:"none",
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
          pointerEvents: isOpen ? "auto" : "none",
          transition:"opacity 0.3s, visibility 0.3s",
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Background scrim */}
        <div
          onClick={onToggle}
          style={{position:"absolute",inset:0,background:"linear-gradient(270deg,rgba(3,8,16,0.85),rgba(3,8,16,0.4))",cursor:"pointer"}}
        />

        {/* Cards arc */}
        <div style={{
          position:"absolute", right:0, top:"50%", transform:"translateY(-50%)",
          width:0, height:0,
        }}>
          {articles.map(function(a, i) {
            var angleDeg = getEffAngle(i, rotOffset);
            var distDeg = distFrom180(i, rotOffset);
            var isActive = i === activeIdx;

            // SAFARI-SAFE: always render, use CSS opacity instead of return null
            var outOfArc = distDeg > VISIBLE_ARC;

            var rad = (angleDeg * Math.PI) / 180;
            var cx = R * Math.cos(rad);
            var cy = R * Math.sin(rad);

            var t = distDeg / VISIBLE_ARC;
            var cardOpacity = outOfArc ? 0 : (isActive ? 1 : Math.max(0, 1 - t * 1.1));
            var scale = isActive ? 1 : 0.88 - t * 0.15;
            var accent = a.color;

            return (
              <div
                key={a.id}
                onClick={function(e) { e.stopPropagation(); handleCardClick(i); }}
                style={{
                  position:"absolute",
                  left: cx - CARD_W + CARD_PUSH,
                  top: cy - CARD_H / 2,
                  width: CARD_W,
                  height: CARD_H,
                  cursor: "pointer",
                  opacity: cardOpacity,
                  visibility: outOfArc ? "hidden" : "visible",
                  transform: "scale("+scale+")",
                  transformOrigin: "right center",
                  transition: isSnapping
                    ? "opacity 0.38s ease, transform 0.38s ease, visibility 0.38s"
                    : "opacity 0.15s ease, transform 0.15s ease, visibility 0.15s",
                  userSelect:"none",
                  zIndex: isActive ? 10 : 5,
                }}
              >
                <div style={{
                  width:"100%", height:"100%",
                  background: isActive
                    ? "linear-gradient(135deg, "+accent+"1a, "+accent+"0d)"
                    : "rgba(6,15,26,0.88)",
                  border:"1px solid "+(isActive ? accent+"55" : "rgba(255,255,255,0.07)"),
                  borderLeft:"3px solid "+(isActive ? accent : "rgba(255,255,255,0.1)"),
                  borderRadius:"8px 0 0 8px",
                  padding:"8px 12px 8px 10px",
                  backdropFilter:"blur(12px)",
                  boxShadow: isActive
                    ? "-4px 0 30px rgba(0,0,0,0.5), 0 0 20px "+accent+"10"
                    : "-2px 0 12px rgba(0,0,0,0.4)",
                  transition:"border-color 0.3s, background 0.3s, box-shadow 0.3s",
                  display:"flex", flexDirection:"column", justifyContent:"center",
                  overflow:"hidden",
                }}>
                  <div style={{
                    fontFamily:"'JetBrains Mono',monospace",
                    fontSize:7.5,
                    color: isActive ? accent+"90" : "rgba(255,255,255,0.25)",
                    letterSpacing:"0.12em",
                    marginBottom:4,
                    transition:"color 0.3s",
                  }}>
                    {a.date.toLocaleDateString("ja-JP")} {"\u00B7"} {a.sections.length}sec
                  </div>
                  <div style={{
                    fontSize:11.5,
                    fontWeight:700,
                    color: isActive ? "rgba(220,236,255,0.94)" : "rgba(180,205,240,0.5)",
                    fontFamily:"'Exo 2',sans-serif",
                    lineHeight:1.35,
                    overflow:"hidden",
                    display:"-webkit-box",
                    WebkitLineClamp:2,
                    WebkitBoxOrient:"vertical",
                    transition:"color 0.3s",
                  }}>
                    {a.title}
                  </div>
                  {/* SAFARI-SAFE: always render tap hint, use CSS opacity */}
                  <div style={{
                    marginTop:5,
                    fontSize:8,
                    color:accent+"70",
                    fontFamily:"'JetBrains Mono',monospace",
                    letterSpacing:"0.1em",
                    display:"flex",
                    alignItems:"center",
                    gap:5,
                    opacity: isActive ? 1 : 0,
                    height: isActive ? "auto" : 0,
                    overflow:"hidden",
                    transition:"opacity 0.3s",
                  }}>
                    <span style={{width:4,height:4,borderRadius:"50%",background:accent,display:"inline-block",animation:"pulseDot 1.6s ease-in-out infinite"}}/>
                    TAP TO OPEN
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top & bottom fade */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(3,8,16,0.7) 0%,transparent 18%,transparent 82%,rgba(3,8,16,0.7) 100%)",pointerEvents:"none",zIndex:20}}/>
        {/* Drag hint */}
        <div style={{position:"absolute",right:46,top:"50%",transform:"translateY(calc(-50% + 52px))",fontFamily:"'JetBrains Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.13)",letterSpacing:"0.15em",pointerEvents:"none",zIndex:21}}>{"\u2195"} DRAG</div>
      </div>
    </div>
  );
}

// ─── LEFT DATE PANEL ─────────────────────────────────────────────────────────
function LeftDatePanel({ allDates, activeDate, onSelect, isOpen, onToggle }) {
  var sorted = [];
  var seen = {};
  allDates.forEach(function(d) {
    var s = d.toLocaleDateString("ja-JP");
    if (!seen[s]) { seen[s] = true; sorted.push(s); }
  });
  sorted.sort().reverse();

  return (
    <div>
      {/* Toggle tab */}
      <div onClick={onToggle} style={{
        position:"fixed",left:isOpen?232:0,top:"50%",transform:"translateY(-50%)",
        width:32,height:88,zIndex:750,
        background:"linear-gradient(90deg,rgba(255,176,0,0.1),rgba(255,176,0,0.03))",
        borderRadius:"0 44px 44px 0",
        border:"1px solid rgba(255,176,0,0.28)",borderLeft:"none",
        cursor:"pointer",
        transition:"left 0.35s cubic-bezier(0.4,0,0.2,1)",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,
        boxShadow:"3px 0 16px rgba(255,176,0,0.06)",
        userSelect:"none",WebkitTapHighlightColor:"transparent",
      }}>
        <div style={{fontSize:11}}>{"\uD83D\uDCC5"}</div>
        <div style={{width:12,height:1,background:"rgba(255,176,0,0.4)",borderRadius:1}}/>
        <div style={{width:8,height:1,background:"rgba(255,176,0,0.25)",borderRadius:1}}/>
        <div style={{fontSize:7,color:"rgba(255,176,0,0.45)",fontFamily:"'JetBrains Mono',monospace",marginTop:1}}>{isOpen?"\u25C0":"\u25B6"}</div>
      </div>

      {/* Panel — ALWAYS in DOM, use CSS transform to slide */}
      <div style={{
        position:"fixed",left:0,top:50,bottom:0,width:232,zIndex:740,
        background:"linear-gradient(180deg,#06100a,#04090f)",
        borderRight:"1px solid rgba(255,176,0,0.1)",
        transform:isOpen?"translateX(0)":"translateX(-100%)",
        transition:"transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        display:"flex",flexDirection:"column",
        boxShadow:"10px 0 40px rgba(0,0,0,0.6)",
      }}>
        <div style={{padding:"13px 16px 9px",borderBottom:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7.5,color:"rgba(255,176,0,0.45)",letterSpacing:"0.2em",marginBottom:2}}>DATE FILTER</div>
          <div style={{fontSize:10.5,color:"rgba(200,220,200,0.3)",fontFamily:"'Exo 2',sans-serif"}}>MD{"\u30D5\u30A1\u30A4\u30EB\u306E\u4FDD\u5B58\u65E5\u6642"}</div>
        </div>
        <div onClick={function(){onSelect(null);onToggle();}} style={{
          padding:"10px 16px",cursor:"pointer",
          borderBottom:"1px solid rgba(255,255,255,0.04)",
          background:activeDate===null?"rgba(255,176,0,0.07)":"transparent",
          display:"flex",alignItems:"center",gap:8,
        }}>
          <div style={{width:6,height:6,borderRadius:1,background:activeDate===null?"#ffb300":"rgba(255,255,255,0.15)"}}/>
          <span style={{fontSize:11.5,color:activeDate===null?"#ffb300":"rgba(200,220,255,0.45)",fontFamily:"'Exo 2',sans-serif",fontWeight:activeDate===null?700:400}}>{"\u3059\u3079\u3066\u306E\u65E5\u4ED8"}</span>
        </div>
        <div style={{flex:1,overflowY:"auto",scrollbarWidth:"none"}}>
          {sorted.map(function(ds) {
            var active = activeDate===ds;
            var cnt = allDates.filter(function(d){return d.toLocaleDateString("ja-JP")===ds;}).length;
            return (
              <div key={ds} onClick={function(){onSelect(ds);onToggle();}} style={{
                padding:"9px 16px",cursor:"pointer",
                borderBottom:"1px solid rgba(255,255,255,0.03)",
                background:active?"rgba(255,176,0,0.07)":"transparent",
                display:"flex",alignItems:"center",gap:8,
                transition:"background 0.15s",
              }}>
                <div style={{width:6,height:6,borderRadius:"50%",background:active?"#ffb300":"rgba(255,255,255,0.1)",boxShadow:active?"0 0 6px #ffb300":"none",flexShrink:0,transition:"all 0.2s"}}/>
                <div>
                  <div style={{fontSize:11,color:active?"#ffb300":"rgba(200,220,255,0.5)",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",fontWeight:active?700:400}}>{ds}</div>
                  <div style={{fontSize:8,color:"rgba(200,220,255,0.2)",fontFamily:"'Exo 2',sans-serif",marginTop:1}}>{cnt} {"\u4EF6"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ARTICLE VIEW ─────────────────────────────────────────────────────────────
function ArticleView({ article }) {
  var [openSec, setOpenSec] = useState(0);
  useEffect(function() { setOpenSec(0); }, [article ? article.id : null]);

  if (!article) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
      <div style={{fontSize:40,opacity:0.07}}>{"\u25C8"}</div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,color:"rgba(255,255,255,0.1)",letterSpacing:"0.22em",textAlign:"center",lineHeight:2.6}}>
        RIGHT  {"\u25C0"}  WHEEL<br/>SELECT ARTICLE<br/>TO BEGIN
      </div>
      <div style={{display:"flex",gap:7,marginTop:4}}>
        {COLORS.slice(0,6).map(function(c,i){return(
          <div key={i} style={{width:6,height:6,borderRadius:1,background:c,opacity:0.2,animation:"pulseDot 2s ease-in-out "+i*0.28+"s infinite"}}/>
        );})}
      </div>
    </div>
  );

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"15px 28px 11px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7.5,color:article.color+"55",letterSpacing:"0.2em",marginBottom:4}}>
          {article.date.toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric"})} {"\u00B7"} TOPIC VIEWER
        </div>
        <h1 style={{fontFamily:"'Exo 2',sans-serif",fontSize:19,fontWeight:800,color:"#d8ecff",letterSpacing:"0.02em",lineHeight:1.2,marginBottom:4}}>{article.title}</h1>
        <div style={{fontSize:10.5,color:"rgba(190,215,255,0.38)",fontStyle:"italic",minHeight:1}}>{article.subtitle || ""}</div>
        <div style={{display:"flex",gap:5,marginTop:10,flexWrap:"wrap"}}>
          {article.sections.map(function(s,i){
            var ac = COLORS[i%COLORS.length];
            var active = openSec===i;
            return <button key={i} onClick={function(){setOpenSec(i);}} style={{padding:"2px 9px",borderRadius:3,border:"1px solid "+(active?ac+"55":"rgba(255,255,255,0.07)"),background:active?ac+"0f":"transparent",color:active?ac:"rgba(170,195,230,0.38)",fontSize:9,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",letterSpacing:"0.04em",transition:"all 0.15s",whiteSpace:"nowrap"}}>{s.title.length>16?s.title.slice(0,16)+"\u2026":s.title}</button>;
          })}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:"14px 28px 28px",WebkitOverflowScrolling:"touch",scrollbarWidth:"thin",scrollbarColor:"rgba(255,255,255,0.05) transparent"}}>
        {article.sections.map(function(sec,i){
          var ac = COLORS[i%COLORS.length];
          var open = openSec===i;
          return (
            <div key={i} style={{marginBottom:8,borderRadius:7,border:"1px solid "+(open?ac+"28":"rgba(255,255,255,0.05)"),overflow:"hidden",transition:"border-color 0.2s"}}>
              <div onClick={function(){setOpenSec(open?-1:i);}} style={{padding:"9px 13px",background:open?ac+"09":"rgba(255,255,255,0.01)",cursor:"pointer",display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:7,height:7,borderRadius:2,background:open?ac:"rgba(255,255,255,0.1)",transition:"background 0.2s",flexShrink:0}}/>
                <div style={{flex:1,fontSize:12,fontWeight:700,color:open?"rgba(215,232,255,0.9)":"rgba(170,195,230,0.45)",fontFamily:"'Exo 2',sans-serif"}}>{sec.title}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:open?ac+"70":"rgba(255,255,255,0.12)"}}>{open?"\u25B2":"\u25BC"}</div>
              </div>
              <div style={{maxHeight:open?2000:0,overflow:"hidden",transition:"max-height 0.32s cubic-bezier(0.4,0,0.2,1)"}}>
                <div style={{padding:"12px 13px 8px",background:"rgba(0,0,0,0.18)"}}>
                  {sec.blocks.map(function(b,bi){return <Block key={bi} block={b} accent={ac}/>;} )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FOLDER LOADER ────────────────────────────────────────────────────────────
function FolderLoader({ onLoad }) {
  var inputRef = useRef(null);
  var readFiles = function(files) {
    return Promise.all(Array.from(files).filter(function(f){return f.name.endsWith(".md");}).map(function(file){
      return new Promise(function(res){var r=new FileReader();r.onload=function(e){res({name:file.name,lastModified:new Date(file.lastModified),content:e.target.result});};r.readAsText(file);});
    })).then(onLoad);
  };
  var openDir = function() {
    if (window.showDirectoryPicker) {
      window.showDirectoryPicker({ id:"content", mode:"read" }).then(function(dir) {
        var files = [];
        var entries = dir.entries();
        function readNext() {
          return entries.next().then(function(result) {
            if (result.done) { onLoad(files); return; }
            var name = result.value[0], handle = result.value[1];
            if (name.endsWith(".md")) {
              return handle.getFile().then(function(f) {
                return f.text().then(function(text) {
                  files.push({name:name,lastModified:new Date(f.lastModified),content:text});
                  return readNext();
                });
              });
            }
            return readNext();
          });
        }
        return readNext();
      }).catch(function() { if (inputRef.current) inputRef.current.click(); });
    } else {
      if (inputRef.current) inputRef.current.click();
    }
  };
  return (
    <div>
      <input ref={inputRef} type="file" multiple accept=".md" style={{display:"none"}} onChange={function(e){readFiles(e.target.files);}} webkitdirectory=""/>
      <button onClick={openDir} style={{padding:"4px 11px",background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.22)",borderRadius:5,color:"rgba(0,229,255,0.65)",fontFamily:"'JetBrains Mono',monospace",fontSize:8,cursor:"pointer",letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:5,WebkitTapHighlightColor:"transparent"}}>{"\uD83D\uDCC1"} content/</button>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  var [rawFiles, setRawFiles] = useState(BUNDLED_FILES);
  var [activeId, setActiveId] = useState(null);
  var [dateFilter, setDateFilter] = useState(null);
  var [leftOpen, setLeftOpen] = useState(false);
  var [wheelOpen, setWheelOpen] = useState(false);

  var allArticles = rawFiles.map(function(f){return parseArticle(f.content,f.name,f.lastModified);}).sort(function(a,b){return b.date-a.date;});
  var articles = dateFilter ? allArticles.filter(function(a){return a.date.toLocaleDateString("ja-JP")===dateFilter;}) : allArticles;
  var activeArticle = articles.find(function(a){return a.id===activeId;})||null;

  return (
    <div style={{position:"fixed",inset:0,background:"#030810",overflow:"hidden"}}>
      {/* BG grid */}
      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(0,229,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.022) 1px,transparent 1px)",backgroundSize:"44px 44px",zIndex:0,pointerEvents:"none"}}/>
      <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse 80% 55% at 50% 30%,rgba(0,12,35,0.55),transparent)",zIndex:0,pointerEvents:"none"}}/>
      <div style={{position:"fixed",left:0,right:0,height:3,background:"linear-gradient(transparent,rgba(0,229,255,0.055),transparent)",zIndex:997,pointerEvents:"none",animation:"scanMove 6s linear infinite"}}/>

      {/* Top bar */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:800,height:50,background:"rgba(3,8,16,0.97)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(0,229,255,0.09)",display:"flex",alignItems:"center",padding:"0 18px",gap:13}}>
        <div style={{display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
          <div style={{width:27,height:27,borderRadius:7,background:"linear-gradient(135deg,#00e5ff12,#00e5ff06)",border:"1px solid #00e5ff28",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>{"\u25C8"}</div>
          <div>
            <div style={{fontWeight:800,fontSize:13,color:"#c8e8ff",letterSpacing:"0.1em",lineHeight:1}}>TOPIC VIEWER</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:6.5,color:"#00e5ff38",letterSpacing:"0.22em",marginTop:1}}>MD READER v1.0</div>
          </div>
        </div>
        <div style={{width:1,height:26,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
        <div style={{flex:1,overflow:"hidden",minWidth:0}}>
          <div style={{display:"flex",gap:56,animation:"ticker 30s linear infinite",whiteSpace:"nowrap"}}>
            {[0,1].map(function(k){return <span key={k} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8.5,color:"rgba(195,218,255,0.22)",letterSpacing:"0.04em"}}>{"\u25C8"} MD{"\u30D5\u30A1\u30A4\u30EB\u3092"}content/{"\u30D5\u30A9\u30EB\u30C0\u306B\u4FDD\u5B58\u3000\u25C6\u3000\u5DE6\u30D1\u30CD\u30EB\u3067\u65E5\u4ED8\u30D5\u30A3\u30EB\u30BF\u30FC\u3000\u25C6\u3000\u53F3\u30DB\u30A4\u30FC\u30EB\u3067\u8A18\u4E8B\u3092\u9078\u629E\u3000\u25C6\u3000\u30BB\u30AF\u30B7\u30E7\u30F3\u30BF\u30D6\u3067\u7D20\u65E9\u304F\u30B8\u30E3\u30F3\u30D7\u3000\u25C6\u3000"}content/ {"\u3092\u958B\u304F\u3067\u30D5\u30A9\u30EB\u30C0\u8AAD\u307F\u8FBC\u307F"}</span>;})}
          </div>
        </div>
        <FolderLoader onLoad={function(files){setRawFiles(files);setActiveId(null);setDateFilter(null);}}/>
        <div style={{display:"flex",alignItems:"center",gap:11,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"2px 7px",borderRadius:4,background:dateFilter?"rgba(255,176,0,0.07)":"transparent",border:dateFilter?"1px solid rgba(255,176,0,0.18)":"1px solid transparent",minHeight:1}}>
            <span style={{fontSize:8,fontFamily:"'JetBrains Mono',monospace",color:"#ffb300a0",opacity:dateFilter?1:0}}>{dateFilter||""}</span>
            <span onClick={function(){setDateFilter(null);}} style={{fontSize:9,color:"#ffb30060",cursor:"pointer",opacity:dateFilter?1:0}}>{"\u2715"}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#00ff88",animation:"pulseDot 1.8s ease-in-out infinite",boxShadow:"0 0 6px #00ff88"}}/>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7.5,color:"#00ff8855",letterSpacing:"0.15em"}}>LIVE</span>
          </div>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.16)"}}>{articles.length} DOCS</span>
        </div>
      </div>

      {/* Left date panel */}
      <LeftDatePanel allDates={allArticles.map(function(a){return a.date;})} activeDate={dateFilter} onSelect={setDateFilter} isOpen={leftOpen} onToggle={function(){setLeftOpen(function(v){return !v;});}}/>

      {/* Arc wheel */}
      <ArcWheel articles={articles} isOpen={wheelOpen} onToggle={function(){setWheelOpen(function(v){return !v;});}} onSelect={setActiveId}/>

      {/* Main content */}
      <div style={{position:"fixed",top:50,left:0,right:36,bottom:0,zIndex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <ArticleView article={activeArticle}/>
      </div>

      {/* Corners */}
      <div style={{position:"fixed",top:51,left:0,width:14,height:14,zIndex:998,borderTop:"1px solid rgba(0,229,255,0.13)",borderLeft:"1px solid rgba(0,229,255,0.13)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",top:51,right:0,width:14,height:14,zIndex:998,borderTop:"1px solid rgba(0,229,255,0.13)",borderRight:"1px solid rgba(0,229,255,0.13)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:0,left:0,width:14,height:14,zIndex:998,borderBottom:"1px solid rgba(0,229,255,0.13)",borderLeft:"1px solid rgba(0,229,255,0.13)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:0,right:0,width:14,height:14,zIndex:998,borderBottom:"1px solid rgba(0,229,255,0.13)",borderRight:"1px solid rgba(0,229,255,0.13)",pointerEvents:"none"}}/>
    </div>
  );
}
