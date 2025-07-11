import React, { useState, useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import { 
  PaperAirplaneIcon,
  UserIcon,
  CpuChipIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { ChatMessage } from './types';
import { chatMessagesAtom } from '../atoms';

interface RightPanelProps {
  onSendMessage: (message: string) => void;
}

export default function RightPanel({ onSendMessage }: RightPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [messages] = useAtom(chatMessagesAtom);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      // Scroll the container to the bottom
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      setIsTyping(true);
      onSendMessage(inputMessage.trim());
      setInputMessage('');
      
      // Simulate AI typing delay
      setTimeout(() => {
        setIsTyping(false);
        // Make sure to scroll to bottom after typing indicator disappears
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 1500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickActions = [
    '✂️ Cut video at current time',
    '🎵 Add background music',
    '📝 Add text overlay',
    '🎨 Apply color correction',
    '⚡ Generate transitions',
    '🔄 Trim clips automatically'
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <CpuChipIcon className="h-6 w-6 text-blue-500" />
          <div>
            <h3 className="font-semibold text-gray-900">AI Assistant</h3>
            <p className="text-xs text-gray-500">Online • Ready to help</p>
          </div>
        </div>
      </div>

      {/* Messages - fixed height container with scrolling */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                {message.role === 'user' ? (
                  <UserIcon className="h-4 w-4 text-blue-600" />
                ) : (
                  <CpuChipIcon className="h-4 w-4 text-gray-600" />
                )}
              </div>
              <div>
                <div className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex space-x-2 max-w-[80%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <CpuChipIcon className="h-4 w-4 text-gray-600" />
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Quick Actions</h4>
        <div className="grid grid-cols-1 gap-1">
          {quickActions.slice(0, 3).map((action, index) => (
            <button
              key={index}
              onClick={() => onSendMessage(action)}
              className="text-left text-xs p-2 hover:bg-gray-50 rounded text-gray-600 hover:text-gray-900"
            >
              {action}
            </button>
          ))}
        </div>
        <button className="w-full mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center justify-center space-x-1">
          <EllipsisHorizontalIcon className="h-3 w-3" />
          <span>More actions</span>
        </button>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about video editing..."
            className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
