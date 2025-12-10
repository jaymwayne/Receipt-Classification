import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, User } from 'lucide-react';
import { ChatMessage, ReceiptData, Assignments } from '../types';
import { processSplitCommand } from '../services/geminiService';

interface ChatPaneProps {
  receiptData: ReceiptData | null;
  assignments: Assignments;
  onAssignmentsUpdate: (newAssignments: Assignments) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  receiptData,
  assignments,
  onAssignmentsUpdate,
  messages,
  setMessages,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !receiptData || isProcessing) return;

    const userText = inputValue.trim();
    setInputValue('');
    
    // Add user message
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: Date.now().toString(), role: 'user', text: userText }
    ];
    setMessages(newMessages);
    setIsProcessing(true);

    try {
      const { assignments: updatedAssignments, reply } = await processSplitCommand(
        userText,
        receiptData,
        assignments
      );

      onAssignmentsUpdate(updatedAssignments);
      
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'model', text: reply }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'model', text: "Sorry, I had trouble processing that. Can you try again?" }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!receiptData) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white p-8 text-center">
        <Sparkles className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500">Upload a receipt on the left to start chatting!</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-100 bg-white shadow-sm z-10">
        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Split Assistant
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <p className="mb-2">Try saying things like:</p>
            <ul className="text-sm space-y-2">
              <li className="bg-white inline-block px-3 py-1 rounded-full border border-gray-200 shadow-sm">"Tom had the burger"</li>
              <li className="bg-white inline-block px-3 py-1 rounded-full border border-gray-200 shadow-sm">"Split the pizza between Alice and Bob"</li>
              <li className="bg-white inline-block px-3 py-1 rounded-full border border-gray-200 shadow-sm">"Everyone shared the appetizers"</li>
            </ul>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex w-full justify-start">
            <div className="bg-white text-gray-500 border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-sm flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-xs">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a command (e.g., 'Sarah had the salad')..."
            className="w-full pl-4 pr-12 py-3 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm outline-none"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
