// Secondary screens: IROPS response + Billing
const IROPSScreen = () => (
  <div className="p-7 space-y-5 max-w-[1280px]">
    <div className="bg-gradient-to-br from-[#0B1428] to-[#273B6E] rounded-2xl p-6 text-white relative overflow-hidden">
      <div className="absolute top-4 right-4 opacity-10 text-[180px] font-[300] leading-none select-none">+</div>
      <div className="text-[10.5px] font-bold tracking-[.12em] uppercase text-[#78BC43]">Active IROPS · May 18</div>
      <div className="font-[800] text-[28px] tracking-[-.015em] mt-1">12 events impacting 184 crew</div>
      <div className="flex gap-6 mt-4 text-[13px]">
        <div><span className="font-mono text-[20px] font-bold">08</span><span className="text-white/60 ml-2">Delays</span></div>
        <div><span className="font-mono text-[20px] font-bold">03</span><span className="text-white/60 ml-2">Diversions</span></div>
        <div><span className="font-mono text-[20px] font-bold">01</span><span className="text-white/60 ml-2">Cancellation</span></div>
      </div>
    </div>
    <div className="bg-white border border-[#EEF0F5] rounded-xl p-5">
      <div className="font-[800] text-[16px] text-[#18264B] mb-4">Response queue</div>
      {[
        { f:'JL 006', r:'HND → JFK · +5h delay', crew:22, sug:'Pullman HND · 14 rms · 8 relocate to Villa Fontaine' },
        { f:'AF 011', r:'JFK → CDG · diverted LHR', crew:14, sug:'Park Plaza Westminster · 14 rms confirmed' },
        { f:'EK 204', r:'DXB → JFK · 3h delay', crew:12, sug:'Hyatt Regency DXB extended stay · 12 rms held' },
      ].map((x,i)=>(
        <div key={i} className="grid grid-cols-[120px_1fr_auto] gap-4 items-center py-4 border-b border-[#F2F4F8] last:border-0">
          <div>
            <div className="font-mono font-bold text-[#273B6E] text-[15px]">{x.f}</div>
            <div className="text-[11.5px] text-[#8C95A6]">{x.r}</div>
          </div>
          <div>
            <div className="text-[12px] text-[#5B6472] mb-1">{x.crew} crew impacted</div>
            <div className="text-[13px] font-semibold text-[#18264B]">{x.sug}</div>
          </div>
          <div className="flex gap-2">
            <button className="h-8 px-3 border border-[#E4E7EE] rounded-lg text-[12px] font-semibold text-[#3F4754]">Review</button>
            <button className="h-8 px-3 bg-[#78BC43] text-[#0B1428] rounded-lg text-[12px] font-semibold">Accept &amp; notify</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const BillingScreen = () => (
  <div className="p-7 space-y-5 max-w-[1280px]">
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white border border-[#EEF0F5] rounded-xl p-4">
        <div className="text-[10.5px] font-bold tracking-[.12em] uppercase text-[#8C95A6]">Awaiting reconciliation</div>
        <div className="font-[800] text-[28px] text-[#18264B] tracking-[-.02em] mt-1 tabular-nums">$2.14M</div>
        <div className="text-[11.5px] text-[#8C95A6] mt-1">412 invoices · 38 properties</div>
      </div>
      <div className="bg-white border border-[#EEF0F5] rounded-xl p-4">
        <div className="text-[10.5px] font-bold tracking-[.12em] uppercase text-[#8C95A6]">Reconciled this month</div>
        <div className="font-[800] text-[28px] text-[#18264B] tracking-[-.02em] mt-1 tabular-nums">$18.7M</div>
        <div className="text-[11.5px] text-[#2E8F3E] mt-1 font-semibold">↑ 6.1% vs last month</div>
      </div>
      <div className="bg-[#EEF1F8] rounded-xl p-4">
        <div className="text-[10.5px] font-bold tracking-[.12em] uppercase text-[#273B6E]">Disputes</div>
        <div className="font-[800] text-[28px] text-[#18264B] tracking-[-.02em] mt-1 tabular-nums">7 open</div>
        <div className="text-[11.5px] text-[#5B6472] mt-1">Avg resolution 4.2 days</div>
      </div>
    </div>
    <div className="bg-white border border-[#EEF0F5] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#EEF0F5] font-[800] text-[15px] text-[#18264B]">Invoice batches</div>
      <div className="grid grid-cols-[1.3fr_.9fr_.9fr_1fr_.8fr] text-[10.5px] font-bold tracking-[.06em] uppercase text-[#8C95A6] bg-[#F7F8FB] px-5 py-2.5 border-b border-[#EEF0F5]">
        <div>Batch · Property</div><div>Period</div><div>Invoices</div><div>Amount</div><div>Status</div>
      </div>
      {[
        { b:'B-0418', p:'Hilton Midtown', pd:'Apr 2026', n:48, a:'$184,220.00', s:'Reconciled', k:'g' },
        { b:'B-0419', p:'Sofitel CDG', pd:'Apr 2026', n:31, a:'$96,410.00', s:'In review', k:'n' },
        { b:'B-0420', p:'Pullman HND', pd:'Apr 2026', n:52, a:'$128,950.00', s:'Dispute', k:'r' },
        { b:'B-0421', p:'Hyatt DXB', pd:'Apr 2026', n:36, a:'$208,140.00', s:'Reconciled', k:'g' },
      ].map((r,i)=>(
        <div key={i} className="grid grid-cols-[1.3fr_.9fr_.9fr_1fr_.8fr] px-5 py-3 text-[13px] items-center border-b border-[#F2F4F8] last:border-0 hover:bg-[#FAFBFD]">
          <div><div className="font-mono text-[12px] text-[#8C95A6]">{r.b}</div><div className="font-semibold text-[#18264B]">{r.p}</div></div>
          <div className="text-[#5B6472]">{r.pd}</div>
          <div className="font-mono">{r.n}</div>
          <div className="font-mono font-semibold tabular-nums">{r.a}</div>
          <div><StatusBadge kind={r.k}>{r.s}</StatusBadge></div>
        </div>
      ))}
    </div>
  </div>
);

window.IROPSScreen = IROPSScreen;
window.BillingScreen = BillingScreen;
