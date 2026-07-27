import React, { useState } from "react";
import { ReceiptData, Guest } from "../types";
import { Copy, Check, QrCode, Phone, Sparkles, Send, Share2, Info, Search, User, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SettlementSummaryProps {
  receipt: ReceiptData;
  guests: Guest[];
  assignments: Record<string, string[]>; // itemId -> guestIds[]
}

export default function SettlementSummary({ receipt, guests, assignments }: SettlementSummaryProps) {
  const [payerId, setPayerId] = useState<string>(guests[0]?.id || "");
  const [copied, setCopied] = useState(false);
  const [selectedGuestForQr, setSelectedGuestForQr] = useState<string | null>(null);
  const [paymentPhone, setPaymentPhone] = useState("+65 9123 4567");
  const [qrSimulated, setQrSimulated] = useState(false);
  const [searchName, setSearchName] = useState("");

  // Calculate costs per guest
  const guestCosts = guests.map((guest) => {
    let subtotal = 0;
    const itemsList: { name: string; quantity: number; originalPrice: number; portion: number; cost: number; isUnverified?: boolean }[] = [];

    receipt.items.forEach((item) => {
      const assignedGuests = assignments[item.id] || [];
      if (assignedGuests.includes(guest.id)) {
        const shareCount = assignedGuests.length;
        const portionCost = item.totalPrice / shareCount;
        subtotal += portionCost;

        itemsList.push({
          name: item.name,
          quantity: item.quantity,
          originalPrice: item.totalPrice,
          portion: 1 / shareCount,
          cost: portionCost,
          isUnverified: item.isUnverified,
        });
      }
    });

    const serviceCharge = subtotal * (receipt.serviceChargePercent / 100);
    // Singapore GST is typically calculated on (Subtotal + Service Charge)
    const tax = (subtotal + serviceCharge) * (receipt.taxPercent / 100);
    const total = subtotal + serviceCharge + tax;

    return {
      guest,
      subtotal,
      serviceCharge,
      tax,
      total,
      items: itemsList,
    };
  });

  const payerName = guests.find((g) => g.id === payerId)?.name || "Someone";

  // Generate transfers
  const transfers: { from: string; to: string; amount: number }[] = [];
  guestCosts.forEach((costInfo) => {
    if (costInfo.guest.id !== payerId && costInfo.total > 0) {
      transfers.push({
        from: costInfo.guest.name,
        to: payerName,
        amount: costInfo.total,
      });
    }
  });

  // Calculate overall statistics
  const totalAssignedSubtotal = guestCosts.reduce((sum, gc) => sum + gc.subtotal, 0);
  const unassignedSubtotal = Math.max(0, receipt.subtotal - totalAssignedSubtotal);
  const unassignedService = unassignedSubtotal * (receipt.serviceChargePercent / 100);
  const unassignedTax = (unassignedSubtotal + unassignedService) * (receipt.taxPercent / 100);
  const unassignedTotal = unassignedSubtotal + unassignedService + unassignedTax;

  // Find matching guests for quick personal lookup
  const trimmedSearch = searchName.trim().toLowerCase();
  const matchedCosts = trimmedSearch 
    ? guestCosts.filter((gc) => gc.guest.name.toLowerCase().includes(trimmedSearch))
    : [];

  const handleCopySummary = () => {
    let text = `📝 BILL SPLIT SUMMARY - ${receipt.items.length > 0 ? "Dinner Out" : "Meal"}\n`;
    text += `-------------------------------------------\n`;
    text += `Subtotal: $${receipt.subtotal.toFixed(2)}\n`;
    if (receipt.serviceChargePercent > 0) text += `Service Charge (${receipt.serviceChargePercent}%): $${(receipt.subtotal * receipt.serviceChargePercent / 100).toFixed(2)}\n`;
    if (receipt.taxPercent > 0) text += `GST (${receipt.taxPercent}%): $${((receipt.subtotal * (1 + receipt.serviceChargePercent/100)) * receipt.taxPercent / 100).toFixed(2)}\n`;
    text += `Grand Total: $${receipt.total.toFixed(2)}\n`;
    text += `Paid by: ${payerName}\n\n`;

    text += `👥 INDIVIDUAL BREAKDOWN\n`;
    text += `-------------------------------------------\n`;
    guestCosts.forEach((gc) => {
      if (gc.total > 0) {
        text += `${gc.guest.name}: $${gc.total.toFixed(2)}\n`;
        gc.items.forEach((item) => {
          const partStr = item.portion === 1 ? "" : ` (${(item.portion * 100).toFixed(0)}% share)`;
          text += `  • ${item.name}: $${item.cost.toFixed(2)}${partStr}\n`;
        });
        text += `  (Sub: $${gc.subtotal.toFixed(2)} + Svc: $${gc.serviceCharge.toFixed(2)} + GST: $${gc.tax.toFixed(2)})\n\n`;
      }
    });

    if (unassignedTotal > 0.01) {
      text += `⚠️ Unassigned Items: $${unassignedTotal.toFixed(2)}\n\n`;
    }

    text += `💸 REPAYMENTS TO ${payerName.toUpperCase()}\n`;
    text += `-------------------------------------------\n`;
    if (transfers.length === 0) {
      text += `No transfers needed. Everyone is settled!\n`;
    } else {
      transfers.forEach((t) => {
        text += `• ${t.from} owes $${t.amount.toFixed(2)}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111113] border border-zinc-800/80 p-4 rounded-2xl">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Subtotal / Total Bill</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-zinc-100">${receipt.total.toFixed(2)}</span>
            <span className="text-xs text-zinc-500">Sub: ${receipt.subtotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-[#111113] border border-zinc-800/80 p-4 rounded-2xl">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Assignments Progress</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-zinc-100">
              {((totalAssignedSubtotal / (receipt.subtotal || 1)) * 100).toFixed(0)}%
            </span>
            <span className="text-xs text-zinc-500">
              ${totalAssignedSubtotal.toFixed(2)} of ${receipt.subtotal.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (totalAssignedSubtotal / (receipt.subtotal || 1)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-indigo-950/20 border border-indigo-900/30 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              Who Paid the Bill?
            </label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-2 text-sm font-semibold text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Warnings for unassigned items */}
      {unassignedSubtotal > 0.05 && (
        <div className="bg-amber-950/20 border border-amber-900/30 text-amber-300 p-4 rounded-2xl flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold">Unassigned items remaining:</span> Some items are not yet fully assigned to guests.
            <p className="mt-1 text-zinc-400">
              Currently, <span className="font-semibold text-amber-200">${unassignedTotal.toFixed(2)}</span> of the bill (including taxes) remains unassigned. Assign all items to ensure exact split accounts.
            </p>
          </div>
        </div>
      )}

      {/* Quick Personal Bill Lookup Card */}
      <div className="bg-[#111113] border border-zinc-800/80 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
              <Search className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">Quick Personal Bill Lookup</h4>
              <p className="text-xxs text-zinc-400">Enter your name to see exactly how much you need to pay</p>
            </div>
          </div>
          {searchName && (
            <button 
              onClick={() => setSearchName("")} 
              className="text-xxs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition self-start sm:self-auto cursor-pointer"
            >
              Clear Lookup
            </button>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Type your name (e.g. Shawn, Marco, Chloe...)"
            className="w-full text-sm p-3.5 pl-10 border border-zinc-700 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 bg-zinc-950/60 text-zinc-100 placeholder-zinc-500 transition-all"
          />
          <User className="absolute left-3.5 top-4 w-4.5 h-4.5 text-zinc-500" />
          
          {/* Quick Click Suggestions */}
          {guests.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
              <span className="text-xxs font-semibold text-zinc-500 uppercase tracking-wider mr-1">Quick Select:</span>
              {guests.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSearchName(g.name)}
                  className={`text-xxs px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer border ${
                    searchName.toLowerCase() === g.name.toLowerCase()
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-400"
                      : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-indigo-400"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Display lookup results with smooth motion animation */}
        <AnimatePresence mode="wait">
          {searchName.trim() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-2 overflow-hidden"
            >
              {matchedCosts.length === 0 ? (
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl text-center text-xs text-zinc-500 italic">
                  No guest found matching "{searchName}". Try typing another name above.
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedCosts.map((gc) => {
                    const isPayer = gc.guest.id === payerId;
                    return (
                      <div 
                        key={gc.guest.id}
                        className="bg-zinc-900/40 border border-indigo-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden"
                      >
                        {/* Subtle accent gradient background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-zinc-100 text-lg">{gc.guest.name}'s Summary</span>
                              {isPayer ? (
                                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 text-xxs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                  Paid Bill
                                </span>
                              ) : (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xxs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                  Owes {payerName}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                              Subtotal: <span className="font-mono text-zinc-300">${gc.subtotal.toFixed(2)}</span> • 
                              Svc Charge: <span className="font-mono text-zinc-300">${gc.serviceCharge.toFixed(2)}</span> • 
                              GST: <span className="font-mono text-zinc-300">${gc.tax.toFixed(2)}</span>
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-xxs text-zinc-500 uppercase tracking-widest font-bold">Total share amount</p>
                            <p className="text-3xl font-black font-mono text-indigo-400 mt-0.5">${gc.total.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Itemized checklist */}
                        <div className="mt-4 pt-3.5 border-t border-zinc-800/60">
                          <p className="text-xxs font-bold uppercase tracking-widest text-zinc-500 mb-2.5">Itemized Shared List ({gc.items.length} items)</p>
                          {gc.items.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic">No food/drink items assigned to this person yet. Tap items in the sharing matrix to assign.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {gc.items.map((item, idx) => (
                                <div key={idx} className={`flex justify-between items-center text-xs p-2.5 rounded-lg border ${item.isUnverified ? "bg-rose-950/20 border-rose-500/40" : "bg-zinc-950/60 border-zinc-850"}`}>
                                  <span className="text-zinc-200 truncate pr-2 flex items-center gap-1.5 flex-wrap">
                                    <span>{item.quantity}x {item.name}</span>
                                    {item.portion < 1 && (
                                      <span className="text-zinc-500 font-mono">
                                        ({(item.portion * 100).toFixed(0)}% share)
                                      </span>
                                    )}
                                    {item.isUnverified && (
                                      <span className="text-rose-400 text-[10px] font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 inline-flex items-center gap-0.5">
                                        <AlertTriangle className="w-2.5 h-2.5" /> Not on receipt
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-semibold text-zinc-400 font-mono">${item.cost.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {!isPayer && gc.total > 0 && (
                          <div className="mt-5 pt-3.5 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                              <span className="text-xs text-zinc-400">
                                Please settle payment of <span className="font-bold text-indigo-400 font-mono">${gc.total.toFixed(2)}</span> to {payerName}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedGuestForQr(gc.guest.id);
                                setQrSimulated(false);
                              }}
                              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                            >
                              <QrCode className="w-4 h-4" />
                              Scan PayNow QR Code
                            </button>
                          </div>
                        )}

                        {isPayer && (
                          <div className="mt-4 p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
                            <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 animate-bounce" />
                            <span>
                              Since you paid the grand total of <strong>${receipt.total.toFixed(2)}</strong>, other guests owe you a combined <strong>${transfers.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</strong>. Use the WhatsApp/Telegram format below to copy and share the summary with your group!
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settlement Cards Grid */}
      <div className="space-y-4">
        <h3 className="font-semibold text-zinc-200 text-base">Individual Breakdowns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guestCosts.map((gc) => {
            const isPayer = gc.guest.id === payerId;
            return (
              <div
                key={gc.guest.id}
                className={`border rounded-2xl p-5 bg-[#111113] transition-all ${
                  isPayer ? "border-indigo-500/50 ring-2 ring-indigo-500/5" : "border-zinc-800/80"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-100 text-lg">{gc.guest.name}</span>
                      {isPayer && (
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 text-xxs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Paid Bill
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Sub: ${gc.subtotal.toFixed(2)} • Svc: ${gc.serviceCharge.toFixed(2)} • GST: ${gc.tax.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-xl font-black text-zinc-100">${gc.total.toFixed(2)}</span>
                </div>

                {/* Items Breakdowns */}
                {gc.items.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-2">No items assigned yet</p>
                ) : (
                  <div className="space-y-1.5 border-t border-zinc-800/60 pt-3">
                    {gc.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-zinc-300">
                        <span className="truncate max-w-[200px]">
                          {item.quantity}x {item.name}
                          {item.portion < 1 && (
                            <span className="text-zinc-500 ml-1 font-mono">
                              (1/{Math.round(1 / item.portion)} share)
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-zinc-400">${item.cost.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Repayment Action for other guests */}
                {!isPayer && gc.total > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">
                      Owes {payerName} <span className="font-semibold text-indigo-400">${gc.total.toFixed(2)}</span>
                    </span>
                    <button
                      onClick={() => {
                        setSelectedGuestForQr(gc.guest.id);
                        setQrSimulated(false);
                      }}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/50 rounded-lg text-xs font-semibold text-zinc-300 hover:text-indigo-400 transition flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                      PayNow QR
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Peer-to-Peer Transfer Guidelines & Summary Box */}
      <div className="bg-[#111113] border border-zinc-800/80 rounded-2xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h4 className="font-bold text-zinc-200">Repayments Summary</h4>
            <p className="text-xs text-zinc-400">Repayment instructions based on who paid the receipt.</p>
          </div>
          <button
            onClick={handleCopySummary}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-md cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Full Breakdown"}
          </button>
        </div>

        <div className="bg-zinc-950/60 rounded-xl p-4 font-mono text-sm text-zinc-300 whitespace-pre-line border border-zinc-800/60 leading-relaxed max-h-[300px] overflow-y-auto">
          <div className="text-zinc-500 mb-2 border-b border-zinc-800/60 pb-2">
            📲 WhatsApp/Telegram Format:
          </div>
          {`📝 BILL SPLIT SUMMARY - ${receipt.items.length > 0 ? "Trattoria Bella" : "Meal"}
Paid by: ${payerName}
---------------------------------
Total Bill: $${receipt.total.toFixed(2)}

💸 REPAYMENTS:`}
          {"\n"}
          {transfers.length === 0
            ? "No transfers needed. Everyone is settled!"
            : transfers
                .map((t) => `• ${t.from} owes ${t.to}: $${t.amount.toFixed(2)}`)
                .join("\n")}
        </div>
      </div>

      {/* PayNow QR Generator Modal */}
      <AnimatePresence>
        {selectedGuestForQr && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111113] rounded-3xl border border-zinc-800/80 shadow-2xl max-w-sm w-full p-6 text-center relative overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedGuestForQr(null)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 text-2xl font-light cursor-pointer"
              >
                &times;
              </button>

              <div className="bg-indigo-950/60 -mx-6 -mt-6 p-4 text-white text-center flex items-center justify-center gap-1.5 border-b border-indigo-900/30">
                <span className="font-black tracking-widest text-lg text-amber-400">PayNow</span>
                <span className="text-xs bg-indigo-900/80 px-2 py-0.5 rounded-md font-semibold text-indigo-300 border border-indigo-500/20">SGQR</span>
              </div>

              {/* Guest Details */}
              <div className="mt-6 space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Payment Request</p>
                <h4 className="text-lg font-bold text-zinc-200">
                  {guests.find((g) => g.id === selectedGuestForQr)?.name} ➔ {payerName}
                </h4>
                <div className="text-3xl font-black text-indigo-400 py-3 font-mono">
                  ${guestCosts.find((gc) => gc.guest.id === selectedGuestForQr)?.total.toFixed(2)}
                </div>
              </div>

              {/* Configurable Mobile number for simulator */}
              <div className="mt-3 border border-zinc-800 rounded-xl p-3 bg-zinc-950/40 inline-flex flex-col text-left w-full">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{payerName}'s PayNow Mobile Number / UEN</span>
                </div>
                <input
                  type="text"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  placeholder="e.g. +65 9123 4567"
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Simulated QR Code Canvas */}
              <div className="my-6 relative flex justify-center">
                <div className="bg-zinc-900 border-4 border-zinc-950 p-4 rounded-2xl relative shadow-md">
                  <div className="w-48 h-48 bg-zinc-950 rounded-lg flex flex-col items-center justify-center border border-zinc-800 relative overflow-hidden">
                    {/* Real SVG blocks styled to resemble Singapore QR Codes */}
                    <div className="absolute inset-2 grid grid-cols-6 grid-rows-6 gap-1 opacity-70">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-xs ${
                            (i * 13 + 7) % 5 === 0 || (i % 7 === 0 && i > 10) || i < 6 || i === 30 || i === 35
                              ? "bg-zinc-200"
                              : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                    {/* Corner Squares */}
                    <div className="absolute top-2 left-2 w-10 h-10 border-4 border-zinc-200 bg-zinc-950 flex items-center justify-center">
                      <div className="w-4 h-4 bg-zinc-200" />
                    </div>
                    <div className="absolute top-2 right-2 w-10 h-10 border-4 border-zinc-200 bg-zinc-950 flex items-center justify-center">
                      <div className="w-4 h-4 bg-zinc-200" />
                    </div>
                    <div className="absolute bottom-2 left-2 w-10 h-10 border-4 border-zinc-200 bg-zinc-950 flex items-center justify-center">
                      <div className="w-4 h-4 bg-zinc-200" />
                    </div>

                    {/* PayNow Logo overlay inside QR */}
                    <div className="z-10 bg-indigo-950 border border-zinc-700 px-2.5 py-1 rounded-md shadow-lg text-[10px] font-black text-amber-400 tracking-wide">
                      PayNow
                    </div>
                  </div>

                  {qrSimulated && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-[#111113]/95 flex flex-col items-center justify-center rounded-2xl p-4"
                    >
                      <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20 mb-2">
                        <Check className="w-8 h-8" />
                      </div>
                      <p className="font-bold text-zinc-100 text-sm">Payment Received!</p>
                      <p className="text-xs text-zinc-400 text-center mt-1">
                        Repayments updated for {guests.find((g) => g.id === selectedGuestForQr)?.name}.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Simulation triggers */}
              {!qrSimulated ? (
                <div className="space-y-2">
                  <p className="text-xxs text-zinc-500">
                    Scan with any Singapore banking app (DBS, OCBC, UOB) to send funds directly.
                  </p>
                  <button
                    onClick={() => setQrSimulated(true)}
                    className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Simulate Payment Complete
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSelectedGuestForQr(null);
                  }}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Done
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
