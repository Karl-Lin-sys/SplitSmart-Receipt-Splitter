import React, { useState, useMemo, useCallback } from 'react';
import { SAMPLE_RECEIPTS } from './data/sampleReceipts';
import { ReceiptData, ChatMessage, ChatAction, ReceiptItem } from './types';
import { calculateBillSplit, formatCurrency } from './utils/calculations';
import { ReceiptPane } from './components/ReceiptPane';
import { ChatPane } from './components/ChatPane';
import { ReceiptUploadModal } from './components/ReceiptUploadModal';
import { Receipt, MessageSquare, Sparkles, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData>(SAMPLE_RECEIPTS[0]);
  const [activePeople, setActivePeople] = useState<string[]>(['Dhruv', 'Sarah', 'Sue']);
  const [activeTab, setActiveTab] = useState<'receipt' | 'chat'>('receipt');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Initial welcome message from Gemini assistant
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      content: `👋 Hello! I'm your AI Bill Splitting Assistant.

I've loaded the receipt for **${SAMPLE_RECEIPTS[0].restaurantName}**. Tell me who ordered what in plain English, and I'll automatically calculate exact shares with **tax and tip distributed proportionally**.

Try saying:
• *"Dhruv had the nachos"*
• *"Sarah and Sue shared the pizza"*
• *"Everyone shared the calamari"*`,
      timestamp: Date.now(),
      suggestedFollowups: [
        'Dhruv had the nachos',
        'Sarah and Sue shared the pizza',
        'Everyone shared the calamari',
      ],
    },
  ]);

  // Suggested quick prompts shown above the chat input
  const suggestedPrompts = useMemo(() => {
    return [
      'Dhruv had the nachos',
      'Sarah and Sue shared the pizza',
      'Everyone shared the calamari',
      'Set tip to 20%',
      'Split remaining items equally',
    ];
  }, []);

  // Compute proportional bill split math
  const summary = useMemo(() => {
    return calculateBillSplit(currentReceipt, activePeople);
  }, [currentReceipt, activePeople]);

  // Toggle person assignment on item directly from receipt UI
  const handleTogglePerson = useCallback((itemId: string, personName: string) => {
    setCurrentReceipt((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.assignedTo.includes(personName);
        const newAssigned = exists
          ? item.assignedTo.filter((p) => p !== personName)
          : [...item.assignedTo, personName];
        return { ...item, assignedTo: newAssigned };
      });
      return { ...prev, items: updatedItems };
    });

    setActivePeople((prev) => (prev.includes(personName) ? prev : [...prev, personName]));
  }, []);

  // Add a brand new person and assign to an item
  const handleAddPersonAndAssign = useCallback((itemId: string, personName: string) => {
    const trimmed = personName.trim();
    if (!trimmed) return;

    setActivePeople((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setCurrentReceipt((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id !== itemId) return item;
        if (item.assignedTo.includes(trimmed)) return item;
        return { ...item, assignedTo: [...item.assignedTo, trimmed] };
      });
      return { ...prev, items: updatedItems };
    });
  }, []);

  // Split all remaining unassigned items equally among all people
  const handleSplitRemainingEqually = useCallback(() => {
    if (activePeople.length === 0) return;

    setCurrentReceipt((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.assignedTo.length === 0) {
          return { ...item, assignedTo: [...activePeople] };
        }
        return item;
      });
      return { ...prev, items: updatedItems };
    });

    // Add note in chat
    setChatMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        role: 'model',
        content: `I've split all remaining unassigned items equally among ${activePeople.join(', ')}.`,
        timestamp: Date.now(),
        actionsApplied: [
          {
            type: 'SPLIT_EQUAL',
            description: `Split remaining unassigned items among ${activePeople.join(', ')}`,
          },
        ],
      },
    ]);
  }, [activePeople]);

  // Update tip
  const handleUpdateTip = useCallback((tipAmount: number, tipPercent?: number) => {
    setCurrentReceipt((prev) => ({
      ...prev,
      tip: tipAmount,
      tipPercent: tipPercent ?? (prev.subtotal > 0 ? Math.round((tipAmount / prev.subtotal) * 100) : 0),
      total: Math.round((prev.subtotal + prev.tax + tipAmount) * 100) / 100,
    }));
  }, []);

  // Update tax
  const handleUpdateTax = useCallback((taxAmount: number) => {
    setCurrentReceipt((prev) => ({
      ...prev,
      tax: taxAmount,
      total: Math.round((prev.subtotal + taxAmount + prev.tip) * 100) / 100,
    }));
  }, []);

  // Reset all assignments
  const handleResetAssignments = useCallback(() => {
    setCurrentReceipt((prev) => ({
      ...prev,
      items: prev.items.map((it) => ({ ...it, assignedTo: [] })),
    }));
    setChatMessages((prev) => [
      ...prev,
      {
        id: `reset-${Date.now()}`,
        role: 'model',
        content: 'All item assignments have been cleared.',
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // Select sample receipt
  const handleSelectSample = useCallback((sample: ReceiptData) => {
    setCurrentReceipt(sample);
    setChatMessages([
      {
        id: `sample-loaded-${Date.now()}`,
        role: 'model',
        content: `Loaded **${sample.restaurantName}** receipt ($${sample.total.toFixed(2)}).
Who would you like to assign items to?`,
        timestamp: Date.now(),
        suggestedFollowups: sample.items.slice(0, 3).map((it) => `Dhruv had the ${it.name.split(' ')[0]}`),
      },
    ]);
  }, []);

  // Analyze receipt image with Gemini API
  const handleAnalyzeImage = async (base64: string, mimeType: string) => {
    setIsAnalyzingReceipt(true);
    setUploadError(null);

    try {
      const response = await fetch('/api/receipt/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze receipt image');
      }

      const newReceipt: ReceiptData = await response.json();
      setCurrentReceipt(newReceipt);
      setIsUploadModalOpen(false);

      // Add a message into the chat thread
      setChatMessages((prev) => [
        ...prev,
        {
          id: `scan-${Date.now()}`,
          role: 'model',
          content: `🧾 I've analyzed your receipt for **${newReceipt.restaurantName}**!
Found ${newReceipt.items.length} items totaling ${formatCurrency(newReceipt.total, newReceipt.currency)}.
You can now tell me who had what!`,
          timestamp: Date.now(),
          suggestedFollowups: newReceipt.items.slice(0, 3).map((it) => `Dhruv had the ${it.name.split(' ')[0]}`),
        },
      ]);
    } catch (err: unknown) {
      console.error('Image analysis error:', err);
      const msg = err instanceof Error ? err.message : 'Error analyzing image';
      setUploadError(msg);
    } finally {
      setIsAnalyzingReceipt(false);
    }
  };

  // Execute applied actions from AI response
  const applyChatActions = useCallback((actions: ChatAction[]) => {
    setCurrentReceipt((prevReceipt) => {
      let updatedItems = [...prevReceipt.items];
      let updatedTax = prevReceipt.tax;
      let updatedTip = prevReceipt.tip;
      let updatedTipPercent = prevReceipt.tipPercent;

      actions.forEach((act) => {
        if (act.type === 'ASSIGN' && act.people && act.people.length > 0) {
          // If specific itemIds provided, use them; otherwise match fuzzy names
          const affectedItemIds = act.itemIds || [];
          const affectedNames = (act.itemNames || []).map((n) => n.toLowerCase());

          updatedItems = updatedItems.map((item) => {
            const matchesId = affectedItemIds.includes(item.id);
            const matchesName = affectedNames.some((n) => item.name.toLowerCase().includes(n));

            if (matchesId || matchesName) {
              const combined = Array.from(new Set([...item.assignedTo, ...(act.people || [])]));
              return { ...item, assignedTo: combined };
            }
            return item;
          });
        } else if (act.type === 'UNASSIGN' && act.people) {
          const affectedItemIds = act.itemIds || [];
          const affectedNames = (act.itemNames || []).map((n) => n.toLowerCase());

          updatedItems = updatedItems.map((item) => {
            const matchesId = affectedItemIds.includes(item.id);
            const matchesName = affectedNames.some((n) => item.name.toLowerCase().includes(n));

            if (matchesId || matchesName || (affectedItemIds.length === 0 && affectedNames.length === 0)) {
              return {
                ...item,
                assignedTo: item.assignedTo.filter((p) => !(act.people || []).includes(p)),
              };
            }
            return item;
          });
        } else if (act.type === 'SPLIT_EQUAL') {
          const peopleToSplit = act.people && act.people.length > 0 ? act.people : activePeople;
          updatedItems = updatedItems.map((item) => {
            if (act.itemIds && act.itemIds.length > 0) {
              if (act.itemIds.includes(item.id)) {
                return { ...item, assignedTo: Array.from(new Set([...item.assignedTo, ...peopleToSplit])) };
              }
              return item;
            }
            // If no specific itemIds, split currently unassigned items
            if (item.assignedTo.length === 0) {
              return { ...item, assignedTo: [...peopleToSplit] };
            }
            return item;
          });
        } else if (act.type === 'SET_TIP' && typeof act.value === 'number') {
          if (act.value > 0 && act.value <= 100 && (act.value >= 10 || prevReceipt.subtotal > 50)) {
            // Likely percentage if <= 50 or explicitly marked
            const pct = act.value;
            updatedTip = Math.round(prevReceipt.subtotal * (pct / 100) * 100) / 100;
            updatedTipPercent = pct;
          } else {
            updatedTip = act.value;
            updatedTipPercent = prevReceipt.subtotal > 0 ? Math.round((act.value / prevReceipt.subtotal) * 100) : 0;
          }
        } else if (act.type === 'SET_TAX' && typeof act.value === 'number') {
          updatedTax = act.value;
        } else if (act.type === 'RESET_ASSIGNMENTS') {
          updatedItems = updatedItems.map((it) => ({ ...it, assignedTo: [] }));
        }
      });

      return {
        ...prevReceipt,
        items: updatedItems,
        tax: updatedTax,
        tip: updatedTip,
        tipPercent: updatedTipPercent,
        total: Math.round((prevReceipt.subtotal + updatedTax + updatedTip) * 100) / 100,
      };
    });

    // Update active people list with any new names
    actions.forEach((act) => {
      if (act.people) {
        setActivePeople((prev) => {
          const set = new Set([...prev, ...(act.people || [])]);
          return Array.from(set);
        });
      }
    });
  }, [activePeople]);

  // Fallback natural language rule matcher if network fails
  const localFallbackChatParser = (text: string): { reply: string; actions: ChatAction[] } => {
    const lower = text.toLowerCase();
    const actions: ChatAction[] = [];

    // Check for "split remaining" or "everyone shared"
    if (lower.includes('split remaining') || lower.includes('divide remaining')) {
      actions.push({
        type: 'SPLIT_EQUAL',
        description: `Split remaining unassigned items among ${activePeople.join(', ')}`,
        people: activePeople,
      });
      return {
        reply: `I've split all remaining unassigned items equally among ${activePeople.join(', ')}.`,
        actions,
      };
    }

    // Check tip command
    const tipMatch = lower.match(/(?:tip|add tip)\s+(?:is\s+|to\s+)?(\d+(?:\.\d+)?)\s*(%|\$|percent)?/i);
    if (tipMatch) {
      const val = parseFloat(tipMatch[1]);
      actions.push({
        type: 'SET_TIP',
        description: `Set tip to ${val}%`,
        value: val,
      });
      return {
        reply: `I've updated the tip to ${val}%.`,
        actions,
      };
    }

    // Check item assignments like "Dhruv had the nachos", "Sarah and Sue shared the pizza"
    const items = currentReceipt.items;
    let matchedItem: ReceiptItem | undefined;

    for (const it of items) {
      const words = it.name.toLowerCase().split(/\s+/);
      if (words.some((w) => w.length > 3 && lower.includes(w))) {
        matchedItem = it;
        break;
      }
    }

    // Extract names
    const potentialNames = ['dhruv', 'sarah', 'sue', 'alice', 'bob', 'charlie', 'dave', 'john', 'emma', 'everyone'];
    const foundNames: string[] = [];
    potentialNames.forEach((n) => {
      if (lower.includes(n)) {
        if (n === 'everyone') {
          foundNames.push(...activePeople);
        } else {
          foundNames.push(n.charAt(0).toUpperCase() + n.slice(1));
        }
      }
    });

    if (matchedItem && foundNames.length > 0) {
      const uniqueNames = Array.from(new Set(foundNames));
      actions.push({
        type: 'ASSIGN',
        description: `Assigned ${matchedItem.name} to ${uniqueNames.join(' and ')}`,
        itemIds: [matchedItem.id],
        people: uniqueNames,
      });
      return {
        reply: `Assigned **${matchedItem.name}** (${formatCurrency(matchedItem.price, currentReceipt.currency)}) to ${uniqueNames.join(' and ')}.`,
        actions,
      };
    }

    return {
      reply: `I understood: "${text}". Please specify an item (e.g. nachos, pizza) and who had it, or adjust tip/tax.`,
      actions: [],
    };
  };

  // Handle sending a chat message to Gemini backend
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatMessages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          receipt: currentReceipt,
          people: activePeople,
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error');
      }

      const data = await response.json();
      const reply = data.reply || 'Changes applied.';
      const actions: ChatAction[] = data.actions || [];

      // Apply actions to the bill
      if (actions.length > 0) {
        applyChatActions(actions);
      }

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: reply,
        timestamp: Date.now(),
        actionsApplied: actions,
        suggestedFollowups: data.suggestedFollowups || [],
      };

      setChatMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      console.warn('Backend chat API failed or offline, using local parser:', err);
      const fallback = localFallbackChatParser(text);
      if (fallback.actions.length > 0) {
        applyChatActions(fallback.actions);
      }
      setChatMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          content: fallback.reply,
          timestamp: Date.now(),
          actionsApplied: fallback.actions,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div id="split-smart-app" className="h-screen w-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <button
          type="button"
          id="tab-receipt"
          onClick={() => setActiveTab('receipt')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'receipt'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Receipt &amp; Split ({summary.unassignedItemsCount > 0 ? `${summary.unassignedItemsCount} unassigned` : 'Done'})</span>
        </button>

        <button
          type="button"
          id="tab-chat"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Smart Chat</span>
        </button>
      </div>

      {/* Main Split-Screen Container */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        {/* Left Pane: AI-Parsed Receipt & Real-Time Proportional Summary */}
        <div
          className={`h-full flex-1 md:w-[54%] lg:w-[56%] overflow-hidden ${
            activeTab === 'receipt' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <ReceiptPane
            receipt={currentReceipt}
            summary={summary}
            allPeople={activePeople}
            onTogglePerson={handleTogglePerson}
            onAddPersonAndAssign={handleAddPersonAndAssign}
            onSplitRemainingEqually={handleSplitRemainingEqually}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onUpdateTip={handleUpdateTip}
            onUpdateTax={handleUpdateTax}
            onSelectSample={handleSelectSample}
            onResetAssignments={handleResetAssignments}
          />
        </div>

        {/* Right Pane: Smart Chat Interface */}
        <div
          className={`h-full flex-1 md:w-[46%] lg:w-[44%] overflow-hidden ${
            activeTab === 'chat' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <ChatPane
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            onClearChat={() =>
              setChatMessages([
                {
                  id: `welcome-restart-${Date.now()}`,
                  role: 'model',
                  content: `Chat history cleared. Tell me what someone had (e.g. *"Dhruv had the nachos"* or *"Sarah and Sue shared the pizza"*).`,
                  timestamp: Date.now(),
                },
              ])
            }
            suggestedPrompts={suggestedPrompts}
          />
        </div>
      </div>

      {/* Receipt Photo Upload Modal */}
      <ReceiptUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadError(null);
        }}
        onAnalyzeImage={handleAnalyzeImage}
        onSelectSample={handleSelectSample}
        isAnalyzing={isAnalyzingReceipt}
        error={uploadError}
      />
    </div>
  );
}
