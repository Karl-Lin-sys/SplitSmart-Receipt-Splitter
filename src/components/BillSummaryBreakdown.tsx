import React, { useState } from 'react';
import { BillSplitSummary } from '../types';
import { formatCurrency, getPersonColor } from '../utils/calculations';
import { CheckCircle2, AlertCircle, Copy, Check, Users, Sparkles, Receipt } from 'lucide-react';

interface BillSummaryBreakdownProps {
  summary: BillSplitSummary;
  currency: string;
  allPeople: string[];
  restaurantName: string;
  onSplitRemainingEqually: () => void;
}

export const BillSummaryBreakdown: React.FC<BillSummaryBreakdownProps> = ({
  summary,
  currency,
  allPeople,
  restaurantName,
  onSplitRemainingEqually,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedPerson, setCopiedPerson] = useState<string | null>(null);

  const handleCopyAll = () => {
    let text = `🧾 ${restaurantName} - Bill Split\n`;
    text += `Grand Total: ${formatCurrency(summary.grandTotal, currency)} (Subtotal: ${formatCurrency(summary.totalAssignedSubtotal + summary.unassignedSubtotal, currency)}, Tax: ${formatCurrency(summary.totalTax, currency)}, Tip: ${formatCurrency(summary.totalTip, currency)})\n\n`;

    summary.people.forEach((person) => {
      text += `👤 ${person.name}: ${formatCurrency(person.totalOwed, currency)}\n`;
      text += `   Items ($${person.subtotal.toFixed(2)}): ${person.itemShares.map((s) => `${s.itemName}${s.totalSharers > 1 ? ` (÷${s.totalSharers})` : ''} ($${s.shareAmount.toFixed(2)})`).join(', ') || 'No items'}\n`;
      text += `   Tax: ${formatCurrency(person.taxShare, currency)} | Tip: ${formatCurrency(person.tipShare, currency)}\n\n`;
    });

    if (summary.unassignedSubtotal > 0) {
      text += `⚠️ Unassigned Items: ${formatCurrency(summary.unassignedSubtotal, currency)}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingle = (name: string, total: number, subtotal: number, tax: number, tip: number) => {
    const text = `${name} owes ${formatCurrency(total, currency)} for ${restaurantName} (Items: ${formatCurrency(subtotal, currency)} + Tax: ${formatCurrency(tax, currency)} + Tip: ${formatCurrency(tip, currency)})`;
    navigator.clipboard.writeText(text);
    setCopiedPerson(name);
    setTimeout(() => setCopiedPerson(null), 2000);
  };

  return (
    <div id="bill-summary-breakdown" className="space-y-4">
      {/* Assignment Status Card */}
      <div
        id="assignment-status-banner"
        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
          summary.isFullyAssigned
            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {summary.isFullyAssigned ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider">
              {summary.isFullyAssigned ? 'All Items Assigned' : 'Unassigned Items Remaining'}
            </div>
            <div className="text-xs opacity-80">
              {summary.isFullyAssigned
                ? 'Tax and tip are proportionally distributed across all diners.'
                : `${summary.unassignedItemsCount} item(s) totalling ${formatCurrency(summary.unassignedSubtotal, currency)} not yet claimed.`}
            </div>
          </div>
        </div>

        {!summary.isFullyAssigned && summary.unassignedItemsCount > 0 && (
          <button
            type="button"
            id="btn-split-remaining"
            onClick={onSplitRemainingEqually}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Split Remaining</span>
          </button>
        )}
      </div>

      {/* Header with Share All button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Who Owes What (Proportional Split)
          </h3>
        </div>

        {summary.people.length > 0 && (
          <button
            type="button"
            id="btn-copy-summary"
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Copy breakdown for Venmo or group messaging"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAll ? 'Copied All!' : 'Copy Summary'}</span>
          </button>
        )}
      </div>

      {/* People cards list */}
      {summary.people.length === 0 ? (
        <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs">
          No people added yet. Type a command in the chat like &quot;Dhruv had the nachos&quot; or assign items on the receipt above.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {summary.people.map((person) => {
            const color = getPersonColor(person.name, allPeople);
            return (
              <div
                key={person.name}
                id={`person-card-${person.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shadow-xs ${color.solid}`}
                    >
                      {person.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        {person.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {person.itemShares.length} item{person.itemShares.length === 1 ? '' : 's'} ({person.percentageOfAssigned}% of bill)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(person.totalOwed, currency)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Total with tax &amp; tip
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopySingle(
                          person.name,
                          person.totalOwed,
                          person.subtotal,
                          person.taxShare,
                          person.tipShare
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Copy this person's total"
                    >
                      {copiedPerson === person.name ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Breakdown details */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  {person.itemShares.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {person.itemShares.map((share, idx) => (
                        <span
                          key={`${share.itemId}-${idx}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]"
                        >
                          <span className="truncate max-w-[140px]">{share.itemName}</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(share.shareAmount, currency)}
                          </span>
                          {share.totalSharers > 1 && (
                            <span className="text-[9px] opacity-70">÷{share.totalSharers}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 italic mb-2 text-[11px]">No items assigned yet</div>
                  )}

                  {/* Proportional math equation */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-lg">
                    <span>Items: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(person.subtotal, currency)}</strong></span>
                    <span>+ Tax: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(person.taxShare, currency)}</strong></span>
                    <span>+ Tip: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(person.tipShare, currency)}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
