// Core foundation components (sidebar, topbar, KPI, table, badges, alerts)
// Uses global window assignment for cross-script sharing.
const { useState } = React;

const cx = (...a) => a.filter(Boolean).join(' ');

// ───────── ICONS (Lucide-style, 2px stroke, round caps) ─────────
const Ico = ({ name, size = 16, className = '' }) => {
  const p = {
    home: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10',
    hotel: 'M3 21V8l9-5 9 5v13M3 21h18M9 21v-7h6v7',
    bed: 'M2 9v11M22 20V13a4 4 0 00-4-4H2M2 13h20M7 9V6h10v3',
    plane: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 10-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z',
    bus: 'M4 6h14a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2zM2 12h20M8 6v6M16 6v6',
    alert: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
    dollar: 'M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6',
    users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    calendar: 'M3 4h18v18H3V4zM16 2v4M8 2v4M3 10h18',
    search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35',
    bell: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
    filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    plus: 'M12 5v14M5 12h14',
    check: 'M20 6L9 17l-5-5',
    chev: 'M6 9l6 6 6-6',
    ext: 'M7 17L17 7M7 7h10v10',
    globe: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z',
    settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    arrow: 'M5 12h14M13 5l7 7-7 7',
    chart: 'M3 3v18h18M7 14l4-4 4 4 6-6',
    file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6',
    download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  }[name] || '';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={p} />
    </svg>
  );
};

// ───────── SIDEBAR ─────────
const NavItem = ({ icon, label, active, badge, onClick }) => (
  <button onClick={onClick} className={cx(
    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-all",
    active ? "bg-[#273B6E] text-white" : "text-white/60 hover:text-white hover:bg-white/5"
  )}>
    <span className={active ? "text-[#78BC43]" : "text-white/50"}><Ico name={icon} size={16} /></span>
    <span className="flex-1 text-left">{label}</span>
    {badge != null && (
      <span className={cx("text-[10px] font-bold px-1.5 h-4 rounded flex items-center justify-center",
        active ? "bg-[#78BC43] text-[#0B1428]" : "bg-white/10 text-white/70")}>{badge}</span>
    )}
  </button>
);

const Sidebar = ({ active, setActive }) => (
  <aside className="w-[232px] bg-[#0B1428] text-white flex flex-col h-screen shrink-0">
    <div className="px-4 py-5 flex items-center gap-2 border-b border-white/5">
      <img src="../../assets/api-logo-white.svg" className="h-6" alt="API" />
      <span className="text-[10px] font-bold tracking-[.18em] text-[#78BC43] uppercase">Ops Hub</span>
    </div>
    <nav className="flex-1 overflow-auto p-2 space-y-0.5">
      <NavItem icon="home" label="Overview" active={active==='Overview'} onClick={()=>setActive('Overview')}/>
      <div className="text-[9.5px] tracking-[.18em] uppercase text-white/30 font-bold px-3 pt-4 pb-1">Planning</div>
      <NavItem icon="hotel" label="Sourcing" onClick={()=>setActive('Sourcing')} active={active==='Sourcing'}/>
      <NavItem icon="bed" label="Crew lodging" badge="3" active={active==='Crew lodging'} onClick={()=>setActive('Crew lodging')}/>
      <NavItem icon="bus" label="Ground transport" onClick={()=>setActive('Ground transport')} active={active==='Ground transport'}/>
      <div className="text-[9.5px] tracking-[.18em] uppercase text-white/30 font-bold px-3 pt-4 pb-1">Operations</div>
      <NavItem icon="alert" label="IROPS" badge="12" onClick={()=>setActive('IROPS')} active={active==='IROPS'}/>
      <NavItem icon="dollar" label="Billing" onClick={()=>setActive('Billing')} active={active==='Billing'}/>
      <NavItem icon="chart" label="Reporting" onClick={()=>setActive('Reporting')} active={active==='Reporting'}/>
    </nav>
    <div className="p-3 border-t border-white/5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-[#273B6E] flex items-center justify-center text-[12px] font-bold">MR</div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold truncate">M. Rojas</div>
        <div className="text-[10.5px] text-white/50 truncate">Ops Director · CX</div>
      </div>
      <button className="text-white/50 hover:text-white"><Ico name="settings" size={16}/></button>
    </div>
  </aside>
);

// ───────── TOPBAR ─────────
const Topbar = ({ title, subtitle }) => (
  <header className="h-[64px] border-b border-[#EEF0F5] bg-white px-7 flex items-center justify-between shrink-0">
    <div>
      <div className="text-[10.5px] font-bold tracking-[.12em] uppercase text-[#4A8524]">Week of May 12, 2026</div>
      <h1 className="font-[800] text-[22px] text-[#18264B] tracking-[-.015em] leading-[1.15]">{title}</h1>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 h-9 px-3 bg-[#F7F8FB] rounded-lg border border-[#EEF0F5] w-[280px]">
        <Ico name="search" size={14} className="text-[#8C95A6]"/>
        <input placeholder="Find booking, PNR, property…" className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-[#8C95A6]"/>
        <span className="font-mono text-[10px] text-[#8C95A6] bg-white border border-[#E4E7EE] rounded px-1.5 py-[1px]">⌘K</span>
      </div>
      <button className="h-9 w-9 rounded-lg border border-[#E4E7EE] bg-white flex items-center justify-center text-[#3F4754] hover:border-[#273B6E] relative">
        <Ico name="bell" size={16}/>
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#78BC43] ring-2 ring-white"/>
      </button>
      <button className="h-9 px-4 rounded-lg bg-[#273B6E] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#1F3160]">
        <Ico name="plus" size={14}/>New booking
      </button>
    </div>
  </header>
);

// ───────── KPI CARD ─────────
const KPI = ({ label, value, delta, deltaKind='up', sparkPath, color }) => (
  <div className="bg-white border border-[#EEF0F5] rounded-xl p-4 hover:shadow-[0_4px_10px_-2px_rgba(39,59,110,.10)] transition-shadow">
    <div className="text-[10.5px] font-bold tracking-[.12em] uppercase text-[#8C95A6]">{label}</div>
    <div className="font-[800] text-[30px] text-[#18264B] tracking-[-.02em] leading-[1.1] mt-1 tabular-nums">{value}</div>
    <div className="flex items-center justify-between mt-2">
      <div className="text-[12px] flex items-center gap-1.5">
        <span className={cx("font-bold", deltaKind==='up' ? "text-[#2E8F3E]" : deltaKind==='down' ? "text-[#C6342C]" : "text-[#273B6E]")}>
          {deltaKind==='up' ? '↑' : deltaKind==='down' ? '↓' : '—'} {delta}
        </span>
        <span className="text-[#8C95A6]">vs last wk</span>
      </div>
      <svg viewBox="0 0 80 24" preserveAspectRatio="none" width="80" height="24">
        <path d={sparkPath} fill="none" stroke={color} strokeWidth="1.8"/>
      </svg>
    </div>
  </div>
);

// ───────── BADGE ─────────
const StatusBadge = ({ kind='g', children }) => {
  const m = {
    g: 'bg-[#E9F6EC] text-[#2E8F3E]',
    a: 'bg-[#FDF3E0] text-[#C47A0B]',
    r: 'bg-[#FBECEB] text-[#C6342C]',
    n: 'bg-[#EEF1F8] text-[#273B6E]',
    gh: 'bg-white border border-[#D4D9E1] text-[#5B6472]',
  };
  return (
    <span className={cx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold", m[kind])}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"/>{children}
    </span>
  );
};

Object.assign(window, { Ico, Sidebar, Topbar, KPI, StatusBadge, NavItem, cx });
