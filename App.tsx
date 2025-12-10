import React, { useState } from 'react';
import { ReceiptData, Assignments, ChatMessage } from './types';
import { ReceiptPane } from './components/ReceiptPane';
import { ChatPane } from './components/ChatPane';
import { Summary } from './components/Summary';

const App: React.FC = () => {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [assignments, setAssignments] = useState<Assignments>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);

  return (
    <div className="h-screen w-full flex flex-col bg-gray-100">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 shrink-0">
        <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">SplitSmart AI</h1>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col md:flex-row">
          
          {/* Left Pane: Receipt & Visuals */}
          <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-hidden flex flex-col relative z-0">
             <ReceiptPane 
                receiptData={receiptData} 
                setReceiptData={setReceiptData}
                assignments={assignments}
                isLoading={isReceiptLoading}
                setIsLoading={setIsReceiptLoading}
             />
          </div>

          {/* Right Pane: Chat Interface */}
          <div className="w-full md:w-1/2 h-1/2 md:h-full border-t md:border-t-0 md:border-l border-gray-200 flex flex-col bg-white relative z-10">
             <ChatPane 
                receiptData={receiptData}
                assignments={assignments}
                onAssignmentsUpdate={setAssignments}
                messages={messages}
                setMessages={setMessages}
             />
          </div>
        </div>
      </main>

      {/* Persistent Summary Footer (Only visible if receipt loaded) */}
      {receiptData && (
        <div className="z-20">
           <Summary receiptData={receiptData} assignments={assignments} />
        </div>
      )}
    </div>
  );
};

export default App;
