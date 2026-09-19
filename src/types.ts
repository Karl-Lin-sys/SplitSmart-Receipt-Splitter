export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignedTo: string[];
}

export interface ReceiptData {
  id: string;
  restaurantName: string;
  date?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  tipPercent?: number;
  total: number;
  currency: string;
  imageUrl?: string;
}

export interface PersonItemShare {
  itemId: string;
  itemName: string;
  itemPrice: number;
  totalSharers: number;
  shareAmount: number;
}

export interface PersonBreakdown {
  name: string;
  color: string;
  itemShares: PersonItemShare[];
  subtotal: number;
  taxShare: number;
  tipShare: number;
  totalOwed: number;
  percentageOfAssigned: number;
}

export interface BillSplitSummary {
  people: PersonBreakdown[];
  totalAssignedSubtotal: number;
  unassignedSubtotal: number;
  unassignedItemsCount: number;
  totalTax: number;
  totalTip: number;
  grandTotal: number;
  isFullyAssigned: boolean;
}

export interface ChatAction {
  type: 'ASSIGN' | 'UNASSIGN' | 'SPLIT_EQUAL' | 'SET_TIP' | 'SET_TAX' | 'ADD_PERSON' | 'REMOVE_PERSON' | 'RESET_ASSIGNMENTS';
  description: string;
  itemIds?: string[];
  itemNames?: string[];
  people?: string[];
  value?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  actionsApplied?: ChatAction[];
  suggestedFollowups?: string[];
}
