/**
 * RightPanel Component - AI Assistant for Video Editing
 * 
 * This component implements a chat interface for AI-powered video editing.
 * It uses the OpenSaaS pattern to communicate with the server-side AI operation.
 */
import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useAtom } from 'jotai';
import { 
  PaperAirplaneIcon,
  UserIcon,
  CpuChipIcon,
  EllipsisHorizontalIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { chatMessagesAtom, projectAtom, updateProjectAtom, addChatMessageAtom } from './atoms';
// import { processVideoAIPrompt } from 'wasp/client/operations';
// import { estimateProjectSize } from './utils/projectUtils';

// Define types for AI operations following OpenSaaS pattern


interface RightPanelProps {
  onSendMessage: (message: string) => void;
  onHandleMessage?: (message: string) => Promise<{ message: string; updatedProject?: any }>;
  isReadOnly?: boolean;
  readOnlyMessage?: string;
}

export default function RightPanel({ 
  onSendMessage, 
  onHandleMessage, 
  isReadOnly = false, 
  readOnlyMessage = "Chat is disabled for shared projects" 
}: RightPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [messages] = useAtom(chatMessagesAtom);
  const [isTyping, setIsTyping] = useState(false);
  const [project] = useAtom(projectAtom);
  const [, setUpdateProject] = useAtom(updateProjectAtom);
  const [, setAddChatMessage] = useAtom(addChatMessageAtom);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isQuickActionsEnabled = false; // Toggle for quick actions visibility

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      // Scroll the container to the bottom
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      setIsTyping(true);
      const userMessage = inputMessage.trim();
      
      // Pass the message to the parent component to add the USER message
      // The parent component handles adding the user message to the chat
      onSendMessage(userMessage);
      setInputMessage('');
      
      // Only process with AI if we have a project
      if (project?.id) {
        try {
          setIsProcessing(true);
          setError(null);
          
          // Use onHandleMessage if provided, otherwise use default behavior
          const result = onHandleMessage 
            ? await onHandleMessage(userMessage)
            : {
                message: "AI functionality not available in standalone mode. Please integrate with wasp for AI features.",
                updatedProject: null
              };
          
          // Update the project with AI changes if we got an updated project back
          if (result.updatedProject && project) {
            setUpdateProject({
              ...project,
              ...(result.updatedProject || {}),
              updatedAt: new Date().toISOString()
            });
          }
          
          // Add ONLY the AI response to chat
          // The user message was already added by the parent component
          setAddChatMessage({
            id: Date.now(),
            role: 'assistant',
            content: result.message,
            timestamp: new Date().toISOString() // Store as ISO string for localStorage compatibility
          });
        } catch (error) {
          console.error('Error processing AI prompt:', error);
          setError(
            error instanceof Error 
              ? error.message 
              : 'Failed to process your request. Please try again later.'
          );
          
          // Add ASSISTANT message with error info and retry suggestion
          setAddChatMessage({
            id: Date.now(),
            role: 'assistant',
            content: `❌ **Request Failed**\n\nI encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}\n\n**Please try again** or check your internet connection.`,
            timestamp: new Date().toISOString()
          });
        } finally {
          setIsProcessing(false);
        }
      }
      
      // Set typing to false after a short delay to simulate assistant responding
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

  const formatTime = (date: Date | string) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Make sure it's a valid date before calling toLocaleTimeString
    if (isNaN(dateObj.getTime())) {
      return 'Invalid time';
    }
    
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickActions = [
    '✂️ Cut video at current time',
    '🎵 Add background music',
    '📝 Add text overlay',
    '🎨 Apply color correction',
    '⚡ Generate transitions',
    '🔄 Trim clips automatically'
  ];

  // If in read-only mode, show a simplified read-only interface
  if (isReadOnly) {
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800 overflow-hidden">
        {/* Read-only header */}
        <div className="p-4 border-b border-gray-200 dark:border-strokedark flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <XMarkIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-500 dark:text-gray-400">Read-Only Mode</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Chat disabled for shared projects</p>
            </div>
          </div>
        </div>
        
        {/* Read-only content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <CpuChipIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">AI Chat Disabled</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{readOnlyMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-boxdark overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-strokedark flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CpuChipIcon className="h-6 w-6 text-blue-500" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">AI Assistant</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Online • Ready to help</p>
            </div>
          </div>
          {localStorage.getItem('openai-api-key') && (
            <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Using your API key</span>
            </div>
          )}
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
                message.role === 'user' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                {message.role === 'user' ? (
                  <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <CpuChipIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                )}
              </div>
              <div>
                <div className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 dark:bg-blue-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}>
                  {message.role === 'assistant' ? (
                    <div className="text-sm whitespace-pre-wrap">
                      <Markdown rehypePlugins={[rehypeRaw]}>{message.content}</Markdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <CpuChipIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      { isQuickActionsEnabled && <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Quick Actions</h4>
        <div className="grid grid-cols-1 gap-1">
          {quickActions.slice(0, 3).map((action, index) => (
            <button
              key={index}
              onClick={() => onSendMessage(action)}
              className="text-left text-xs p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              {action}
            </button>
          ))}
        </div>
        <button className="w-full mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center space-x-1">
          <EllipsisHorizontalIcon className="h-3 w-3" />
          <span>More actions</span>
        </button>
      </div> }

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Request Failed</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3">
            <button
              onClick={() => {
                setError(null);
                if (inputMessage.trim()) {
                  handleSendMessage();
                }
              }}
              className="text-sm bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
            >
              Retry Request
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-strokedark flex-shrink-0">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about video editing..."
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            rows={2}
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white p-3 rounded-lg transition-colors"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
