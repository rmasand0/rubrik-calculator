"use client";

import { useState, useEffect } from "react";

export default function Home() {
  // --- STATE MANAGEMENT ---
  const [platform, setPlatform] = useState<"VMware" | "Nutanix" | "HyperV">("VMware");
  
  // Shared Inputs
  const [numHosts, setNumHosts] = useState(3);
  const [cpusPerHost, setCpusPerHost] = useState(2);
  const [coresPerCpu, setCoresPerCpu] = useState(16);

  // Platform Specific Inputs
  const [vmwareEdition, setVmwareEdition] = useState<"VVF" | "VCF">("VVF");
  const [nutanixTier, setNutanixTier] = useState<"Pro" | "Ultimate">("Pro");

  // --- PRICING CONSTANTS (MSRP PLACEHOLDERS) ---
  const PRICES = {
    VMware: { VVF: 135, VCF: 350 },      // Per Core/Year
    Nutanix: { Pro: 180, Ultimate: 290 }, // Per Core/Year (NCI)
    HyperV: { Datacenter: 6155 }          // Per 16-Core Pack (Perpetual approx, divided by 3yr for comparison)
  };

  // --- CALCULATION LOGIC ---
  const [results, setResults] = useState({
    licensableUnits: 0,
    unitType: "Cores",
    totalCost: 0,
  });

  useEffect(() => {
    let units = 0;
    let cost = 0;
    let unitLabel = "Cores";

    // 1. Calculate Physical Cores (Base Inventory)
    const totalPhysicalCores = numHosts * cpusPerHost * coresPerCpu;

    if (platform === "VMware") {
      // Logic: Min 16 cores per CPU
      const effectiveCoresPerCpu = Math.max(16, coresPerCpu);
      units = numHosts * cpusPerHost * effectiveCoresPerCpu;
      
      const price = vmwareEdition === "VVF" ? PRICES.VMware.VVF : PRICES.VMware.VCF;
      cost = units * price;
      unitLabel = "VVF/VCF Cores";

    } else if (platform === "Nutanix") {
      // Logic: NCI is generally per core now (Cloud Infrastructure)
      // Usually matches physical cores, sometimes sold in packs. Keeping 1:1 for simplicity.
      units = totalPhysicalCores;
      
      const price = nutanixTier === "Pro" ? PRICES.Nutanix.Pro : PRICES.Nutanix.Ultimate;
      cost = units * price;
      unitLabel = "NCI Cores";

    } else if (platform === "HyperV") {
      // Logic: Windows Server Datacenter (Unlimited VMs).
      // Sold in packs of 16 cores. Min 8 cores/proc and 16 cores/server.
      const minCoresPerHost = Math.max(16, cpusPerHost * 8); // Rule: Min 16 per server
      const totalLicensedCores = Math.max(minCoresPerHost, cpusPerHost * coresPerCpu) * numHosts;
      
      // Calculate 2-core packs (Standard SKU unit) or just raw math. 
      // Simplified: Cost is roughly $6,155 per 16-core license (MSRP perpetual). 
      // Annualizing it (divide by 3) for fair comparison.
      const packsNeeded = Math.ceil(totalLicensedCores / 16);
      units = packsNeeded * 16; 
      cost = packsNeeded * (PRICES.HyperV.Datacenter / 3); 
      unitLabel = "WinSvr Cores (Annualized)";
    }

    setResults({
      licensableUnits: units,
      unitType: unitLabel,
      totalCost: cost,
    });

  }, [platform, numHosts, cpusPerHost, coresPerCpu, vmwareEdition, nutanixTier]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex flex-col items-center font-sans text-slate-900">
      
      {/* Top Navigation / Brand */}
      <div className="w-full max-w-3xl flex justify-between items-center mb-8">
        <div className="flex items-center space-x-2">
          {/* Simple Icon Placeholder */}
          <div className="w-8 h-8 bg-indigo-600 rounded-md"></div>
          <span className="text-xl font-bold text-slate-800">Rubrik <span className="font-normal text-slate-500">Sizing & TCO</span></span>
        </div>
      </div>

      <div className="max-w-3xl w-full bg-white shadow-lg rounded-xl overflow-hidden border border-slate-200">
        
        {/* Platform Tabs */}
        <div className="flex bg-slate-100 border-b border-slate-200">
          {["VMware", "Nutanix", "HyperV"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p as any)}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                platform === p 
                  ? "bg-white text-indigo-600 border-b-2 border-indigo-600" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {p === "HyperV" ? "Hyper-V" : p}
            </button>
          ))}
        </div>

        <div className="p-8">
          
          {/* Sub-Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">{platform} Estimator</h2>
            <p className="text-slate-500 text-sm">
              {platform === "VMware" && "Broadcom VVF / VCF Subscription Pricing"}
              {platform === "Nutanix" && "Nutanix Cloud Infrastructure (NCI) Pricing"}
              {platform === "HyperV" && "Windows Server Datacenter Licensing (Annualized)"}
            </p>
          </div>

          {/* Dynamic Configuration Toggles */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Edition / Tier</span>
            <div className="flex gap-4">
              {platform === "VMware" && (
                <>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="vmware" checked={vmwareEdition === "VVF"} onChange={() => setVmwareEdition("VVF")} className="text-indigo-600 focus:ring-indigo-500"/>
                    <span>vSphere Foundation</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="vmware" checked={vmwareEdition === "VCF"} onChange={() => setVmwareEdition("VCF")} className="text-indigo-600 focus:ring-indigo-500"/>
                    <span>Cloud Foundation</span>
                  </label>
                </>
              )}
              {platform === "Nutanix" && (
                <>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="nutanix" checked={nutanixTier === "Pro"} onChange={() => setNutanixTier("Pro")} className="text-indigo-600 focus:ring-indigo-500"/>
                    <span>NCI Pro</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="nutanix" checked={nutanixTier === "Ultimate"} onChange={() => setNutanixTier("Ultimate")} className="text-indigo-600 focus:ring-indigo-500"/>
                    <span>NCI Ultimate</span>
                  </label>
                </>
              )}
              {platform === "HyperV" && (
                <span className="text-sm text-slate-500 italic">Standardizing on Windows Server Datacenter Edition</span>
              )}
            </div>
          </div>

          {/* Hardware Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Hosts</label>
              <input
                type="number" min="1" value={numHosts}
                onChange={(e) => setNumHosts(Number(e.target.value))}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPUs per Host</label>
              <input
                type="number" min="1" value={cpusPerHost}
                onChange={(e) => setCpusPerHost(Number(e.target.value))}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cores per CPU</label>
              <input
                type="number" min="1" value={coresPerCpu}
                onChange={(e) => setCoresPerCpu(Number(e.target.value))}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Bottom Results Bar */}
          <div className="bg-slate-900 text-white rounded-lg p-6 shadow-inner flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0 text-center md:text-left">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Licensable {results.unitType}</p>
              <p className="text-3xl font-mono">{results.licensableUnits.toLocaleString()}</p>
            </div>
            
            <div className="h-10 w-px bg-slate-700 hidden md:block mx-6"></div>

            <div className="text-center md:text-right">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Est. Annual Cost</p>
              <p className="text-4xl font-bold text-emerald-400">
                ${results.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">*Hardware not included. Software only.</p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
