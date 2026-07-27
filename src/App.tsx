import React, { useState, useEffect } from "react";
import { ReceiptItem, Guest, ReceiptData } from "./types";
import {
  DEMO_GUESTS,
  DEMO_RECEIPT,
  DEMO_ASSIGNMENTS,
} from "./demoData";
import ReceiptScanner from "./components/ReceiptScanner";
import SettlementSummary from "./components/SettlementSummary";
import CurrencySelector from "./components/CurrencySelector";
import { CURRENCIES, CurrencyInfo, formatPrice, convertAmount } from "./currencies";
import {
  Plus,
  Trash2,
  Users,
  UtensilsCrossed,
  Calculator,
  RefreshCw,
  Sparkles,
  Info,
  Edit2,
  Check,
  UserPlus,
  ArrowRight,
  BookOpen,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Application State
  const [guests, setGuests] = useState<Guest[]>([]);
  const [receipt, setReceipt] = useState<ReceiptData>({
    items: [],
    subtotal: 0,
    serviceChargePercent: 10,
    taxPercent: 9,
    total: 0,
  });
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  // Currency State
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyInfo>(CURRENCIES[0]);
  const [autoConvertValues, setAutoConvertValues] = useState(true);

  // Valid official items present on the original parsed receipt
  const [officialReceiptItemNames, setOfficialReceiptItemNames] = useState<string[]>(
    DEMO_RECEIPT.items.map((i) => i.name)
  );

  // New Guest Input state
  const [newGuestName, setNewGuestName] = useState("");
  
  // Custom manual item inputs
  const [manualItemName, setManualItemName] = useState("");
  const [manualItemPrice, setManualItemPrice] = useState("");
  const [manualItemQty, setManualItemQty] = useState("1");

  // Error result state for food item validation
  const [manualItemError, setManualItemError] = useState<{
    attemptedName: string;
    message: string;
    suggestion: string;
  } | null>(null);

  // Edit states for individual items
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemQty, setEditItemQty] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");

  // Edit states for tax percentages
  const [editingTaxes, setEditingTaxes] = useState(false);
  const [tempServicePercent, setTempServicePercent] = useState("10");
  const [tempTaxPercent, setTempTaxPercent] = useState("9");

  // Helper function to validate if a food item is stated on the official receipt
  const checkItemInReceipt = (itemName: string, validNames: string[]) => {
    if (!itemName.trim()) return { isValid: false, reason: "Item name cannot be empty" };
    if (validNames.length === 0) return { isValid: true }; // No official receipt loaded yet

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normInput = normalize(itemName);

    for (const name of validNames) {
      const normName = normalize(name);
      // Exact or substring match (e.g., "Chianti" vs "Glass Chianti Classico")
      if (normInput === normName || normName.includes(normInput) || normInput.includes(normName)) {
        return { isValid: true, matchedName: name };
      }
      // Word overlap (for words longer than 2 characters)
      const inputWords = itemName.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const officialWords = name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      if (inputWords.some((w) => officialWords.some((ow) => ow.includes(w) || w.includes(ow)))) {
        return { isValid: true, matchedName: name };
      }
    }

    return {
      isValid: false,
      reason: `"${itemName}" is not stated in the official receipt!`,
    };
  };

  // Load the Workshop 7 Case Study on initial mount as a delightful default!
  useEffect(() => {
    handleLoadWorkshopDemo();
  }, []);

  // Recalculate Subtotal and Total when items or tax rates change
  useEffect(() => {
    const calculatedSubtotal = receipt.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const serviceCharge = calculatedSubtotal * (receipt.serviceChargePercent / 100);
    const calculatedTotal = calculatedSubtotal + serviceCharge + ((calculatedSubtotal + serviceCharge) * (receipt.taxPercent / 100));

    setReceipt((prev) => ({
      ...prev,
      subtotal: parseFloat(calculatedSubtotal.toFixed(2)),
      total: parseFloat(calculatedTotal.toFixed(2)),
    }));
  }, [receipt.items, receipt.serviceChargePercent, receipt.taxPercent]);

  // Load demo data helper
  const handleLoadWorkshopDemo = () => {
    setGuests(DEMO_GUESTS);
    setReceipt(DEMO_RECEIPT);
    setAssignments(DEMO_ASSIGNMENTS);
    setOfficialReceiptItemNames(DEMO_RECEIPT.items.map((i) => i.name));
    setManualItemError(null);
  };

  // Clear state helper
  const handleClearAll = () => {
    setGuests([]);
    setReceipt({
      items: [],
      subtotal: 0,
      serviceChargePercent: 10,
      taxPercent: 9,
      total: 0,
    });
    setAssignments({});
    setOfficialReceiptItemNames([]);
    setManualItemError(null);
  };

  // Receipt Scanner parsed handler
  const handleReceiptParsed = (data: ReceiptData) => {
    setReceipt(data);
    setOfficialReceiptItemNames(data.items.map((i) => i.name));
    setManualItemError(null);

    // Auto populate sample guests if empty
    if (guests.length === 0) {
      setGuests([
        { id: "guest_1", name: "Guest A" },
        { id: "guest_2", name: "Guest B" },
      ]);
    }
    // Reset assignments
    const emptyAssignments: Record<string, string[]> = {};
    data.items.forEach((item) => {
      emptyAssignments[item.id] = [];
    });
    setAssignments(emptyAssignments);
  };

  // Guest Management
  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;

    const newId = `guest_${Date.now()}`;
    const newGuest: Guest = {
      id: newId,
      name: newGuestName.trim(),
    };

    setGuests((prev) => [...prev, newGuest]);
    setNewGuestName("");
  };

  const handleRemoveGuest = (guestId: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
    
    // Clean up assignments involving this guest
    const updatedAssignments = { ...assignments };
    Object.keys(updatedAssignments).forEach((itemId) => {
      updatedAssignments[itemId] = updatedAssignments[itemId].filter((id) => id !== guestId);
    });
    setAssignments(updatedAssignments);
  };

  // Item Management (Manual entry with Validation)
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItemName.trim() || !manualItemPrice) return;

    const nameToTest = manualItemName.trim();
    const validation = checkItemInReceipt(nameToTest, officialReceiptItemNames);

    if (!validation.isValid) {
      // Trigger error result for unstated food item
      setManualItemError({
        attemptedName: nameToTest,
        message: `Error: "${nameToTest}" is not stated in the official receipt!`,
        suggestion: `Food items added to the cost splitter must match items on the parsed receipt. Check your spelling or choose from valid receipt items below.`,
      });
      return;
    }

    forceAddManualItem(nameToTest, false);
  };

  const forceAddManualItem = (itemName: string, isFlaggedUnverified: boolean = false) => {
    const qty = parseInt(manualItemQty) || 1;
    const price = parseFloat(manualItemPrice) || 0;
    const validation = checkItemInReceipt(itemName, officialReceiptItemNames);

    const newItem: ReceiptItem = {
      id: `item_manual_${Date.now()}`,
      name: itemName,
      quantity: qty,
      totalPrice: parseFloat((price * qty).toFixed(2)),
      isUnverified: isFlaggedUnverified || !validation.isValid,
    };

    setReceipt((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setAssignments((prev) => ({
      ...prev,
      [newItem.id]: [],
    }));

    setManualItemName("");
    setManualItemPrice("");
    setManualItemQty("1");
    setManualItemError(null);
  };

  const handleRemoveItem = (itemId: string) => {
    setReceipt((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));

    // Clean up assignments for this item
    const updatedAssignments = { ...assignments };
    delete updatedAssignments[itemId];
    setAssignments(updatedAssignments);
  };

  // Editing existing items
  const startEditingItem = (item: ReceiptItem) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemQty(item.quantity.toString());
    setEditItemPrice((item.totalPrice / item.quantity).toFixed(2));
  };

  const saveEditedItem = () => {
    if (!editingItemId) return;
    const qty = parseInt(editItemQty) || 1;
    const unitPrice = parseFloat(editItemPrice) || 0;

    setReceipt((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === editingItemId
          ? {
              ...item,
              name: editItemName.trim(),
              quantity: qty,
              totalPrice: parseFloat((unitPrice * qty).toFixed(2)),
            }
          : item
      ),
    }));

    setEditingItemId(null);
  };

  // Edit Tax Rates
  const handleSaveTaxes = () => {
    const svc = parseFloat(tempServicePercent) || 0;
    const tax = parseFloat(tempTaxPercent) || 0;
    setReceipt((prev) => ({
      ...prev,
      serviceChargePercent: svc,
      taxPercent: tax,
    }));
    setEditingTaxes(false);
  };

  // Item assignment toggle helper
  const toggleAssignment = (itemId: string, guestId: string) => {
    setAssignments((prev) => {
      const currentAssigned = prev[itemId] || [];
      const isAssigned = currentAssigned.includes(guestId);

      const updated = isAssigned
        ? currentAssigned.filter((id) => id !== guestId)
        : [...currentAssigned, guestId];

      return {
        ...prev,
        [itemId]: updated,
      };
    });
  };

  const handleAssignAllToItem = (itemId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [itemId]: guests.map((g) => g.id),
    }));
  };

  const handleClearItemAssignments = (itemId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [itemId]: [],
    }));
  };

  // Currency switch handler with auto-conversion
  const handleCurrencyChange = (newCurrency: CurrencyInfo, convert: boolean) => {
    if (convert && currentCurrency.code !== newCurrency.code) {
      setReceipt((prev) => ({
        ...prev,
        items: prev.items.map((item) => ({
          ...item,
          totalPrice: convertAmount(item.totalPrice, currentCurrency, newCurrency),
        })),
      }));
    }
    setCurrentCurrency(newCurrency);
  };

  return (
    <div className="min-h-screen bg-[#09090b] py-10 px-4 sm:px-6 lg:px-8 font-sans text-zinc-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Upper Header Block */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-xxs font-black tracking-wide uppercase">
                Trattoria Bella Case Study
              </span>
              <span className="bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded-full text-xxs font-medium">
                Vite + React
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-100 flex items-center gap-2">
              <Calculator className="w-8 h-8 text-indigo-400" />
              Receipt Cost Splitter with OCR
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Upload a dining receipt, let Gemini extract the items and prices, or load the built-in dinner party workshop data below to test calculations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CurrencySelector
              currentCurrency={currentCurrency}
              onCurrencyChange={handleCurrencyChange}
              autoConvertValues={autoConvertValues}
              setAutoConvertValues={setAutoConvertValues}
            />
            <button
              onClick={handleLoadWorkshopDemo}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <BookOpen className="w-4 h-4" />
              Load Workshop 7 Demo
            </button>
            <button
              onClick={handleClearAll}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Clear & Reset
            </button>
          </div>
        </header>

        {/* Informative Toast Banner about Workshop 7 */}
        <div className="bg-[#111113] border border-zinc-800/80 p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 rounded-lg flex-shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-sm text-zinc-300 leading-relaxed">
            <span className="font-bold text-zinc-100">Workshop 7 Demo Preloaded:</span> This app comes preloaded with the exact receipt data from <span className="font-bold text-indigo-400">Trattoria Bella</span> ($280.57 total, table 14) and the dinner sharing assignments of the <span className="font-bold text-indigo-400">5 guests</span> (Marco, Chloe, Jia Rui, Alessia, Shawn). You can experiment with adding/editing items or upload other receipts!
          </div>
        </div>

        {/* MAIN SPLIT-SCREEN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR: RECEIPT SCANNER & ITEMS (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. OCR File Scanner */}
            <ReceiptScanner
              onReceiptParsed={handleReceiptParsed}
              isLoading={isOcrLoading}
              setIsLoading={setIsOcrLoading}
            />

            {/* 2. Receipts & Taxes List */}
            <div className="bg-[#111113] rounded-2xl border border-zinc-800/80 shadow-md p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
                <div>
                  <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-indigo-400" />
                    Receipt Items
                  </h3>
                  <p className="text-xxs text-zinc-400">Add or click an item row to edit prices</p>
                </div>
                <span className="text-xs bg-zinc-900 border border-zinc-800 font-semibold px-2 py-1 rounded-lg text-zinc-400">
                  {receipt.items.length} Items Listed
                </span>
              </div>

              {/* Items Table / List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {receipt.items.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 text-xs italic">
                    No items listed. Try uploading a receipt or click "Load Workshop 7 Demo"
                  </div>
                ) : (
                  receipt.items.map((item) => {
                    const validation = checkItemInReceipt(item.name, officialReceiptItemNames);
                    const isUnstated = !validation.isValid || item.isUnverified;

                    return (
                      <div
                        key={item.id}
                        className={`group border rounded-xl p-3 flex flex-col transition-all ${
                          isUnstated
                            ? "border-rose-500/60 bg-rose-950/20 shadow-inner"
                            : editingItemId === item.id
                            ? "border-indigo-500/50 bg-indigo-950/20"
                            : "border-zinc-800 bg-zinc-900/10 hover:border-zinc-700/80"
                        }`}
                      >
                        {editingItemId === item.id ? (
                          /* Inline Edit Mode */
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editItemName}
                              onChange={(e) => setEditItemName(e.target.value)}
                              className="w-full text-xs font-semibold p-1.5 border border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-zinc-950/60 text-zinc-200"
                              placeholder="Item name"
                            />
                            {editItemName.trim() && !checkItemInReceipt(editItemName, officialReceiptItemNames).isValid && (
                              <p className="text-xxs text-rose-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                Warning: "{editItemName}" is not stated in the official receipt.
                              </p>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xxs text-zinc-500 mb-0.5 font-semibold uppercase tracking-wider">Qty</label>
                                <input
                                  type="number"
                                  value={editItemQty}
                                  onChange={(e) => setEditItemQty(e.target.value)}
                                  className="w-full text-xs p-1.5 border border-zinc-700 rounded-lg focus:outline-none bg-zinc-950/60 text-zinc-200"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="block text-xxs text-zinc-500 mb-0.5 font-semibold uppercase tracking-wider">Unit Price ($)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editItemPrice}
                                  onChange={(e) => setEditItemPrice(e.target.value)}
                                  className="w-full text-xs p-1.5 border border-zinc-700 rounded-lg focus:outline-none bg-zinc-950/60 text-zinc-200"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-1.5 pt-1">
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="px-2.5 py-1 text-zinc-400 hover:bg-zinc-800 rounded-md text-xxs font-semibold"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={saveEditedItem}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xxs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Normal Row View */
                          <div>
                            <div className="flex justify-between items-center">
                              <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-zinc-300 text-xs bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                                    {item.quantity}x
                                  </span>
                                  <span className={`font-semibold text-xs truncate ${isUnstated ? "text-rose-200 font-bold" : "text-zinc-200"}`}>
                                    {item.name}
                                  </span>
                                  {isUnstated && (
                                    <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      Not on Receipt
                                    </span>
                                  )}
                                </div>
                                <span className="text-xxs text-zinc-500 mt-0.5 block">
                                  Unit price: {formatPrice(item.totalPrice / item.quantity, currentCurrency)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-100 text-xs font-mono">
                                  {formatPrice(item.totalPrice, currentCurrency)}
                                </span>
                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                  <button
                                    onClick={() => startEditingItem(item)}
                                    className="p-1 text-zinc-400 hover:text-indigo-400 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                                    title="Edit Item"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="p-1 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                                    title="Delete Item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Explicit inline error result for unstated receipt items */}
                            {isUnstated && (
                              <div className="mt-2 pt-1.5 border-t border-rose-500/20 text-[11px] text-rose-300 font-medium flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                <span>Item error: <strong>"{item.name}"</strong> is not stated in the official receipt.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Manual Item Form */}
              <form onSubmit={handleAddManualItem} className="border-t border-zinc-800/60 pt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Add Item Manually</p>
                  {manualItemName.trim() && (
                    <div>
                      {checkItemInReceipt(manualItemName, officialReceiptItemNames).isValid ? (
                        <span className="text-xxs text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Valid item on receipt
                        </span>
                      ) : (
                        <span className="text-xxs text-rose-400 font-extrabold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" /> Not stated on receipt
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualItemName}
                    onChange={(e) => setManualItemName(e.target.value)}
                    placeholder="E.g. Chicken Wings or Aperol Spritz"
                    className={`flex-1 text-xs p-2 border rounded-lg focus:outline-none focus:ring-1 text-zinc-200 placeholder-zinc-600 transition-colors ${
                      manualItemName.trim() && !checkItemInReceipt(manualItemName, officialReceiptItemNames).isValid
                        ? "border-rose-500 bg-rose-950/20 focus:ring-rose-500"
                        : "border-zinc-700 bg-zinc-950/40 focus:ring-indigo-500 focus:bg-zinc-900/60"
                    }`}
                  />
                  <input
                    type="number"
                    value={manualItemQty}
                    onChange={(e) => setManualItemQty(e.target.value)}
                    placeholder="Qty"
                    className="w-12 text-xs p-2 border border-zinc-700 rounded-lg focus:outline-none bg-zinc-950/40 text-zinc-200 text-center placeholder-zinc-600 font-mono"
                    min="1"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={manualItemPrice}
                    onChange={(e) => setManualItemPrice(e.target.value)}
                    placeholder={`${currentCurrency.symbol} Price`}
                    className="w-20 text-xs p-2 border border-zinc-700 rounded-lg focus:outline-none bg-zinc-950/40 text-zinc-200 font-mono placeholder-zinc-600"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition cursor-pointer flex items-center justify-center"
                    title="Add Item"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Error Result Card for Non-Receipt Items */}
                <AnimatePresence>
                  {manualItemError && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="p-3.5 bg-rose-950/40 border border-rose-500/60 rounded-xl space-y-2 text-xs text-rose-200 mt-2 shadow-lg"
                    >
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <h5 className="font-extrabold text-rose-200 text-xs flex items-center gap-1">
                              ❌ Food Item Error Result
                            </h5>
                            <button
                              type="button"
                              onClick={() => setManualItemError(null)}
                              className="text-rose-400 hover:text-rose-200 p-0.5 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="font-extrabold text-rose-300 text-xs">
                            {manualItemError.message}
                          </p>
                          <p className="text-xxs text-rose-200/90 leading-relaxed">
                            {manualItemError.suggestion}
                          </p>
                          
                          {officialReceiptItemNames.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-rose-500/20 text-xxs">
                              <span className="font-bold text-rose-300 block mb-1">
                                Click to select valid item from receipt:
                              </span>
                              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                {officialReceiptItemNames.map((name, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      setManualItemName(name);
                                      setManualItemError(null);
                                    }}
                                    className="bg-rose-900/40 hover:bg-rose-800 border border-rose-500/30 text-rose-200 px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer"
                                  >
                                    + {name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="pt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setManualItemError(null)}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xxs font-bold transition cursor-pointer"
                            >
                              Fix Item Name
                            </button>
                            <button
                              type="button"
                              onClick={() => forceAddManualItem(manualItemError.attemptedName, true)}
                              className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded text-xxs font-bold transition cursor-pointer"
                            >
                              Add Anyway (Flagged as Invalid)
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              {/* Subtotal & Taxes Breakdown */}
              <div className="border-t border-zinc-800/60 pt-4 space-y-2.5 text-xs text-zinc-300">
                <div className="flex justify-between font-medium">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold text-zinc-100">{formatPrice(receipt.subtotal, currentCurrency)}</span>
                </div>

                {editingTaxes ? (
                  <div className="p-3 bg-zinc-900 border border-zinc-800/80 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xxs text-zinc-400 mb-1 font-semibold">Service Charge (%)</label>
                        <input
                          type="number"
                          value={tempServicePercent}
                          onChange={(e) => setTempServicePercent(e.target.value)}
                          className="w-full bg-zinc-950/60 text-xs p-1.5 border border-zinc-700 rounded-lg focus:outline-none text-zinc-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xxs text-zinc-400 mb-1 font-semibold">Tax / GST (%)</label>
                        <input
                          type="number"
                          value={tempTaxPercent}
                          onChange={(e) => setTempTaxPercent(e.target.value)}
                          className="w-full bg-zinc-950/60 text-xs p-1.5 border border-zinc-700 rounded-lg focus:outline-none text-zinc-200"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingTaxes(false)}
                        className="px-2 py-1 text-zinc-400 hover:bg-zinc-800 rounded text-xxs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTaxes}
                        className="px-2.5 py-1 bg-indigo-600 text-white font-bold rounded text-xxs cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span className="flex items-center gap-1">
                        Service Charge ({receipt.serviceChargePercent}%)
                        <button
                          onClick={() => {
                            setEditingTaxes(true);
                            setTempServicePercent(receipt.serviceChargePercent.toString());
                            setTempTaxPercent(receipt.taxPercent.toString());
                          }}
                          className="text-indigo-400 hover:underline hover:text-indigo-300 text-xxs font-semibold"
                        >
                          (edit)
                        </button>
                      </span>
                      <span className="font-mono">{formatPrice(receipt.subtotal * receipt.serviceChargePercent / 100, currentCurrency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span className="flex items-center gap-1">
                        GST ({receipt.taxPercent}%)
                        <button
                          onClick={() => {
                            setEditingTaxes(true);
                            setTempServicePercent(receipt.serviceChargePercent.toString());
                            setTempTaxPercent(receipt.taxPercent.toString());
                          }}
                          className="text-indigo-400 hover:underline hover:text-indigo-300 text-xxs font-semibold"
                        >
                          (edit)
                        </button>
                      </span>
                      <span className="font-mono">
                        {formatPrice(((receipt.subtotal + (receipt.subtotal * receipt.serviceChargePercent / 100)) * receipt.taxPercent / 100), currentCurrency)}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between border-t border-zinc-800/60 pt-2.5 font-bold text-zinc-100 text-sm">
                  <span>Grand Total</span>
                  <span className="font-mono text-indigo-400 font-extrabold">{formatPrice(receipt.total, currentCurrency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT VIEW: INTERACTIVE ASSIGNMENT MATRIX & PARTY LIST (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Dinner Party Guest Manager */}
            <div className="bg-[#111113] rounded-2xl border border-zinc-800/80 shadow-md p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
                <div>
                  <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    Dinner Guests Party
                  </h3>
                  <p className="text-xxs text-zinc-400">Add friends who are sharing this meal</p>
                </div>
                <span className="text-xs bg-zinc-900 border border-zinc-800 font-semibold px-2 py-1 rounded-lg text-zinc-400">
                  {guests.length} Friends
                </span>
              </div>

              {/* Guests Grid list */}
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {guests.map((guest) => (
                    <motion.div
                      key={guest.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800/80 rounded-full text-xs font-semibold text-zinc-300 transition"
                    >
                      <div className="w-5 h-5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {guest.name.charAt(0)}
                      </div>
                      <span>{guest.name}</span>
                      <button
                        onClick={() => handleRemoveGuest(guest.id)}
                        className="text-zinc-500 hover:text-rose-400 font-bold transition ml-0.5 text-sm cursor-pointer"
                      >
                        &times;
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Inline add guest form */}
                <form onSubmit={handleAddGuest} className="inline-flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    placeholder="Add guest..."
                    className="text-xs px-3 py-1.5 border border-zinc-700 rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-zinc-950/40 text-zinc-200 max-w-[120px]"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 rounded-full text-indigo-400 transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* 2. ITEM ASSIGNMENT MATRIX */}
            <div className="bg-[#111113] rounded-2xl border border-zinc-800/80 shadow-md p-6 space-y-4">
              <div className="border-b border-zinc-800/60 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-indigo-400" />
                    Interactive Cost Sharing Matrix
                  </h3>
                  <p className="text-xxs text-zinc-400">Select which guest(s) ordered/shared each item</p>
                </div>
              </div>

              {guests.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs italic">
                  Please add guests to begin cost sharing assignments.
                </div>
              ) : receipt.items.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs italic">
                  Add items to the receipt list to begin cost sharing.
                </div>
              ) : (
                <div className="space-y-4">
                  {receipt.items.map((item) => {
                    const assignedGuests = assignments[item.id] || [];
                    const shareCount = assignedGuests.length;
                    const splitPrice = shareCount > 0 ? item.totalPrice / shareCount : 0;
                    const isUnstated = !checkItemInReceipt(item.name, officialReceiptItemNames).isValid || item.isUnverified;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 border rounded-xl space-y-3 transition-all ${
                          isUnstated
                            ? "border-rose-500/50 bg-rose-950/20"
                            : "border-zinc-800/60 bg-zinc-900/10 hover:border-zinc-750"
                        }`}
                      >
                        {/* Item Row Overview */}
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md font-mono">
                                {item.quantity}x
                              </span>
                              <h4 className="font-bold text-zinc-200 text-sm">{item.name}</h4>
                              {isUnstated && (
                                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  Not on receipt
                                </span>
                              )}
                            </div>
                            <p className="text-xxs text-zinc-450 mt-1">
                              Total Price: <span className="font-bold text-zinc-300">{formatPrice(item.totalPrice, currentCurrency)}</span>
                              {shareCount > 0 && (
                                <span className="text-indigo-400 font-semibold ml-2">
                                  ➔ {formatPrice(splitPrice, currentCurrency)} each ({shareCount} split)
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Quick Assignment tools */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleAssignAllToItem(item.id)}
                              className="px-2 py-0.5 text-xxs font-semibold bg-zinc-900 hover:bg-indigo-600/10 hover:text-indigo-400 border border-zinc-800 rounded text-zinc-400 transition cursor-pointer"
                            >
                              Split All
                            </button>
                            <button
                              onClick={() => handleClearItemAssignments(item.id)}
                              className="px-2 py-0.5 text-xxs font-semibold bg-zinc-900 hover:bg-rose-900/10 hover:text-rose-400 border border-zinc-800 rounded text-zinc-400 transition cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {/* Interactive Guest Pills Selection */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {guests.map((guest) => {
                            const isAssigned = assignedGuests.includes(guest.id);
                            return (
                              <button
                                key={guest.id}
                                onClick={() => toggleAssignment(item.id, guest.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xxs font-semibold transition cursor-pointer ${
                                  isAssigned
                                    ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500/30"
                                    : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800/80"
                                }`}
                              >
                                <div
                                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold text-[8px] ${
                                    isAssigned ? "bg-indigo-800 text-white" : "bg-zinc-800 text-zinc-500 border border-zinc-700/60"
                                  }`}
                                >
                                  {guest.name.charAt(0)}
                                </div>
                                <span>{guest.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* BOTTOM SECTION: SETTLEMENT BREAKDOWNS & SUMMARIES */}
        <section className="bg-[#111113] border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-md">
          <div className="border-b border-zinc-800/60 pb-5 mb-6">
            <h2 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-indigo-400" />
              Final Costs Split & Settlement Breakdowns
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Exact calculations of subtotals, proportional service charges, GST amounts, and final peer-to-peer repayments.
            </p>
          </div>

          {guests.length === 0 || receipt.items.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 text-sm italic">
              Please configure your Receipt Items and Guests list above to view final settlement calculations.
            </div>
          ) : (
            <SettlementSummary
              receipt={receipt}
              guests={guests}
              assignments={assignments}
              currency={currentCurrency}
            />
          )}
        </section>

      </div>
    </div>
  );
}
