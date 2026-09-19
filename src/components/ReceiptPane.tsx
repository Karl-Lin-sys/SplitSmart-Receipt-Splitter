import React, { useState } from 'react';
import { ReceiptData, BillSplitSummary } from '../types';
import { ReceiptItemRow } from './ReceiptItemRow';
import { BillSummaryBreakdown } from './BillSummaryBreakdown';
import { formatCurrency } from '../utils/calculations';
import { Receipt, Upload, Plus, Percent, DollarSign, RefreshCw, Sparkles, ChevronDown } from 'lucide-react';
import { SAMPLE_RECEIPTS } from '../data/sampleReceipts';

interface ReceiptPaneProps {
  receipt: ReceiptData;
  summary: BillSplitSummary;
  allPeople: string[];
  onTogglePerson: (itemId: string, personName: string) => void;
  onAddPersonAndAssign: (itemId: string, personName: string) => void;
  onSplitRemainingEqually: () => void;
  onOpenUploadModal: () => void;
  onUpdateTip: (tipAmount: number, tipPercent?: number) => void;
  onUpdateTax: (taxAmount: number) => void;
  onSelectSample: (sample: ReceiptData) => void;
  onResetAssignments: () => void;
}

export const ReceiptPane: React.FC<ReceiptPaneProps> = ({
  receipt,
  summary,
  allPeople,
  onTogglePerson,
  onAddPersonAndAssign,
  onSplitRemainingEqually,
  onOpenUploadModal,
  onUpdateTip,
  onUpdateTax,
  onSelectSample,
  onResetAssignments,
}) => {
  const [isEditingTax, setIsEditingTax] = useState(false);
  const [taxInput, setTaxInput] = useState(receipt.tax.toString());
  const [customTipActive, setCustomTipActive] = useState(false);
  const [customTipInput, setCustomTipInput] = useState(receipt.tip.toString());
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);

  const tipPresets = [15, 18, 20, 25];

  const handleTipPreset = (percent: number) => {
    setCustomTipActive(false);
    const tipVal = Math.round(receipt.subtotal * (percent / 100) * 100) / 100;
    onUpdateTip(tipVal, percent);
  };

  const handleCustomTipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customTipInput);
    if (!isNaN(val) && val >= 0) {
      onUpdateTip(val);
      setCustomTipActive(false);
    }
  };

  const handleTaxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(taxInput);
    if (!isNaN(val) && val >= 0) {
      onUpdateTax(val);
      setIsEditingTax(false);
    }
  };

  return (
    <div id="left-receipt-pane" className="h-full flex flex-col bg-slate-100/70 dark:bg-slate-950/70 overflow-hidden">
      {/* Top Controls Header */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                  {receipt.restaurantName}
                </h1>
                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="w-3 h-3" /> AI-Parsed
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {receipt.date || 'Active Receipt'} · {receipt.items.length} line items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sample Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                id="btn-sample-dropdown"
                onClick={() => setShowSampleDropdown(!showSampleDropdown)}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span>Samples</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showSampleDropdown && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-40">
                  <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Quick Sample Bills
                  </div>
                  {SAMPLE_RECEIPTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSelectSample(s);
                        setShowSampleDropdown(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {s.restaurantName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {s.items.length} items · ${s.total.toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Button */}
            <button
              type="button"
              id="btn-open-upload"
              onClick={onOpenUploadModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Scan Receipt</span>
            </button>

            {/* Reset button */}
            <button
              type="button"
              id="btn-reset-assignments"
              onClick={onResetAssignments}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Reset all item assignments"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Receipt Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {/* Itemized Receipt List Card */}
        <div id="receipt-items-card" className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Itemized Charges ({receipt.items.length})
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Assign in chat or tap &apos;Assign&apos; on items
            </div>
          </div>

          <div className="space-y-2.5">
            {receipt.items.map((item) => (
              <ReceiptItemRow
                key={item.id}
                item={item}
                currency={receipt.currency}
                allPeople={allPeople}
                onTogglePerson={onTogglePerson}
                onAddPersonAndAssign={onAddPersonAndAssign}
              />
            ))}
          </div>

          {/* Subtotal, Tax, Tip, Total Breakdown */}
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-sm">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Items Subtotal</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(receipt.subtotal, receipt.currency)}
              </span>
            </div>

            {/* Tax */}
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>Tax</span>
                {isEditingTax ? (
                  <form onSubmit={handleTaxSubmit} className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      value={taxInput}
                      onChange={(e) => setTaxInput(e.target.value)}
                      className="w-16 px-1.5 py-0.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <button type="submit" className="text-xs text-emerald-600 font-semibold px-1">
                      Save
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTaxInput(receipt.tax.toString());
                      setIsEditingTax(true);
                    }}
                    className="text-[11px] text-slate-400 hover:text-emerald-600 underline"
                  >
                    edit
                  </button>
                )}
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(receipt.tax, receipt.currency)}
              </span>
            </div>

            {/* Tip Presets and Amount */}
            <div className="py-1">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span>Tip</span>
                  {receipt.tipPercent && receipt.tipPercent > 0 && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">
                      {receipt.tipPercent}%
                    </span>
                  )}
                </div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(receipt.tip, receipt.currency)}
                </span>
              </div>

              {/* Tip Preset Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {tipPresets.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleTipPreset(pct)}
                    className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${
                      receipt.tipPercent === pct && !customTipActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}

                {customTipActive ? (
                  <form onSubmit={handleCustomTipSubmit} className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="$ Custom"
                      value={customTipInput}
                      onChange={(e) => setCustomTipInput(e.target.value)}
                      className="w-20 px-1.5 py-0.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <button type="submit" className="text-xs text-emerald-600 font-semibold px-1">
                      OK
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTipInput(receipt.tip.toString());
                      setCustomTipActive(true);
                    }}
                    className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Custom $
                  </button>
                )}
              </div>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800 text-base font-bold text-slate-900 dark:text-slate-100">
              <span>Receipt Total</span>
              <span className="text-lg text-emerald-600 dark:text-emerald-400">
                {formatCurrency(receipt.subtotal + receipt.tax + receipt.tip, receipt.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Per-Person Split Summary */}
        <BillSummaryBreakdown
          summary={summary}
          currency={receipt.currency}
          allPeople={allPeople}
          restaurantName={receipt.restaurantName}
          onSplitRemainingEqually={onSplitRemainingEqually}
        />
      </div>
    </div>
  );
};
