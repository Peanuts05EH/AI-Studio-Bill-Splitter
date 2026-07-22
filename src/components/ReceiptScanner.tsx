import React, { useState, useRef } from "react";
import { Upload, FileText, Sparkles, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { ReceiptData } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ReceiptScannerProps {
  onReceiptParsed: (data: ReceiptData) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function ReceiptScanner({ onReceiptParsed, isLoading, setIsLoading }: ReceiptScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [showTextPaste, setShowTextPaste] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Please upload an image (PNG, JPG, WebP) or a PDF.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Data = e.target?.result as string;
        
        const response = await fetch("/api/parse-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.details || errData.error || "Failed to parse receipt");
        }

        const data = await response.json();
        
        // Ensure items have IDs
        const itemsWithIds = (data.items || []).map((item: any, idx: number) => ({
          ...item,
          id: `item_uploaded_${Date.now()}_${idx}`,
          quantity: item.quantity || 1,
          totalPrice: parseFloat(item.totalPrice) || 0,
        }));

        onReceiptParsed({
          items: itemsWithIds,
          subtotal: parseFloat(data.subtotal) || 0,
          serviceChargePercent: parseFloat(data.serviceChargePercent) || 0,
          taxPercent: parseFloat(data.taxPercent) || 0,
          total: parseFloat(data.total) || 0,
        });
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred while parsing the receipt.");
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Failed to read file.");
      setIsLoading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textInput: textInput,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || errData.error || "Failed to parse text");
      }

      const data = await response.json();
      
      const itemsWithIds = (data.items || []).map((item: any, idx: number) => ({
        ...item,
        id: `item_text_${Date.now()}_${idx}`,
        quantity: item.quantity || 1,
        totalPrice: parseFloat(item.totalPrice) || 0,
      }));

      onReceiptParsed({
        items: itemsWithIds,
        subtotal: parseFloat(data.subtotal) || 0,
        serviceChargePercent: parseFloat(data.serviceChargePercent) || 0,
        taxPercent: parseFloat(data.taxPercent) || 0,
        total: parseFloat(data.total) || 0,
      });
      setTextInput("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while parsing the text.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#111113] rounded-2xl border border-zinc-800/80 shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          OCR Receipt Scanner
        </h3>
        <button
          onClick={() => setShowTextPaste(!showTextPaste)}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
        >
          {showTextPaste ? (
            <>
              <Upload className="w-3.5 h-3.5" /> Upload Image
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5" /> Paste Receipt Text
            </>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-zinc-700 rounded-xl bg-zinc-900/40"
          >
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
            <p className="text-sm font-semibold text-zinc-200 animate-pulse text-center">
              Processing with Gemini AI...
            </p>
            <p className="text-xs text-zinc-400 mt-2 text-center max-w-xs leading-relaxed">
              Gemini is performing OCR, reading quantities, itemizing orders, and extracting tax details from your receipt.
            </p>
          </motion.div>
        ) : showTextPaste ? (
          <motion.form
            key="text-paste"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleTextSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Paste receipt details or raw OCR output below
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="TRATTORIA BELLA&#10;1 Burrata Pugliese $28.00&#10;1 Calamari Fritti $24.00&#10;SUBTOTAL $52.00&#10;TOTAL $61.88"
                rows={5}
                className="w-full text-sm font-mono p-3 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-950/60 text-zinc-200 placeholder-zinc-600"
                required
              />
            </div>
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Parse Text with AI
            </button>
          </motion.form>
        ) : (
          <motion.div
            key="drag-drop"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl py-10 px-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
              isDragActive
                ? "border-indigo-500 bg-indigo-950/20"
                : "border-zinc-700 hover:border-indigo-500 hover:bg-zinc-900/30"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*,application/pdf"
              className="hidden"
            />
            <div className="p-3 bg-zinc-800 rounded-full mb-3">
              <Upload className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-zinc-200">
              Drag and drop your receipt image here
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              or click to browse from your device
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
                PNG, JPG, WebP
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
                Auto-Itemization
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mt-4 p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
          <div>
            <span className="font-semibold">Note:</span> {error}
            <p className="mt-1 text-zinc-400">
              You can still input receipt items and split the bill manually, or try pasting the raw receipt text.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
