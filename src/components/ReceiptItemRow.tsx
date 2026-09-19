import React, { useState } from 'react';
import { ReceiptItem } from '../types';
import { getPersonColor, formatCurrency } from '../utils/calculations';
import { Users, Plus, X, Check } from 'lucide-react';

interface ReceiptItemRowProps {
  item: ReceiptItem;
  currency: string;
  allPeople: string[];
  onTogglePerson: (itemId: string, personName: string) => void;
  onAddPersonAndAssign: (itemId: string, personName: string) => void;
}

export const ReceiptItemRow: React.FC<ReceiptItemRowProps> = ({
  item,
  currency,
  allPeople,
  onTogglePerson,
  onAddPersonAndAssign,
}) => {
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');

  const sharersCount = item.assignedTo.length;
  const pricePerPerson = sharersCount > 0 ? item.price / sharersCount : item.price;
  const isAssigned = sharersCount > 0;

  const handleAddNewPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    onAddPersonAndAssign(item.id, newPersonName.trim());
    setNewPersonName('');
  };

  return (
    <div
      id={`item-row-${item.id}`}
      className={`relative p-3.5 rounded-xl border transition-all duration-200 ${
        isAssigned
          ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60'
          : 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-200/70 dark:border-amber-900/40 hover:border-amber-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-800 dark:text-slate-200 text-sm md:text-base leading-snug">
              {item.name}
            </span>
            {item.quantity > 1 && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                ×{item.quantity}
              </span>
            )}
            {!isAssigned && (
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                Unassigned
              </span>
            )}
          </div>

          {/* Assigned people pills */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {item.assignedTo.map((person) => {
              const color = getPersonColor(person, allPeople);
              return (
                <span
                  key={person}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shadow-xs transition-all ${color.bg} ${color.text} ${color.border}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                  {person}
                  <button
                    type="button"
                    onClick={() => onTogglePerson(item.id, person)}
                    className="hover:opacity-75 focus:outline-none ml-0.5"
                    title={`Remove ${person} from ${item.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {/* Quick assign button */}
            <div className="relative inline-block">
              <button
                type="button"
                id={`assign-btn-${item.id}`}
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 rounded-full border border-dashed border-slate-300 dark:border-slate-600 transition-colors"
                title="Assign person to item"
              >
                <Plus className="w-3 h-3" />
                <span>{item.assignedTo.length === 0 ? 'Assign' : 'Add person'}</span>
              </button>

              {/* Dropdown Menu */}
              {showAssignDropdown && (
                <div
                  id={`assign-dropdown-${item.id}`}
                  className="absolute left-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-30 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Select Person
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-0.5 py-1">
                    {allPeople.map((person) => {
                      const isSelected = item.assignedTo.includes(person);
                      return (
                        <button
                          key={person}
                          type="button"
                          onClick={() => {
                            onTogglePerson(item.id, person);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                          }`}
                        >
                          <span className="truncate">{person}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Add new person directly */}
                  <form onSubmit={handleAddNewPerson} className="mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex gap-1">
                    <input
                      type="text"
                      placeholder="New person name..."
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                    />
                    <button
                      type="submit"
                      disabled={!newPersonName.trim()}
                      className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-md font-medium transition-colors"
                    >
                      Add
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Item Price & Split info */}
        <div className="text-right shrink-0">
          <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm md:text-base">
            {formatCurrency(item.price, currency)}
          </div>
          {sharersCount > 1 && (
            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
              {formatCurrency(pricePerPerson, currency)} ea (÷{sharersCount})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
