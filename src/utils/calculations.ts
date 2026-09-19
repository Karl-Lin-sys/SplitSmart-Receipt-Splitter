import { ReceiptData, PersonBreakdown, BillSplitSummary, PersonItemShare } from '../types';

export const PERSON_COLORS = [
  { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', solid: 'bg-emerald-600 text-white' },
  { bg: 'bg-violet-500/15', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-700', solid: 'bg-violet-600 text-white' },
  { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', solid: 'bg-amber-600 text-white' },
  { bg: 'bg-sky-500/15', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-700', solid: 'bg-sky-600 text-white' },
  { bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-700', solid: 'bg-rose-600 text-white' },
  { bg: 'bg-teal-500/15', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-700', solid: 'bg-teal-600 text-white' },
  { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-300 dark:border-fuchsia-700', solid: 'bg-fuchsia-600 text-white' },
  { bg: 'bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700', solid: 'bg-indigo-600 text-white' },
];

export function getPersonColor(personName: string, allPeople: string[]) {
  const index = allPeople.indexOf(personName);
  if (index === -1) {
    let hash = 0;
    for (let i = 0; i < personName.length; i++) {
      hash = personName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % PERSON_COLORS.length;
    return PERSON_COLORS[colorIndex];
  }
  return PERSON_COLORS[index % PERSON_COLORS.length];
}

export function calculateBillSplit(receipt: ReceiptData, allPeople: string[]): BillSplitSummary {
  // Collect all unique people either in allPeople or currently assigned to any item
  const peopleSet = new Set<string>(allPeople);
  receipt.items.forEach(item => {
    item.assignedTo.forEach(p => peopleSet.add(p));
  });
  const activePeople = Array.from(peopleSet);

  const peopleMap: Record<string, {
    shares: PersonItemShare[];
    subtotal: number;
  }> = {};

  activePeople.forEach(p => {
    peopleMap[p] = { shares: [], subtotal: 0 };
  });

  let totalAssignedSubtotal = 0;
  let unassignedSubtotal = 0;
  let unassignedItemsCount = 0;

  receipt.items.forEach(item => {
    const sharers = item.assignedTo;
    if (!sharers || sharers.length === 0) {
      unassignedSubtotal += item.price;
      unassignedItemsCount += 1;
    } else {
      const sharePrice = item.price / sharers.length;
      totalAssignedSubtotal += item.price;
      sharers.forEach(personName => {
        if (!peopleMap[personName]) {
          peopleMap[personName] = { shares: [], subtotal: 0 };
        }
        peopleMap[personName].shares.push({
          itemId: item.id,
          itemName: item.name,
          itemPrice: item.price,
          totalSharers: sharers.length,
          shareAmount: sharePrice,
        });
        peopleMap[personName].subtotal += sharePrice;
      });
    }
  });

  const totalTax = Number(receipt.tax) || 0;
  const totalTip = Number(receipt.tip) || 0;
  const grandTotal = (Number(receipt.subtotal) || 0) + totalTax + totalTip;

  // Distribute tax and tip proportionally based on each person's subtotal share
  // If no items are assigned yet, breakdown is 0
  const breakdowns: PersonBreakdown[] = activePeople.map((personName, idx) => {
    const data = peopleMap[personName] || { shares: [], subtotal: 0 };
    const personSubtotal = data.subtotal;
    
    // Proportional ratio relative to total assigned subtotal
    // (or relative to full bill subtotal if fully assigned)
    const ratio = totalAssignedSubtotal > 0 ? (personSubtotal / totalAssignedSubtotal) : 0;
    
    const taxShare = totalTax * ratio;
    const tipShare = totalTip * ratio;
    const totalOwed = personSubtotal + taxShare + tipShare;
    const percentageOfAssigned = totalAssignedSubtotal > 0 ? (personSubtotal / totalAssignedSubtotal) * 100 : 0;

    return {
      name: personName,
      color: PERSON_COLORS[idx % PERSON_COLORS.length].solid,
      itemShares: data.shares,
      subtotal: roundCent(personSubtotal),
      taxShare: roundCent(taxShare),
      tipShare: roundCent(tipShare),
      totalOwed: roundCent(totalOwed),
      percentageOfAssigned: Math.round(percentageOfAssigned * 10) / 10,
    };
  });

  // Sort people with highest owed first
  breakdowns.sort((a, b) => b.totalOwed - a.totalOwed);

  return {
    people: breakdowns,
    totalAssignedSubtotal: roundCent(totalAssignedSubtotal),
    unassignedSubtotal: roundCent(unassignedSubtotal),
    unassignedItemsCount,
    totalTax: roundCent(totalTax),
    totalTip: roundCent(totalTip),
    grandTotal: roundCent(grandTotal),
    isFullyAssigned: unassignedItemsCount === 0 && receipt.items.length > 0,
  };
}

export function roundCent(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number, currency: string = '$'): string {
  return `${currency}${amount.toFixed(2)}`;
}
