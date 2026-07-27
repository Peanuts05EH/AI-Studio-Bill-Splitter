import React, { useState, useRef, useEffect } from "react";
import { CURRENCIES, CurrencyInfo } from "../currencies";
import { DollarSign, ChevronDown, Check, ArrowRightLeft, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CurrencySelectorProps {
  currentCurrency: CurrencyInfo;
  onCurrencyChange: (newCurrency: CurrencyInfo, autoConvertValues: boolean) => void;
  autoConvertValues: boolean;
  setAutoConvertValues: (convert: boolean) => void;
}

export default function CurrencySelector({
  currentCurrency,
  onCurrencyChange,
  autoConvertValues,
  setAutoConvertValues,
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCurrencies = CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-700/80 rounded-xl text-xs font-semibold text-zinc-200 transition shadow-sm cursor-pointer"
        title="Change Base Currency"
      >
        <span className="text-sm">{currentCurrency.flag}</span>
        <span className="font-bold font-mono text-indigo-400">{currentCurrency.symbol}</span>
        <span className="text-zinc-300 font-mono">{currentCurrency.code}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 bg-[#161619] border border-zinc-700/80 rounded-2xl shadow-2xl z-50 p-2.5 space-y-2 backdrop-blur-lg"
          >
            {/* Header & Mode Toggle */}
            <div className="px-2 pt-1 pb-2 border-b border-zinc-800">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xxs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-indigo-400" /> Select Base Currency
                </span>
                <span className="text-xxs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                  {currentCurrency.symbol} ({currentCurrency.code})
                </span>
              </div>

              {/* Conversion mode toggle switch */}
              <label className="flex items-center justify-between gap-2 p-1.5 bg-zinc-900/80 rounded-lg border border-zinc-800 cursor-pointer text-xxs">
                <span className="flex items-center gap-1 text-zinc-300 font-medium">
                  <ArrowRightLeft className="w-3 h-3 text-emerald-400" />
                  Auto-convert prices
                </span>
                <input
                  type="checkbox"
                  checked={autoConvertValues}
                  onChange={(e) => setAutoConvertValues(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
              </label>
            </div>

            {/* Search Input */}
            <div className="px-1">
              <input
                type="text"
                placeholder="Search currency..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-zinc-950/80 border border-zinc-700/70 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Currency Options List */}
            <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
              {filteredCurrencies.length === 0 ? (
                <div className="p-3 text-center text-xxs text-zinc-500 italic">No matching currency</div>
              ) : (
                filteredCurrencies.map((currency) => {
                  const isSelected = currency.code === currentCurrency.code;
                  return (
                    <button
                      key={currency.code}
                      type="button"
                      onClick={() => {
                        onCurrencyChange(currency, autoConvertValues);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition text-left cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600/20 text-white border border-indigo-500/40 font-bold"
                          : "hover:bg-zinc-800/80 text-zinc-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{currency.flag}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-indigo-400 font-bold">{currency.symbol}</span>
                            <span className="font-semibold text-zinc-200">{currency.code}</span>
                          </div>
                          <p className="text-[10px] text-zinc-400">{currency.name}</p>
                        </div>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
