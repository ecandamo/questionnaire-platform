// Dashboard screens for the Ops Hub UI kit.
const { useState: useSt } = React;

// ───────── OVERVIEW SCREEN ─────────
const OverviewScreen = () => {
  return (
    <div className="p-7 space-y-6 max-w-[1280px]">
      {/* KPI ROW */}
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Rooms confirmed" value="3,241" delta="4.2%" deltaKind="up" color="#78BC43"
          sparkPath="M0,20 L10,16 L20,18 L30,12 L40,14 L50,8 L60,10 L70,5 L80,6"/>
        <KPI label="IROPS events (24h)" value="12" delta="2" deltaKind="down" color="#C6342C"
          sparkPath="M0,18 L15,14 L30,16 L45,10 L60,12 L80,5"/>
        <KPI label="Avg cost / room-night" value="$138" delta="$4" deltaKind="up" color="#273B6E"
          sparkPath="M0,10 L15,14 L30,12 L45,15 L60,17 L80,20"/>
        <KPI label="Active contracts" value="186" delta="0.0%" deltaKind="neutral" color="#8C95A6"
          sparkPath="M0,14 L15,14 L30,14 L45,13 L60,14 L80,13"/>
      </div>

      {/* CHART + SIDE PANEL */}
      <div className="grid grid-cols-3 gap-4">
        {/* Big chart card */}
        <div className="col-span-2 bg-white border border-[#EEF0F5] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10.5px] font-bold tracking-[.12em] uppercase text-[#8C95A6]">Crew room-nights</div>
              <div className="font-[800] text-[20px] text-[#18264B] tracking-[-.015em]">By region, last 30 days</div>
            </div>
            <div className="flex items-center gap-1 text-[12px]">
              <button className="px-2.5 py-1 rounded-md bg-[#EEF1F8] text-[#273B6E] font-semibold">30d</button>
              <button className="px-2.5 py-1 rounded-md text-[#5B6472] hover:bg-[#F7F8FB]">90d</button>
              <button className="px-2.5 py-1 rounded-md text-[#5B6472] hover:bg-[#F7F8FB]">YTD</button>
            </div>
          </div>
          <svg viewBox="0 0 640 220" className="w-full h-[220px]">
            <defs>
              <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#78BC43" stopOpacity=".35"/>
                <stop offset="100%" stopColor="#78BC43" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#273B6E" stopOpacity=".3"/>
                <stop offset="100%" stopColor="#273B6E" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {/* grid */}
            {[0,55,110,165,220].map((y,i)=>(<line key={i} x1="0" y1={y} x2="640" y2={y} stroke="#EEF0F5"/>))}
            {/* AMER series */}
            <path d="M0,180 L50,160 L100,170 L150,130 L200,145 L250,110 L300,125 L350,80 L400,95 L450,60 L500,75 L550,50 L600,65 L640,45 L640,220 L0,220 Z" fill="url(#ga)"/>
            <path d="M0,180 L50,160 L100,170 L150,130 L200,145 L250,110 L300,125 L350,80 L400,95 L450,60 L500,75 L550,50 L600,65 L640,45" fill="none" stroke="#78BC43" strokeWidth="2.5"/>
            {/* EMEA series */}
            <path d="M0,195 L50,185 L100,175 L150,165 L200,150 L250,155 L300,140 L350,135 L400,120 L450,130 L500,115 L550,105 L600,110 L640,95 L640,220 L0,220 Z" fill="url(#gb)"/>
            <path d="M0,195 L50,185 L100,175 L150,165 L200,150 L250,155 L300,140 L350,135 L400,120 L450,130 L500,115 L550,105 L600,110 L640,95" fill="none" stroke="#273B6E" strokeWidth="2.5"/>
            {/* APAC series */}
            <path d="M0,205 L50,200 L100,195 L150,190 L200,180 L250,185 L300,170 L350,175 L400,165 L450,160 L500,155 L550,150 L600,145 L640,138" fill="none" stroke="#C47A0B" strokeWidth="2.5" strokeDasharray="4 3"/>
          </svg>
          <div className="flex items-center gap-5 text-[11.5px] text-[#5B6472] mt-2 pt-3 border-t border-[#F2F4F8]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#78BC43]"/>Americas</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#273B6E]"/>EMEA</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#C47A0B]"/>APAC</span>
          </div>
        </div>

        {/* Activity panel */}
        <div className="bg-white border border-[#EEF0F5] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-[800] text-[15px] text-[#18264B]">Live activity</div>
            <span className="text-[10.5px] font-bold tracking-[.12em] uppercase text-[#4A8524] flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#78BC43] animate-pulse"/>Live</span>
          </div>
          <div className="space-y-3.5">
            {[
              { t:'BA 178 arrival confirmed', s:'Hilton Midtown · 14 rooms', ago:'2m', kind:'g' },
              { t:'Rate addendum drafted', s:'Sofitel CDG · expires in 4d', ago:'11m', kind:'a' },
              { t:'IROPS · JL 006 delay 5h', s:'22 crew · relocation needed', ago:'18m', kind:'r' },
              { t:'Invoice batch reconciled', s:'186 properties · $1.42M', ago:'42m', kind:'n' },
            ].map((x,i)=>(
              <div key={i} className="flex gap-3">
                <div className="pt-1.5"><span className={cx("block w-2 h-2 rounded-full", x.kind==='g'?'bg-[#78BC43]':x.kind==='a'?'bg-[#C47A0B]':x.kind==='r'?'bg-[#C6342C]':'bg-[#273B6E]')}/></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#18264B] leading-snug">{x.t}</div>
                  <div className="text-[11.5px] text-[#5B6472]">{x.s}</div>
                </div>
                <div className="text-[10.5px] text-[#8C95A6] font-mono pt-1">{x.ago}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOOKING TABLE */}
      <div className="bg-white border border-[#EEF0F5] rounded-xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#EEF0F5]">
          <div>
            <div className="font-[800] text-[15px] text-[#18264B]">Today's rooming list</div>
            <div className="text-[12px] text-[#8C95A6] mt-0.5">186 properties · 12 airlines · 47 crews</div>
          </div>
          <div className="flex gap-2">
            <button className="h-8 px-3 border border-[#E4E7EE] rounded-lg text-[12.5px] font-semibold text-[#3F4754] inline-flex items-center gap-1.5 hover:border-[#273B6E]">
              <Ico name="filter" size={13}/>Filter
            </button>
            <button className="h-8 px-3 border border-[#E4E7EE] rounded-lg text-[12.5px] font-semibold text-[#3F4754] inline-flex items-center gap-1.5 hover:border-[#273B6E]">
              <Ico name="download" size={13}/>Export
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[1.4fr_1fr_.9fr_1fr_.8fr_.7fr] text-[10.5px] font-bold tracking-[.06em] uppercase text-[#8C95A6] bg-[#F7F8FB] px-5 py-2.5 border-b border-[#EEF0F5]">
          <div>Property</div><div>Airline · Flight</div><div>PNR</div><div>Check-in</div><div>Status</div><div className="text-right">Rooms</div>
        </div>
        {[
          { p:'Hilton Midtown', c:'New York · USA', a:'BA · BA 178', pnr:'7Y2QXP', ci:'May 18 · 22:40', s:'Confirmed', k:'g', r:14 },
          { p:'Sofitel CDG', c:'Paris · France', a:'AF · AF 011', pnr:'K4QX11', ci:'May 18 · 06:15', s:'Pending', k:'a', r:8 },
          { p:'Pullman HND', c:'Tokyo · Japan', a:'JL · JL 006', pnr:'M3T0PL', ci:'May 19 · 04:50', s:'IROPS', k:'r', r:22 },
          { p:'InterContinental SIN', c:'Singapore', a:'SQ · SQ 322', pnr:'B8NXQ2', ci:'May 19 · 07:30', s:'Confirmed', k:'g', r:11 },
          { p:'Hyatt Regency DXB', c:'Dubai · UAE', a:'EK · EK 204', pnr:'L1WK09', ci:'May 20 · 02:10', s:'Confirmed', k:'g', r:18 },
          { p:'Hilton Doha', c:'Doha · Qatar', a:'QR · QR 722', pnr:'R9TZC5', ci:'May 20 · 23:55', s:'In review', k:'n', r:9 },
        ].map((r,i)=>(
          <div key={i} className="grid grid-cols-[1.4fr_1fr_.9fr_1fr_.8fr_.7fr] px-5 py-3 text-[13px] items-center border-b border-[#F2F4F8] last:border-0 hover:bg-[#FAFBFD]">
            <div><div className="font-semibold text-[#18264B]">{r.p}</div><div className="text-[11.5px] text-[#8C95A6]">{r.c}</div></div>
            <div className="text-[#5B6472]">{r.a}</div>
            <div className="font-mono font-semibold text-[#273B6E]">{r.pnr}</div>
            <div className="text-[#5B6472]">{r.ci}</div>
            <div><StatusBadge kind={r.k}>{r.s}</StatusBadge></div>
            <div className="text-right font-mono font-semibold tabular-nums">{r.r}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.OverviewScreen = OverviewScreen;
