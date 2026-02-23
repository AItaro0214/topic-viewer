import { useState, useRef, useEffect, useCallback } from "react";

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
    if (line.trim().startsWith("|") && lines[i+1]?.trim().match(/^\|[-:| ]+\|/)) {
      const headers = line.split("|").filter(c=>c.trim()).map(c=>c.trim());
      i += 2; const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").filter(c=>c.trim()).map(c=>c.trim())); i++;
      }
      out.push({ type:"table", headers, rows }); continue;
    }
    if (line.startsWith("> ")) {
      let t = ""; while (i < lines.length && lines[i].startsWith("> ")) { t += lines[i].slice(2) + " "; i++; }
      out.push({ type:"quote", text:t.trim() }); continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items = []; while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, "").trim()); i++; }
      out.push({ type:"olist", items }); continue;
    }
    if (/^[-*]\s/.test(line)) {
      const items = []; while (i < lines.length && /^[-*]\s/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s/, "").trim()); i++; }
      out.push({ type:"list", items }); continue;
    }
    if (line.trim() && !line.startsWith("#")) {
      let t = line; i++;
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith("|") && !lines[i].startsWith(">") && !/^[-*\d]/.test(lines[i].trim())) { t += " " + lines[i]; i++; }
      out.push({ type:"p", text:t.trim() }); continue;
    }
    i++;
  }
  return out;
}

function inl(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

// ─── BLOCK RENDERER ──────────────────────────────────────────────────────────
function Block({ block, accent }) {
  switch (block.type) {
    case "p":
      return <p style={{fontSize:12,lineHeight:1.8,color:"rgba(210,228,255,0.7)",marginBottom:10}} dangerouslySetInnerHTML={{__html:inl(block.text)}}/>;
    case "quote":
      return <blockquote style={{borderLeft:`3px solid ${accent}`,margin:"0 0 12px",padding:"8px 12px",background:`${accent}0a`,borderRadius:"0 5px 5px 0",fontSize:11,color:`${accent}c0`,lineHeight:1.75,fontStyle:"italic"}} dangerouslySetInnerHTML={{__html:inl(block.text)}}/>;
    case "list":
      return <ul style={{margin:"0 0 10px",padding:0,listStyle:"none"}}>{block.items.map((item,i)=>(
        <li key={i} style={{display:"flex",gap:7,marginBottom:5,fontSize:11.5,lineHeight:1.65,color:"rgba(200,218,255,0.62)",alignItems:"flex-start"}}>
          <span style={{color:accent,flexShrink:0,fontSize:7,marginTop:5}}>&#9654;</span>
          <span dangerouslySetInnerHTML={{__html:inl(item)}}/>
        </li>
      ))}</ul>;
    case "olist":
      return <ol style={{margin:"0 0 10px",padding:0,listStyle:"none"}}>{block.items.map((item,i)=>(
        <li key={i} style={{display:"flex",gap:7,marginBottom:5,fontSize:11.5,lineHeight:1.65,color:"rgba(200,218,255,0.62)",alignItems:"flex-start"}}>
          <span style={{color:accent,flexShrink:0,fontFamily:"'JetBrains Mono',monospace",fontSize:9,minWidth:16,textAlign:"right",paddingTop:2}}>{i+1}.</span>
          <span dangerouslySetInnerHTML={{__html:inl(item)}}/>
        </li>
      ))}</ol>;
    case "table":
      return (
        <div style={{overflowX:"auto",marginBottom:12}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{block.headers.map((h,i)=>(
              <th key={i} style={{padding:"4px 8px",textAlign:"left",color:accent,fontFamily:"'JetBrains Mono',monospace",fontSize:8.5,letterSpacing:"0.1em",borderBottom:`1px solid ${accent}40`,fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>
            ))}</tr></thead>
            <tbody>{block.rows.map((row,ri)=>(
              <tr key={ri} style={{background:ri%2===0?"rgba(255,255,255,0.02)":"transparent"}}>
                {row.map((cell,ci)=>(
                  <td key={ci} style={{padding:"4px 8px",color:ci===0?"rgba(215,232,255,0.85)":"rgba(175,198,230,0.48)",borderBottom:"1px solid rgba(255,255,255,0.035)",lineHeight:1.55,fontSize:ci===0?10.5:10}} dangerouslySetInnerHTML={{__html:inl(cell)}}/>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
      );
    default: return null;
  }
}

// ─── ARC WHEEL ───────────────────────────────────────────────────────────────
const R = 200;
const CARD_W = 190;
const CARD_H = 68;
const SEMICIRCLE_W = 36;
const CARD_PUSH = R - SEMICIRCLE_W;
const SENS = 0.62;
const VISIBLE_ARC = 110;

function ArcWheel({ articles, isOpen, onToggle, onSelect }) {
  const n = articles.length;
  const STEP = n > 1 ? Math.min(360 / n, 46) : 46;

  const [rotOffset, setRotOffset] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const dragRef = useRef(null);
  const overlayRef = useRef(null);

  const getEffAngle = useCallback((i, off) => ((i * STEP + off) % 360 + 360) % 360, [STEP]);

  const distFrom180 = useCallback((i, off) => {
    const eff = getEffAngle(i, off);
    const d = Math.abs(eff - 180);
    return d > 180 ? 360 - d : d;
  }, [getEffAngle]);

  const getActiveIdx = useCallback((off) => {
    if (!n) return 0;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = distFrom180(i, off);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }, [n, distFrom180]);

  const snapToIdx = useCallback((idx, currentOff) => {
    const target = 180 - idx * STEP;
    const raw = ((target - currentOff + 180) % 360 + 360) % 360 - 180;
    return currentOff + raw;
  }, [STEP]);

  const doSnap = useCallback((rawOff) => {
    const idx = getActiveIdx(rawOff);
    setIsSnapping(true);
    setRotOffset(snapToIdx(idx, rawOff));
    setTimeout(() => setIsSnapping(false), 420);
    dragRef.current = null;
  }, [getActiveIdx, snapToIdx]);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el || !isOpen) return;

    const onTouchStart = (e) => {
      dragRef.current = { startY: e.touches[0].clientY, startOff: rotOffset, moved: false };
    };
    const onTouchMove = (e) => {
      if (!dragRef.current) return;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      if (Math.abs(dy) > 6) {
        e.preventDefault();
        dragRef.current.moved = true;
        setRotOffset(dragRef.current.startOff + dy * SENS);
      }
    };
    const onTouchEnd = (e) => {
      if (!dragRef.current) return;
      if (dragRef.current.moved) {
        const dy = e.changedTouches[0].clientY - dragRef.current.startY;
        doSnap(dragRef.current.startOff + dy * SENS);
      }
      dragRef.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, [isOpen, rotOffset, doSnap]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY, startOff = rotOffset;
    const onMove = (e) => setRotOffset(startOff + (e.clientY - startY) * SENS);
    const onUp   = (e) => {
      doSnap(startOff + (e.clientY - startY) * SENS);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }, [rotOffset, doSnap]);

  const activeIdx = getActiveIdx(rotOffset);

  const handleCardClick = (i) => {
    if (i === activeIdx) {
      onSelect(articles[i].id);
      onToggle();
    } else {
      const snapped = snapToIdx(i, rotOffset);
      setIsSnapping(true);
      setRotOffset(snapped);
      setTimeout(() => setIsSnapping(false), 450);
    }
  };

  return (
    <>
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
          boxShadow:`-4px 0 24px rgba(0,229,255,${isOpen?"0.12":"0.05"})`,
          transition:"background 0.3s, box-shadow 0.3s",
          userSelect:"none",
        }}
      >
        <div style={{width:14,height:1,background:`rgba(0,229,255,${isOpen?"0.9":"0.5"})`,transition:"background 0.3s",borderRadius:1}}/>
        <div style={{width:10,height:1,background:`rgba(0,229,255,${isOpen?"0.6":"0.3"})`,transition:"background 0.3s",borderRadius:1}}/>
        <div style={{width:14,height:1,background:`rgba(0,229,255,${isOpen?"0.9":"0.5"})`,transition:"background 0.3s",borderRadius:1}}/>
        <div style={{marginTop:3,fontSize:8,color:`rgba(0,229,255,${isOpen?"0.8":"0.4"})`,fontFamily:"'JetBrains Mono',monospace",transition:"all 0.3s"}}>
          {isOpen ? "\u25B6" : "\u25C0"}
        </div>
      </div>

      {isOpen && (
        <div
          ref={overlayRef}
          style={{
            position:"fixed", right:0, top:0, bottom:0,
            width: R + CARD_W + 20,
            zIndex:790,
            pointerEvents:"auto",
            touchAction:"none",
          }}
          onMouseDown={handleMouseDown}
        >
          <div
            onClick={onToggle}
            style={{position:"absolute",inset:0,background:"linear-gradient(270deg,rgba(3,8,16,0.85),rgba(3,8,16,0.4))",cursor:"pointer"}}
          />

          <div style={{
            position:"absolute",
            right:0,
            top:"50%",
            transform:"translateY(-50%)",
            width:0, height:0,
          }}>
            {articles.map((a, i) => {
              const angleDeg = getEffAngle(i, rotOffset);
              const distDeg = distFrom180(i, rotOffset);
              const isActive = i === activeIdx;

              if (distDeg > VISIBLE_ARC) return null;

              const rad = (angleDeg * Math.PI) / 180;
              const cx = R * Math.cos(rad);
              const cy = R * Math.sin(rad);

              const t = distDeg / VISIBLE_ARC;
              const opacity = isActive ? 1 : Math.max(0, 1 - t * 1.1);
              const scale = isActive ? 1 : 0.88 - t * 0.15;
              const accent = a.color;

              return (
                <div
                  key={a.id}
                  onClick={(e) => { e.stopPropagation(); handleCardClick(i); }}
                  style={{
                    position:"absolute",
                    left: cx - CARD_W + CARD_PUSH,
                    top: cy - CARD_H / 2,
                    width: CARD_W,
                    height: CARD_H,
                    cursor: "pointer",
                    opacity,
                    transform: `scale(${scale})`,
                    transformOrigin: "right center",
                    transition: isSnapping
                      ? "opacity 0.38s ease, transform 0.38s ease"
                      : "opacity 0.15s ease, transform 0.15s ease",
                    userSelect:"none",
                    zIndex: isActive ? 10 : 5,
                  }}
                >
                  <div style={{
                    width:"100%", height:"100%",
                    background: isActive
                      ? `linear-gradient(135deg, ${accent}1a, ${accent}0d)`
                      : "rgba(6,15,26,0.88)",
                    border:`1px solid ${isActive ? accent+"55" : "rgba(255,255,255,0.07)"}`,
                    borderLeft:`3px solid ${isActive ? accent : "rgba(255,255,255,0.1)"}`,
                    borderRadius:"8px 0 0 8px",
                    padding:"8px 12px 8px 10px",
                    backdropFilter:"blur(12px)",
                    boxShadow: isActive
                      ? `-4px 0 30px rgba(0,0,0,0.5), 0 0 20px ${accent}10`
                      : "-2px 0 12px rgba(0,0,0,0.4)",
                    transition:"border-color 0.3s, background 0.3s, box-shadow 0.3s",
                    display:"flex", flexDirection:"column", justifyContent:"center",
                    overflow:"hidden",
                  }}>
                    <div style={{
                      fontFamily:"'JetBrains Mono',monospace",
                      fontSize:7.5,
                      color: isActive ? `${accent}90` : "rgba(255,255,255,0.25)",
                      letterSpacing:"0.12em",
                      marginBottom:4,
                      transition:"color 0.3s",
                    }}>
                      {a.date.toLocaleDateString("ja-JP")} \u00B7 {a.sections.length}sec
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
                    {isActive && (
                      <div style={{
                        marginTop:5,
                        fontSize:8,
                        color:`${accent}70`,
                        fontFamily:"'JetBrains Mono',monospace",
                        letterSpacing:"0.1em",
                        display:"flex",
                        alignItems:"center",
                        gap:5,
                        animation:"fadeUp 0.3s ease both",
                      }}>
                        <span style={{width:4,height:4,borderRadius:"50%",background:accent,display:"inline-block",animation:"pulseDot 1.6s ease-in-out infinite"}}/>
                        TAP TO OPEN
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(3,8,16,0.7) 0%,transparent 18%,transparent 82%,rgba(3,8,16,0.7) 100%)",pointerEvents:"none",zIndex:20}}/>
          <div style={{position:"absolute",right:46,top:"50%",transform:"translateY(calc(-50% + 52px))",fontFamily:"'JetBrains Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.13)",letterSpacing:"0.15em",pointerEvents:"none",zIndex:21}}>{"\u2195"} DRAG</div>
        </div>
      )}
    </>
  );
}

// ─── LEFT DATE PANEL ─────────────────────────────────────────────────────────
function LeftDatePanel({ allDates, activeDate, onSelect, isOpen, onToggle }) {
  const sorted = [...new Set(allDates.map(d => d.toLocaleDateString("ja-JP")))].sort().reverse();
  return (
    <>
      <div onClick={onToggle} style={{position:"fixed",left:isOpen?232:0,top:"50%",transform:"translateY(-50%)",width:32,height:88,zIndex:750,background:"linear-gradient(90deg,rgba(255,176,0,0.1),rgba(255,176,0,0.03))",borderRadius:"0 44px 44px 0",border:"1px solid rgba(255,176,0,0.28)",borderLeft:"none",cursor:"pointer",transition:"left 0.35s cubic-bezier(0.4,0,0.2,1)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,boxShadow:"3px 0 16px rgba(255,176,0,0.06)",userSelect:"none"}}>
        <div style={{fontSize:11}}>{"\uD83D\uDCC5"}</div>
        <div style={{width:12,height:1,background:"rgba(255,176,0,0.4)",borderRadius:1}}/>
        <div style={{width:8,height:1,background:"rgba(255,176,0,0.25)",borderRadius:1}}/>
        <div style={{fontSize:7,color:"rgba(255,176,0,0.45)",fontFamily:"'JetBrains Mono',monospace",marginTop:1}}>{isOpen?"\u25C0":"\u25B6"}</div>
      </div>
      <div style={{position:"fixed",left:0,top:50,bottom:0,width:232,zIndex:740,background:"linear-gradient(180deg,#06100a,#04090f)",borderRight:"1px solid rgba(255,176,0,0.1)",transform:isOpen?"translateX(0)":"translateX(-100%)",transition:"transform 0.35s cubic-bezier(0.4,0,0.2,1)",display:"flex",flexDirection:"column",boxShadow:"10px 0 40px rgba(0,0,0,0.6)"}}>
        <div style={{padding:"13px 16px 9px",borderBottom:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7.5,color:"rgba(255,176,0,0.45)",letterSpacing:"0.2em",marginBottom:2}}>DATE FILTER</div>
          <div style={{fontSize:10.5,color:"rgba(200,220,200,0.3)",fontFamily:"'Exo 2',sans-serif"}}>MD\u30D5\u30A1\u30A4\u30EB\u306E\u4FDD\u5B58\u65E5\u6642</div>
        </div>
        <div onClick={()=>{onSelect(null);onToggle();}} style={{padding:"10px 16px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.04)",background:activeDate===null?"rgba(255,176,0,0.07)":"transparent",display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:6,height:6,borderRadius:1,background:activeDate===null?"#ffb300":"rgba(255,255,255,0.15)"}}/>
          <span style={{fontSize:11.5,color:activeDate===null?"#ffb300":"rgba(200,220,255,0.45)",fontFamily:"'Exo 2',sans-serif",fontWeight:activeDate===null?700:400}}>{"\u3059\u3079\u3066\u306E\u65E5\u4ED8"}</span>
        </div>
        <div style={{flex:1,overflowY:"auto",scrollbarWidth:"none"}}>
          {sorted.map(ds => {
            const active = activeDate===ds;
            const cnt = allDates.filter(d=>d.toLocaleDateString("ja-JP")===ds).length;
            return (
              <div key={ds} onClick={()=>{onSelect(ds);onToggle();}} style={{padding:"9px 16px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.03)",background:active?"rgba(255,176,0,0.07)":"transparent",display:"flex",alignItems:"center",gap:8,transition:"background 0.15s"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:active?"#ffb300":"rgba(255,255,255,0.1)",boxShadow:active?"0 0 6px #ffb300":"none",flexShrink:0,transition:"all 0.2s"}}/>
                <div>
                  <div style={{fontSize:11,color:active?"#ffb300":"rgba(200,220,255,0.5)",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",fontWeight:active?700:400}}>{ds}</div>
                  <div style={{fontSize:8,color:"rgba(200,220,255,0.2)",fontFamily:"'Exo 2',sans-serif",marginTop:1}}>{cnt} \u4EF6</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── ARTICLE VIEW ─────────────────────────────────────────────────────────────
function ArticleView({ article }) {
  const [openSec, setOpenSec] = useState(0);
  useEffect(() => setOpenSec(0), [article?.id]);

  if (!article) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
      <div style={{fontSize:40,opacity:0.07}}>{"\u25C8"}</div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,color:"rgba(255,255,255,0.1)",letterSpacing:"0.22em",textAlign:"center",lineHeight:2.6}}>
        RIGHT  {"\u25C0"}  WHEEL<br/>SELECT ARTICLE<br/>TO BEGIN
      </div>
      <div style={{display:"flex",gap:7,marginTop:4}}>
        {COLORS.slice(0,6).map((c,i)=>(
          <div key={i} style={{width:6,height:6,borderRadius:1,background:c,opacity:0.2,animation:`pulseDot 2s ease-in-out ${i*0.28}s infinite`}}/>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeUp 0.3s ease both"}}>
      <div style={{padding:"15px 28px 11px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7.5,color:`${article.color}55`,letterSpacing:"0.2em",marginBottom:4}}>
          {article.date.toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric"})} \u00B7 TOPIC VIEWER
        </div>
        <h1 style={{fontFamily:"'Exo 2',sans-serif",fontSize:19,fontWeight:800,color:"#d8ecff",letterSpacing:"0.02em",lineHeight:1.2,marginBottom:4}}>{article.title}</h1>
        {article.subtitle && <div style={{fontSize:10.5,color:"rgba(190,215,255,0.38)",fontStyle:"italic"}}>{article.subtitle}</div>}
        <div style={{display:"flex",gap:5,marginTop:10,flexWrap:"wrap"}}>
          {article.sections.map((s,i)=>{
            const ac = COLORS[i%COLORS.length];
            const active = openSec===i;
            return <button key={i} onClick={()=>setOpenSec(i)} style={{padding:"2px 9px",borderRadius:3,border:`1px solid ${active?ac+"55":"rgba(255,255,255,0.07)"}`,background:active?`${ac}0f`:"transparent",color:active?ac:"rgba(170,195,230,0.38)",fontSize:9,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",letterSpacing:"0.04em",transition:"all 0.15s",whiteSpace:"nowrap"}}>{s.title.length>16?s.title.slice(0,16)+"\u2026":s.title}</button>;
          })}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:"14px 28px 28px",WebkitOverflowScrolling:"touch",scrollbarWidth:"thin",scrollbarColor:"rgba(255,255,255,0.05) transparent"}}>
        {article.sections.map((sec,i)=>{
          const ac = COLORS[i%COLORS.length];
          const open = openSec===i;
          return (
            <div key={i} style={{marginBottom:8,borderRadius:7,border:`1px solid ${open?ac+"28":"rgba(255,255,255,0.05)"}`,overflow:"hidden",transition:"border-color 0.2s"}}>
              <div onClick={()=>setOpenSec(open?-1:i)} style={{padding:"9px 13px",background:open?`${ac}09`:"rgba(255,255,255,0.01)",cursor:"pointer",display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:7,height:7,borderRadius:2,background:open?ac:"rgba(255,255,255,0.1)",transition:"background 0.2s",flexShrink:0}}/>
                <div style={{flex:1,fontSize:12,fontWeight:700,color:open?"rgba(215,232,255,0.9)":"rgba(170,195,230,0.45)",fontFamily:"'Exo 2',sans-serif"}}>{sec.title}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:open?`${ac}70`:"rgba(255,255,255,0.12)"}}>{open?"\u25B2":"\u25BC"}</div>
              </div>
              <div style={{maxHeight:open?700:0,overflow:"hidden",transition:"max-height 0.32s cubic-bezier(0.4,0,0.2,1)"}}>
                <div style={{padding:"12px 13px 8px",background:"rgba(0,0,0,0.18)"}}>
                  {sec.blocks.map((b,bi)=><Block key={bi} block={b} accent={ac}/>)}
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
  const inputRef = useRef(null);
  const readFiles = (files) => Promise.all(Array.from(files).filter(f=>f.name.endsWith(".md")).map(file=>new Promise(res=>{const r=new FileReader();r.onload=e=>res({name:file.name,lastModified:new Date(file.lastModified),content:e.target.result});r.readAsText(file);}))).then(onLoad);
  const openDir = async () => {
    try {
      const dir = await window.showDirectoryPicker({ id:"content", mode:"read" });
      const files = [];
      for await (const [name, handle] of dir.entries()) {
        if (name.endsWith(".md")) { const f=await handle.getFile(); files.push({name,lastModified:new Date(f.lastModified),content:await f.text()}); }
      }
      onLoad(files);
    } catch { inputRef.current?.click(); }
  };
  return (
    <>
      <input ref={inputRef} type="file" multiple accept=".md" style={{display:"none"}} onChange={e=>readFiles(e.target.files)} webkitdirectory=""/>
      <button onClick={openDir} style={{padding:"4px 11px",background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.22)",borderRadius:5,color:"rgba(0,229,255,0.65)",fontFamily:"'JetBrains Mono',monospace",fontSize:8,cursor:"pointer",letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:5}}>{"\uD83D\uDCC1"} content/</button>
    </>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [rawFiles, setRawFiles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);

  const allArticles = rawFiles.map(f=>parseArticle(f.content,f.name,f.lastModified)).sort((a,b)=>b.date-a.date);
  const articles = dateFilter ? allArticles.filter(a=>a.date.toLocaleDateString("ja-JP")===dateFilter) : allArticles;
  const activeArticle = articles.find(a=>a.id===activeId)||null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Exo+2:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#030810;min-height:100vh;font-family:'Exo 2',sans-serif;overflow:hidden;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.07);border-radius:2px;}
        strong{font-weight:700;} em{font-style:italic;}
        code{font-family:'JetBrains Mono',monospace;background:rgba(255,255,255,0.07);padding:1px 4px;border-radius:3px;font-size:0.87em;}
        blockquote{margin:0;}
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanMove{0%{top:-3px}100%{top:100%}}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
      `}</style>

      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(0,229,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.022) 1px,transparent 1px)",backgroundSize:"44px 44px",zIndex:0,pointerEvents:"none"}}/>
      <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse 80% 55% at 50% 30%,rgba(0,12,35,0.55),transparent)",zIndex:0,pointerEvents:"none"}}/>
      <div style={{position:"fixed",left:0,right:0,height:3,background:"linear-gradient(transparent,rgba(0,229,255,0.055),transparent)",zIndex:997,pointerEvents:"none",animation:"scanMove 6s linear infinite"}}/>

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
            {[0,1].map(k=><span key={k} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8.5,color:"rgba(195,218,255,0.22)",letterSpacing:"0.04em"}}>{"\u25C8"} MD\u30D5\u30A1\u30A4\u30EB\u3092content/\u30D5\u30A9\u30EB\u30C0\u306B\u4FDD\u5B58\u3000\u25C6\u3000\u5DE6\u30D1\u30CD\u30EB\u3067\u65E5\u4ED8\u30D5\u30A3\u30EB\u30BF\u30FC\u3000\u25C6\u3000\u53F3\u30DB\u30A4\u30FC\u30EB\u3067\u8A18\u4E8B\u3092\u9078\u629E\u3000\u25C6\u3000\u30BB\u30AF\u30B7\u30E7\u30F3\u30BF\u30D6\u3067\u7D20\u65E9\u304F\u30B8\u30E3\u30F3\u30D7\u3000\u25C6\u3000content/ \u3092\u958B\u304F\u3067\u30D5\u30A9\u30EB\u30C0\u8AAD\u307F\u8FBC\u307F</span>)}
          </div>
        </div>
        <FolderLoader onLoad={files=>{setRawFiles(files);setActiveId(null);setDateFilter(null);}}/>
        <div style={{display:"flex",alignItems:"center",gap:11,flexShrink:0}}>
          {dateFilter&&<div style={{display:"flex",alignItems:"center",gap:5,padding:"2px 7px",borderRadius:4,background:"rgba(255,176,0,0.07)",border:"1px solid rgba(255,176,0,0.18)"}}><span style={{fontSize:8,fontFamily:"'JetBrains Mono',monospace",color:"#ffb300a0"}}>{dateFilter}</span><span onClick={()=>setDateFilter(null)} style={{fontSize:9,color:"#ffb30060",cursor:"pointer"}}>{"\u2715"}</span></div>}
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#00ff88",animation:"pulseDot 1.8s ease-in-out infinite",boxShadow:"0 0 6px #00ff88"}}/>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7.5,color:"#00ff8855",letterSpacing:"0.15em"}}>LIVE</span>
          </div>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.16)"}}>{articles.length} DOCS</span>
        </div>
      </div>

      <LeftDatePanel allDates={allArticles.map(a=>a.date)} activeDate={dateFilter} onSelect={setDateFilter} isOpen={leftOpen} onToggle={()=>setLeftOpen(v=>!v)}/>

      <ArcWheel articles={articles} isOpen={wheelOpen} onToggle={()=>setWheelOpen(v=>!v)} onSelect={setActiveId}/>

      <div style={{position:"fixed",top:50,left:0,right:36,bottom:0,zIndex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <ArticleView article={activeArticle}/>
      </div>

      {[{top:51,left:0,bT:1,bL:1},{top:51,right:0,bT:1,bR:1},{bottom:0,left:0,bB:1,bL:1},{bottom:0,right:0,bB:1,bR:1}].map((s,i)=>(
        <div key={i} style={{position:"fixed",top:s.top,bottom:s.bottom,left:s.left,right:s.right,width:14,height:14,zIndex:998,borderStyle:"solid",borderColor:"rgba(0,229,255,0.13)",borderWidth:0,borderTopWidth:s.bT||0,borderBottomWidth:s.bB||0,borderLeftWidth:s.bL||0,borderRightWidth:s.bR||0,pointerEvents:"none"}}/>
      ))}
    </>
  );
}
