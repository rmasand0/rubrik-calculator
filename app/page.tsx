"use client";

import { useState, useEffect } from "react";

// --- HEADER COMPONENT ---
// Note: Background and width constraints are now handled by the parent container in Home()
function Header() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="py-6 px-8 flex flex-col md:flex-row justify-between items-center text-white font-sans print:hidden border-b border-[#1F2937]">
      
      {/* LEFT: Logo and Branding */}
      <div className="flex items-center mb-4 md:mb-0 gap-4">
        {/* Logo Image */}
        <img 
          src="https://www.rack2cloud.com/wp-content/uploads/2025/12/Icon.png" 
          alt="Rack2Cloud Logo" 
          className="h-10 w-10 object-contain"
        />

        <div className="flex flex-col justify-center">
          {/* Main Title */}
          <h1 className="text-2xl font-extrabold tracking-tight text-white leading-none">
            RACK2CLOUD
          </h1>
          {/* Subtitle */}
          <span className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-1">
            Immutable Cost Estimator
          </span>
        </div>
      </div>

      {/* RIGHT: Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Share Button */}
        <button
          onClick={handleShare}
          className="group flex items-center px-4 py-2 bg-[#1F2937] hover:bg-[#374151] border border-slate-700 rounded-lg transition-all duration-200"
        >
          <svg className="w-4 h-4 mr-2 text-slate-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
            {copied ? 'Copied!' : 'Share Result'}
          </span>
        </button>

        {/* PDF Button */}
        <button
          onClick={handlePrint}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-900/20 transition-all duration-200"
        >
          <svg className="w-4 h-4 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-semibold text-white">PDF Report</span>
        </button>
      </div>
    </header>
  );
}

// --- MAIN PAGE COMPONENT ---

export default function Home() {
  // --- STATE MANAGEMENT ---
  const [platform, setPlatform] = useState<"VMware" | "Nutanix" | "HyperV">("VMware");
  
  // Infrastructure Inputs
  const [numHosts, setNumHosts] = useState(3);
  const [cpusPerHost, setCpusPerHost] = useState(2);
  const [coresPerCpu, setCoresPerCpu] = useState(16);

  // Rubrik / Storage Inputs
  const [includeRubrik, setIncludeRubrik] = useState(false);
  const [storagePerHost, setStoragePerHost] = useState(10); // TB per host

  // Platform Specific Options
  const [vmwareEdition, setVmwareEdition] = useState<"VVF" | "VCF">("VVF");
  const [nutanixTier, setNutanixTier] = useState<"Pro" | "Ultimate">("Pro");

  // --- PRICING CONSTANTS (MSRP PLACEHOLDERS) ---
  const PRICES = {
    VMware: { VVF: 135, VCF: 350 },       // Per Core/Year
    Nutanix: { Pro: 180, Ultimate: 290 }, // Per Core/Year
    HyperV: { Datacenter: 6155 },         // Per 16-Core Pack (Perpetual)
    Rubrik: { Enterprise: 350 }           // Per FET/Year (Estimated Avg)
  };

  // --- CALCULATION LOGIC ---
  const [results, setResults] = useState({
    infraCost: 0,
    rubrikCost: 0,
    totalCost: 0,
    infraUnitLabel: "Cores",
    totalFET: 0
  });

  useEffect(() => {
    let infraPrice = 0;
    let unitLabel = "Cores";
    let rubrikPrice = 0;

    // 1. Calculate Infrastructure Cost
    const totalPhysicalCores = numHosts * cpusPerHost * coresPerCpu;

    if (platform === "VMware") {
      const effectiveCoresPerCpu = Math.max(16, coresPerCpu); // Min 16 rule
      const licensableCores = numHosts * cpusPerHost * effectiveCoresPerCpu;
      const price = vmwareEdition === "VVF" ? PRICES.VMware.VVF : PRICES.VMware.VCF;
      infraPrice = licensableCores * price;
      unitLabel = "VVF/VCF Cores";

    } else if (platform === "Nutanix") {
      const price = nutanixTier === "Pro" ? PRICES.Nutanix.Pro : PRICES.Nutanix.Ultimate;
      infraPrice = totalPhysicalCores * price;
      unitLabel = "NCI Cores";

    } else if (platform === "HyperV") {
      // Windows Server Datacenter Logic
      const minCoresPerHost = Math.max(16, cpusPerHost * 8); 
      const totalLicensedCores = Math.max(minCoresPerHost, cpusPerHost * coresPerCpu) * numHosts;
      const packsNeeded = Math.ceil(totalLicensedCores / 16);
      // Annualized cost (Perpetual / 3)
      infraPrice = packsNeeded * (PRICES.HyperV.Datacenter / 3); 
      unitLabel = "WinSvr Cores";
    }

    // 2. Calculate Rubrik Cost
    const totalFET = numHosts * storagePerHost;
    if (includeRubrik) {
      rubrikPrice = totalFET * PRICES.Rubrik.Enterprise;
    }

    setResults({
      infraCost: infraPrice,
      rubrikCost: rubrikPrice,
      totalCost: infraPrice + rubrikPrice,
      infraUnitLabel: unitLabel,
      totalFET: totalFET
    });

  }, [platform, numHosts, cpusPerHost, coresPerCpu, vmwareEdition, nutanixTier, includeRubrik, storagePerHost]);

  return (
    // Outer background for the whole page (darker tone)
    <div className="min-h-screen bg-[#090c10] font-sans text-slate-200 p-4 md:p-8 flex justify-center">
      
      {/* Main Centered App Container (The "Card" look) */}
      <div className="w-full max-w-4xl bg-[#0B1120] shadow-2xl rounded-2xl overflow-hidden border border-[#1F2937]">
        
        {/* Header sits inside the container now */}
        <Header />

        <main>
          
          {/* Platform Tabs */}
          <div className="flex bg-[#111827] border-b border-[#1F2937]">
            {["VMware", "Nutanix", "HyperV"].map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p as any)}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                  platform === p 
                    ? "bg-[#0B1120] text-indigo-400 border-b-2 border-indigo-500" 
                    : "text-slate-500 hover:text-slate-300 hover:bg-[#1F2937]"
                }`}
              >
                {p === "HyperV" ? "Hyper-V" : p}
              </button>
            ))}
          </div>

          <div className="p-8 space-y-8">
            
            {/* Section 1: Infrastructure */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <span className="w-6 h-6 bg-[#1F2937] text-slate-300 rounded-full flex items-center justify-center text-xs mr-3 border border-slate-700">1</span>
                  Infrastructure
                </h3>
                
                {/* Dynamic Toggles based on Platform */}
                <div className="flex bg-[#1F2937] rounded-lg p-1 border border-slate-700">
                  {platform === "VMware" && (
                    <>
                      <button onClick={() => setVmwareEdition("VVF")} className={`px-3 py-1 text-xs font-semibold rounded transition-all ${vmwareEdition === "VVF" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}>VVF</button>
                      <button onClick={() => setVmwareEdition("VCF")} className={`px-3 py-1 text-xs font-semibold rounded transition-all ${vmwareEdition === "VCF" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}>VCF</button>
                    </>
                  )}
                  {platform === "Nutanix" && (
                    <>
                      <button onClick={() => setNutanixTier("Pro")} className={`px-3 py-1 text-xs font-semibold rounded transition-all ${nutanixTier === "Pro" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}>Pro</button>
                      <button onClick={() => setNutanixTier("Ultimate")} className={`px-3 py-1 text-xs font-semibold rounded transition-all ${nutanixTier === "Ultimate" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}>Ultimate</button>
                    </>
                  )}
                  {platform === "HyperV" && <span className="px-3 py-1 text-xs font-semibold text-slate-400">Datacenter</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dark Input Box 1 */}
                <div className="bg-[#111827] p-4 rounded-lg border border-[#1F2937] focus-within:border-indigo-500 transition-colors">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Total Hosts</label>
                  <input type="number" min="1" value={numHosts} onChange={(e) => setNumHosts(Number(e.target.value))} className="w-full bg-transparent font-mono text-xl text-white outline-none" />
                </div>
                {/* Dark Input Box 2 */}
                <div className="bg-[#111827] p-4 rounded-lg border border-[#1F2937] focus-within:border-indigo-500 transition-colors">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">CPUs / Host</label>
                  <input type="number" min="1" value={cpusPerHost} onChange={(e) => setCpusPerHost(Number(e.target.value))} className="w-full bg-transparent font-mono text-xl text-white outline-none" />
                </div>
                {/* Dark Input Box 3 */}
                <div className="bg-[#111827] p-4 rounded-lg border border-[#1F2937] focus-within:border-indigo-500 transition-colors">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Cores / CPU</label>
                  <input type="number" min="1" value={coresPerCpu} onChange={(e) => setCoresPerCpu(Number(e.target.value))} className="w-full bg-transparent font-mono text-xl text-white outline-none" />
                </div>
              </div>
            </div>

            <hr className="border-[#1F2937]" />

            {/* Section 2: Rubrik Security */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <span className="w-6 h-6 bg-[#1F2937] text-slate-300 rounded-full flex items-center justify-center text-xs mr-3 border border-slate-700">2</span>
                  Rubrik Security
                </h3>
                
                {/* Rubrik Toggle - Dark Mode optimized */}
                <button 
                  onClick={() => setIncludeRubrik(!includeRubrik)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0B1120] ${includeRubrik ? 'bg-indigo-600' : 'bg-[#1F2937]'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeRubrik ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className={`transition-all duration-300 ${includeRubrik ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="bg-[#111827] p-4 rounded-lg border border-[#1F2937] focus-within:border-indigo-500 transition-colors">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Avg Storage per Host (TB)</label>
                    <input 
                      type="number" min="1" 
                      value={storagePerHost} 
                      onChange={(e) => setStoragePerHost(Number(e.target.value))}
                      disabled={!includeRubrik}
                      className="w-full bg-transparent font-mono text-xl text-white outline-none disabled:cursor-not-allowed" 
                    />
                  </div>
                  <div className="px-4 py-2">
                    <div className="text-sm text-slate-400">
                      <span className="font-bold text-slate-200">Est. Front-End TB:</span> {results.totalFET.toLocaleString()} TB
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Results Bar - Dark Mode */}
            <div className="bg-gradient-to-br from-[#111827] to-[#0B1120] rounded-xl p-6 shadow-2xl border border-[#1F2937]">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>{platform} Licensing ({results.infraUnitLabel})</span>
                  <span className="font-mono text-white">${results.infraCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                {includeRubrik && (
                  <div className="flex justify-between text-sm text-indigo-300">
                    <span>Rubrik Security Cloud (Enterprise)</span>
                    <span className="font-mono">+ ${results.rubrikCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                )}
              </div>
              
              <div className="h-px bg-[#1F2937] mb-6"></div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-widest mb-2 font-bold">Est. Annual Total</p>
                  <p className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-none font-mono">
                    ${results.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="text-right">
                   <span className="text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold">ANNUAL OPEX</span>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
