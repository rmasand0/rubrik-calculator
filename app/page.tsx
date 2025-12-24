"use client";

import { useState, useEffect } from "react";

// --- COMPONENTS ---

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
    <header className="bg-[#111827] py-4 px-8 flex flex-col md:flex-row justify-between items-center text-white font-sans print:hidden">
      {/* Logo and Title Section */}
      <div className="flex items-center mb-4 md:mb-0">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-md mr-3">
          {/* Cloud/Server Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-wide">RACK2CLOUD</h1>
          <span className="text-xs text-gray-400 uppercase font-medium tracking-wider">
            IMMUTABLE COST ESTIMATOR
          </span>
        </div>
      </div>

      {/* Buttons Section */}
      <div className="flex space-x-4">
        <button
          onClick={handleShare}
          className="bg-[#1F2937] hover:bg-[#374151] text-gray-300 px-4 py-2 rounded-md flex items-center transition duration-300 text-sm font-medium border border-gray-700"
        >
          {/* Share Icon */}
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {copied ? 'Copied!' : 'Share Result'}
        </button>
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition duration-300 text-sm font-medium shadow-lg shadow-blue-900/50"
        >
          {/* PDF/Print Icon */}
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          PDF Report
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* 1. Header is now here */}
      <Header />

      <main className="p-6 flex flex-col items-center">
        
        <div className="max-w-4xl w-full bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200 mt-8">
          
          {/* Platform Tabs */}
          <div className="flex bg-slate-100 border-b border-slate-200">
            {["VMware", "Nutanix", "HyperV"].map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p as any)}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                  platform === p 
                    ? "bg-white text-indigo-600 border-b-2 border-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                }`}
              >
                {p === "HyperV" ? "Hyper-V" : p}
              </button>
            ))}
          </div>

          <div className="p-8 space-y-8">
            
            {/* Section 1: Infrastructure */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <span className="w-6 h-6 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                  Infrastructure
                </h3>
                
                {/* Dynamic Toggles based on Platform */}
                <div className="flex bg-slate-100 rounded-lg p-1">
                  {platform === "VMware" && (
                    <>
                      <button onClick={() => setVmwareEdition("VVF")} className={`px-3 py-1 text-xs font-semibold rounded ${vmwareEdition === "VVF" ? "bg-white shadow text-indigo-600" : "text-slate-500"}`}>VVF</button>
                      <button onClick={() => setVmwareEdition("VCF")} className={`px-3 py-1 text-xs font-semibold rounded ${vmwareEdition === "VCF" ? "bg-white shadow text-indigo-600" : "text-slate-500"}`}>VCF</button>
                    </>
                  )}
                  {platform === "Nutanix" && (
                    <>
                      <button onClick={() => setNutanixTier("Pro")} className={`px-3 py-1 text-xs font-semibold rounded ${nutanixTier === "Pro" ? "bg-white shadow text-indigo-600" : "text-slate-500"}`}>Pro</button>
                      <button onClick={() => setNutanixTier("Ultimate")} className={`px-3 py-1 text-xs font-semibold rounded ${nutanixTier === "Ultimate" ? "bg-white shadow text-indigo-600" : "text-slate-500"}`}>Ultimate</button>
                    </>
                  )}
                  {platform === "HyperV" && <span className="px-3 py-1 text-xs font-semibold text-slate-500">Datacenter</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Hosts</label>
                  <input type="number" min="1" value={numHosts} onChange={(e) => setNumHosts(Number(e.target.value))} className="w-full bg-transparent font-mono text-lg outline-none" />
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPUs / Host</label>
                  <input type="number" min="1" value={cpusPerHost} onChange={(e) => setCpusPerHost(Number(e.target.value))} className="w-full bg-transparent font-mono text-lg outline-none" />
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cores / CPU</label>
                  <input type="number" min="1" value={coresPerCpu} onChange={(e) => setCoresPerCpu(Number(e.target.value))} className="w-full bg-transparent font-mono text-lg outline-none" />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 2: Rubrik Security */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <span className="w-6 h-6 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                  Rubrik Security
                </h3>
                
                {/* Rubrik Toggle */}
                <button 
                  onClick={() => setIncludeRubrik(!includeRubrik)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeRubrik ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeRubrik ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className={`transition-all duration-300 ${includeRubrik ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avg Storage per Host (TB)</label>
                    <input 
                      type="number" min="1" 
                      value={storagePerHost} 
                      onChange={(e) => setStoragePerHost(Number(e.target.value))}
                      disabled={!includeRubrik}
                      className="w-full bg-transparent font-mono text-lg outline-none" 
                    />
                  </div>
                  <div className="flex items-center p-3">
                    <div className="text-sm text-slate-600">
                      <span className="font-bold">Est. Front-End TB:</span> {results.totalFET.toLocaleString()} TB
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Results Bar */}
            <div className="bg-slate-900 text-white rounded-lg p-6 shadow-xl">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>{platform} Licensing ({results.infraUnitLabel})</span>
                  <span>${results.infraCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                {includeRubrik && (
                  <div className="flex justify-between text-sm text-indigo-300">
                    <span>Rubrik Security Cloud (Enterprise)</span>
                    <span>+ ${results.rubrikCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                )}
              </div>
              
              <div className="h-px bg-slate-700 mb-4"></div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Est. Annual Total</p>
                  <p className="text-4xl font-bold text-white">
                    ${results.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="text-right">
                   <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded font-bold">ANNUAL OPEX</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
