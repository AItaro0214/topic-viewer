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

function Inl({ text }) {
  if (!text) return null;
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m, key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={key++}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={key++}>{m[4]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// ─── BLOCK RENDERER ──────────────────────────────────────────────────────────
function Block({ block, accent }) {
  switch (block.type) {
    case "p":
      return <p style={{fontSize:12,lineHeight:1.8,color:"rgba(210,228,255,0.7)",marginBottom:10}}><Inl text={block.text}/></p>;
    case "quote":
      return <blockquote style={{borderLeft:`3px solid ${accent}`,margin:"0 0 12px",padding:"8px 12px",background:`${accent}0a`,borderRadius:"0 5px 5px 0",fontSize:11,color:`${accent}c0`,lineHeight:1.75,fontStyle:"italic"}}><Inl text={block.text}/></blockquote>;
    case "list":
      return <ul style={{margin:"0 0 10px",padding:0,listStyle:"none"}}>{block.items.map((item,i)=>(
        <li key={i} style={{display:"flex",gap:7,marginBottom:5,fontSize:11.5,lineHeight:1.65,color:"rgba(200,218,255,0.62)",alignItems:"flex-start"}}>
          <span style={{color:accent,flexShrink:0,fontSize:7,marginTop:5}}>&#9654;</span>
          <span><Inl text={item}/></span>
        </li>
      ))}</ul>;
    case "olist":
      return <ol style={{margin:"0 0 10px",padding:0,listStyle:"none"}}>{block.items.map((item,i)=>(
        <li key={i} style={{display:"flex",gap:7,marginBottom:5,fontSize:11.5,lineHeight:1.65,color:"rgba(200,218,255,0.62)",alignItems:"flex-start"}}>
          <span style={{color:accent,flexShrink:0,fontFamily:"'JetBrains Mono',monospace",fontSize:9,minWidth:16,textAlign:"right",paddingTop:2}}>{i+1}.</span>
          <span><Inl text={item}/></span>
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
                  <td key={ci} style={{padding:"4px 8px",color:ci===0?"rgba(215,232,255,0.85)":"rgba(175,198,230,0.48)",borderBottom:"1px solid rgba(255,255,255,0.035)",lineHeight:1.55,fontSize:ci===0?10.5:10}}><Inl text={cell}/></td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
      );
    default: return null;
  }
}

// ─── SIMPLE LIST SELECTOR (replacing ArcWheel) ──────────────────────────────
function ArticleList({ articles, activeId, onSelect }) {
  if (articles.length === 0) return null;
  return (
    <div style={{
      position:"fixed", right:0, top:50, bottom:0, width:240, zIndex:790,
      background:"rgba(3,8,16,0.97)", borderLeft:"1px solid rgba(0,229,255,0.09)",
      display:"flex", flexDirection:"column", overflow:"hidden",
    }}>
      <div style={{padding:"12px 14px 8px",borderBottom:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7.5,color:"rgba(0,229,255,0.45)",letterSpacing:"0.2em"}}>ARTICLES</div>
      </div>
      <div style={{flex:1,overflowY:"auto",scrollbarWidth:"none"}}>
        {articles.map((a) => {
          const active = a.id === activeId;
          return (
            <div key={a.id} onClick={()=>onSelect(a.id)} style={{
              padding:"10px 14px", cursor:"pointer",
              borderBottom:"1px solid rgba(255,255,255,0.03)",
              background: active ? `${a.color}0f` : "transparent",
              borderLeft: active ? `3px solid ${a.color}` : "3px solid transparent",
              transition:"background 0.15s, border-color 0.15s",
            }}>
              <div style={{
                fontFamily:"'JetBrains Mono',monospace", fontSize:7.5,
                color: active ? `${a.color}90` : "rgba(255,255,255,0.25)",
                letterSpacing:"0.1em", marginBottom:3,
              }}>
                {a.date.toLocaleDateString("ja-JP")} · {a.sections.length}sec
              </div>
              <div style={{
                fontSize:11.5, fontWeight:700, lineHeight:1.35,
                color: active ? "rgba(220,236,255,0.94)" : "rgba(180,205,240,0.5)",
                fontFamily:"'Exo 2',sans-serif",
              }}>
                {a.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LEFT DATE PANEL ─────────────────────────────────────────────────────────
function LeftDatePanel({ allDates, activeDate, onSelect }) {
  const sorted = [...new Set(allDates.map(d => d.toLocaleDateString("ja-JP")))].sort().reverse();
  if (sorted.length <= 1) return null;
  return (
    <div style={{padding:"0 14px 8px",borderBottom:"1px solid rgba(255,255,255,0.04)",flexShrink:0}}>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7,color:"rgba(255,176,0,0.4)",letterSpacing:"0.15em",marginBottom:4}}>DATE</div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        <span onClick={()=>onSelect(null)} style={{
          padding:"1px 7px",borderRadius:3,cursor:"pointer",fontSize:9,
          fontFamily:"'JetBrains Mono',monospace",
          background:activeDate===null?"rgba(255,176,0,0.12)":"transparent",
          color:activeDate===null?"#ffb300":"rgba(200,220,255,0.35)",
          border:`1px solid ${activeDate===null?"rgba(255,176,0,0.3)":"rgba(255,255,255,0.06)"}`,
        }}>ALL</span>
        {sorted.map(ds=>(
          <span key={ds} onClick={()=>onSelect(ds)} style={{
            padding:"1px 7px",borderRadius:3,cursor:"pointer",fontSize:9,
            fontFamily:"'JetBrains Mono',monospace",
            background:activeDate===ds?"rgba(255,176,0,0.12)":"transparent",
            color:activeDate===ds?"#ffb300":"rgba(200,220,255,0.35)",
            border:`1px solid ${activeDate===ds?"rgba(255,176,0,0.3)":"rgba(255,255,255,0.06)"}`,
          }}>{ds}</span>
        ))}
      </div>
    </div>
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
        SELECT ARTICLE<br/>TO BEGIN
      </div>
    </div>
  );

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"15px 20px 11px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7.5,color:`${article.color}55`,letterSpacing:"0.2em",marginBottom:4}}>
          {article.date.toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric"})} · TOPIC VIEWER
        </div>
        <h1 style={{fontFamily:"'Exo 2',sans-serif",fontSize:19,fontWeight:800,color:"#d8ecff",letterSpacing:"0.02em",lineHeight:1.2,marginBottom:4}}>{article.title}</h1>
        {article.subtitle ? <div style={{fontSize:10.5,color:"rgba(190,215,255,0.38)",fontStyle:"italic"}}>{article.subtitle}</div> : null}
        <div style={{display:"flex",gap:5,marginTop:10,flexWrap:"wrap"}}>
          {article.sections.map((s,i)=>{
            const ac = COLORS[i%COLORS.length];
            const active = openSec===i;
            return <button key={i} onClick={()=>setOpenSec(i)} style={{padding:"2px 9px",borderRadius:3,border:`1px solid ${active?ac+"55":"rgba(255,255,255,0.07)"}`,background:active?`${ac}0f`:"transparent",color:active?ac:"rgba(170,195,230,0.38)",fontSize:9,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",letterSpacing:"0.04em",transition:"all 0.15s",whiteSpace:"nowrap"}}>{s.title.length>16?s.title.slice(0,16)+"\u2026":s.title}</button>;
          })}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:"14px 20px 28px",WebkitOverflowScrolling:"touch",scrollbarWidth:"thin",scrollbarColor:"rgba(255,255,255,0.05) transparent"}}>
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
              <div style={{maxHeight:open?2000:0,overflow:"hidden",transition:"max-height 0.32s cubic-bezier(0.4,0,0.2,1)"}}>
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
    <div>
      <input ref={inputRef} type="file" multiple accept=".md" style={{display:"none"}} onChange={e=>readFiles(e.target.files)} webkitdirectory=""/>
      <button onClick={openDir} style={{padding:"4px 11px",background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.22)",borderRadius:5,color:"rgba(0,229,255,0.65)",fontFamily:"'JetBrains Mono',monospace",fontSize:8,cursor:"pointer",letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:5}}>{"\uD83D\uDCC1"} content/</button>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [rawFiles, setRawFiles] = useState(BUNDLED_FILES);
  const [activeId, setActiveId] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);

  const allArticles = rawFiles.map(f=>parseArticle(f.content,f.name,f.lastModified)).sort((a,b)=>b.date-a.date);
  const articles = dateFilter ? allArticles.filter(a=>a.date.toLocaleDateString("ja-JP")===dateFilter) : allArticles;
  const activeArticle = articles.find(a=>a.id===activeId)||null;

  return (
    <div style={{position:"fixed",inset:0,background:"#030810",display:"flex",flexDirection:"column"}}>
      {/* Top bar */}
      <div style={{height:50,flexShrink:0,background:"rgba(3,8,16,0.97)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(0,229,255,0.09)",display:"flex",alignItems:"center",padding:"0 14px",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{width:24,height:24,borderRadius:6,background:"linear-gradient(135deg,#00e5ff12,#00e5ff06)",border:"1px solid #00e5ff28",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{"\u25C8"}</div>
          <div>
            <div style={{fontWeight:800,fontSize:12,color:"#c8e8ff",letterSpacing:"0.1em",lineHeight:1}}>TOPIC VIEWER</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:6,color:"#00e5ff38",letterSpacing:"0.2em",marginTop:1}}>MD READER v1.0</div>
          </div>
        </div>
        <div style={{flex:1}}/>
        <FolderLoader onLoad={files=>{setRawFiles(files);setActiveId(null);setDateFilter(null);}}/>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#00ff88",boxShadow:"0 0 6px #00ff88"}}/>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7,color:"#00ff8855",letterSpacing:"0.1em"}}>LIVE</span>
        </div>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.16)"}}>{articles.length} DOCS</span>
      </div>

      {/* Main area */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Article content */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <ArticleView article={activeArticle}/>
        </div>
        {/* Right sidebar */}
        <div style={{width:240,flexShrink:0,borderLeft:"1px solid rgba(0,229,255,0.09)",background:"rgba(3,8,16,0.97)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"12px 14px 8px",borderBottom:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7.5,color:"rgba(0,229,255,0.45)",letterSpacing:"0.2em"}}>ARTICLES</div>
          </div>
          <LeftDatePanel allDates={allArticles.map(a=>a.date)} activeDate={dateFilter} onSelect={setDateFilter}/>
          <div style={{flex:1,overflowY:"auto",scrollbarWidth:"none"}}>
            {articles.map((a) => {
              const active = a.id === activeId;
              return (
                <div key={a.id} onClick={()=>setActiveId(a.id)} style={{
                  padding:"10px 14px", cursor:"pointer",
                  borderBottom:"1px solid rgba(255,255,255,0.03)",
                  background: active ? `${a.color}0f` : "transparent",
                  borderLeft: active ? `3px solid ${a.color}` : "3px solid transparent",
                  transition:"background 0.15s, border-color 0.15s",
                }}>
                  <div style={{
                    fontFamily:"'JetBrains Mono',monospace", fontSize:7.5,
                    color: active ? `${a.color}90` : "rgba(255,255,255,0.25)",
                    letterSpacing:"0.1em", marginBottom:3,
                  }}>
                    {a.date.toLocaleDateString("ja-JP")} · {a.sections.length}sec
                  </div>
                  <div style={{
                    fontSize:11.5, fontWeight:700, lineHeight:1.35,
                    color: active ? "rgba(220,236,255,0.94)" : "rgba(180,205,240,0.5)",
                    fontFamily:"'Exo 2',sans-serif",
                  }}>
                    {a.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
