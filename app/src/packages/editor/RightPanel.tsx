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
  XMarkIcon,
  ChevronDownIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { chatMessagesAtom, projectAtom, updateProjectAtom, addChatMessageAtom, chatModeAtom, agentSettingsAtom, type ChatMode } from './atoms';
import { clientAI, StreamingResponse } from './utils/clientAI';
import { parseSlashCommand, executeSlashCommand, matchSlashCommands, type SlashCommandContext } from './utils/clientSlashCommands';
// import { processVideoAIPrompt } from 'wasp/client/operations';
// import { estimateProjectSize } from './utils/projectUtils';

// Define types for AI operations following OpenSaaS pattern


// ChatMode is now imported from atoms

interface RightPanelProps {
  onSendMessage: (message: string, chatMode?: ChatMode) => void;
  onHandleMessage?: (message: string, chatMode?: ChatMode) => Promise<{ message: string; updatedProject?: any }>;
  isReadOnly?: boolean;
  readOnlyMessage?: string;
  // Slash command context functions
  clearAllFiles?: () => Promise<void>;
  setChatMessages?: (messages: any[]) => void;
  setSelectedPage?: (page: any) => void;
  setSelectedElement?: (element: any) => void;
  setIsSharedProject?: (isShared: boolean) => void;
  setShowImportDialog?: (show: boolean) => void;
  setShowExportDialog?: (show: boolean) => void;
  setExportFormat?: (format: 'json' | 'mp4' | 'webm') => void;
  fileStorage?: any;
  setShowShareDialog?: (show: boolean) => void;
  onShare?: (args: { encryptedData: string; projectName: string }) => Promise<{ shareId: string }>;
}

export default function RightPanel({ 
  onSendMessage, 
  onHandleMessage, 
  isReadOnly = false, 
  readOnlyMessage = "Chat is disabled for shared projects",
  clearAllFiles,
  setChatMessages,
  setSelectedPage,
  setSelectedElement,
  setIsSharedProject,
  setShowImportDialog,
  setShowExportDialog,
  setExportFormat,
  fileStorage,
  setShowShareDialog,
  onShare
}: RightPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [messages] = useAtom(chatMessagesAtom);
  const [isTyping, setIsTyping] = useState(false);
  const [project] = useAtom(projectAtom);
  
  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteOptions, setAutocompleteOptions] = useState<Array<{ name: string; description: string; usage: string; score: number }>>([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [, setUpdateProject] = useAtom(updateProjectAtom);
  const [, setAddChatMessage] = useAtom(addChatMessageAtom);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useAtom(chatModeAtom);
  const [agentSettings] = useAtom(agentSettingsAtom);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isQuickActionsEnabled = false; // Toggle for quick actions visibility
  
  // Agent mode specific state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [agentInitialized, setAgentInitialized] = useState(false);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      // Scroll the container to the bottom
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen && !event.target) {
        setIsDropdownOpen(false);
      }
      
      // Close autocomplete when clicking outside
      if (showAutocomplete && event.target instanceof Element) {
        const autocompleteContainer = event.target.closest('.autocomplete-container');
        if (!autocompleteContainer) {
          setShowAutocomplete(false);
          setAutocompleteOptions([]);
          setSelectedOptionIndex(0);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen, showAutocomplete]);

  // Handle input changes and autocomplete
  const handleInputChange = (value: string) => {
    setInputMessage(value);
    
    // Show autocomplete if input starts with '/'
    if (value.startsWith('/') && value.length > 0) {
      const matches = matchSlashCommands(value);
      setAutocompleteOptions(matches);
      setShowAutocomplete(matches.length > 0);
      setSelectedOptionIndex(0);
    } else {
      setShowAutocomplete(false);
      setAutocompleteOptions([]);
      setSelectedOptionIndex(0);
    }
  };

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showAutocomplete && autocompleteOptions.length > 0) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedOptionIndex(prev => 
            prev > 0 ? prev - 1 : autocompleteOptions.length - 1
          );
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedOptionIndex(prev => 
            prev < autocompleteOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'Enter':
          if (selectedOptionIndex >= 0 && selectedOptionIndex < autocompleteOptions.length) {
            e.preventDefault();
            const selectedCommand = autocompleteOptions[selectedOptionIndex];
            setInputMessage(`/${selectedCommand.name} `);
            setShowAutocomplete(false);
            setAutocompleteOptions([]);
            setSelectedOptionIndex(0);
            return;
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowAutocomplete(false);
          setAutocompleteOptions([]);
          setSelectedOptionIndex(0);
          break;
      }
    }
  };

  // Highlight matching characters in command name
  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query || query === '') return text;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // For exact or prefix matches, highlight the matching part
    if (lowerText.startsWith(lowerQuery)) {
      return (
        <>
          <span className="bg-yellow-200 dark:bg-yellow-800 text-gray-900 dark:text-gray-100">
            {text.substring(0, query.length)}
          </span>
          {text.substring(query.length)}
        </>
      );
    }
    
    // For fuzzy matches, highlight individual matching characters
    const result: React.ReactNode[] = [];
    let queryIndex = 0;
    
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        result.push(
          <span key={i} className="bg-yellow-200 dark:bg-yellow-800 text-gray-900 dark:text-gray-100">
            {text[i]}
          </span>
        );
        queryIndex++;
      } else {
        result.push(text[i]);
      }
    }
    
    // Add remaining characters
    for (let i = result.length; i < text.length; i++) {
      result.push(text[i]);
    }
    
    return result;
  };

  // Initialize agent when switching to agent mode
  useEffect(() => {
    if (chatMode === 'agent') {
      const apiKey = localStorage.getItem('openai-api-key');
      if (apiKey) {
        const initialized = clientAI.initialize(apiKey);
        setAgentInitialized(initialized);
        if (!initialized) {
          setError('Failed to initialize Agent mode. Please check your OpenAI API key in Settings.');
        }
      } else {
        setAgentInitialized(false);
        setError('Agent mode requires an OpenAI API key. Please add one in Settings.');
      }
    }
  }, [chatMode]);

  // Handle Agent mode streaming messages
  const handleAgentMessage = async (message: string) => {
    if (!project) return;
    
    setIsStreaming(true);
    setStreamingContent('');
    
    try {
      const context = {
        project,
        updateProject: (updatedProject: any) => {
          setUpdateProject(updatedProject);
          // Also update the local project reference for the context
          context.project = updatedProject;
        },
        addMessage: (msg: string) => {
          setAddChatMessage({
            id: Date.now(),
            role: 'assistant',
            content: msg,
            timestamp: new Date().toISOString()
          });
        },
        setIsStreaming,
        agentSettings
      };

      const stream = clientAI.streamAgentResponse(message, context);
      let finalContent = '';

      for await (const response of stream) {
        finalContent = response.content;
        setStreamingContent(response.content);
        
        // Auto-scroll during streaming
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
        
        if (response.isComplete) {
          // Add final message to chat history
          setAddChatMessage({
            id: Date.now(),
            role: 'assistant',
            content: response.content,
            timestamp: new Date().toISOString()
          });
          break;
        }
      }
    } catch (error) {
      console.error('Agent error:', error);
      setAddChatMessage({
        id: Date.now(),
        role: 'assistant',
        content: `❌ **Agent Error**\n\n${error instanceof Error ? error.message : 'Unknown error occurred during agent processing.'}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      setIsTyping(true);
      const userMessage = inputMessage.trim();
      
      // Check if this is a slash command
      const slashCommand = parseSlashCommand(userMessage);
      
      if (slashCommand.isCommand && slashCommand.commandName) {
        // Handle slash command locally - don't send to parent or AI
        setInputMessage('');
        
        // Focus the textarea after clearing the input
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 0);
        
        try {
          const context: SlashCommandContext = {
            project,
            updateProject: (updatedProject: any) => setUpdateProject(updatedProject),
            addMessage: (content: string) => {
              setAddChatMessage({
                id: Date.now(),
                role: 'assistant',
                content,
                timestamp: new Date().toISOString()
              });
            },
            clearAllFiles,
            setChatMessages,
            setSelectedPage,
            setSelectedElement,
            setIsSharedProject,
            setShowImportDialog,
            setShowExportDialog,
            setExportFormat,
            fileStorage,
            setShowShareDialog,
            onShare
          };
          
          // Add user command to chat
          setAddChatMessage({
            id: Date.now(),
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString()
          });
          
          // Execute the slash command
          const result = await executeSlashCommand(
            slashCommand.commandName, 
            slashCommand.args || [], 
            context
          );
          
          // Add command result to chat (only if there's a message)
          if (result.message.trim()) {
            setAddChatMessage({
              id: Date.now(),
              role: 'assistant',
              content: result.message,
              timestamp: new Date().toISOString()
            });
          }
          
        } catch (error) {
          console.error('Slash command error:', error);
          setAddChatMessage({
            id: Date.now(),
            role: 'assistant',
            content: `❌ **Command Error**\n\nAn error occurred while executing the command: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString()
          });
        } finally {
          setIsTyping(false);
        }
        
        return; // Exit early for slash commands
      }
      
      // Pass the message to the parent component to add the USER message
      // The parent component handles adding the user message to the chat
      onSendMessage(userMessage, chatMode);
      setInputMessage('');
      
      // Focus the textarea after clearing the input
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
      
      // Only process with AI if we have a project
      if (project?.id) {
        try {
          setIsProcessing(true);
          setError(null);
          
          // Handle Agent mode differently
          if (chatMode === 'agent' && agentInitialized) {
            await handleAgentMessage(userMessage);
          } else {
            // Use onHandleMessage if provided, otherwise use default behavior
            const result = onHandleMessage 
              ? await onHandleMessage(userMessage, chatMode)
              : {
                  message: "AI functionality not available in standalone mode. Please integrate with wasp for AI features.",
                  updatedProject: null
                };
            
            // Update the project with AI changes if we got an updated project back
            // Only update project in 'edit' mode, not in 'ask' mode
            if (result.updatedProject && project && chatMode === 'edit') {
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
          }
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
            {chatMode === 'agent' ? (
              <BoltIcon className="h-6 w-6 text-blue-500" />
            ) : (
              <CpuChipIcon className="h-6 w-6 text-blue-500" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {chatMode === 'agent' ? 'AI Agent' : 'AI Assistant'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {chatMode === 'agent' 
                  ? (agentInitialized ? 'Ready with tools' : 'Initializing...') 
                  : 'Online • Ready to help'
                }
              </p>
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
            <div className={`flex space-x-2 max-w-[80%] min-w-0 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                {message.role === 'user' ? (
                  <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <CpuChipIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`p-3 rounded-lg min-w-0 ${
                  message.role === 'user'
                    ? 'bg-blue-600 dark:bg-blue-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}>
                  {message.role === 'assistant' ? (
                    <div className="text-sm whitespace-pre-wrap break-words overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      <Markdown rehypePlugins={[rehypeRaw]}>{message.content}</Markdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{message.content}</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Streaming indicator for Agent mode */}
        {isStreaming && streamingContent && (
          <div className="flex justify-start">
            <div className="flex space-x-2 max-w-[80%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <BoltIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                <div className="text-sm whitespace-pre-wrap">
                  <Markdown rehypePlugins={[rehypeRaw]}>{streamingContent}</Markdown>
                  <div className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !isStreaming && (
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
      <div className="p-4 border-t border-gray-200 dark:border-strokedark flex-shrink-0 relative autocomplete-container">
        {/* Autocomplete dropdown */}
        {showAutocomplete && autocompleteOptions.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
            {autocompleteOptions.map((option, index) => (
              <div
                key={option.name}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                  index === selectedOptionIndex
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => {
                  setInputMessage(`/${option.name} `);
                  setShowAutocomplete(false);
                  setAutocompleteOptions([]);
                  setSelectedOptionIndex(0);
                }}
              >
                <div className="flex flex-col space-y-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    /{highlightMatch(option.name, inputMessage.slice(1))}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                    {option.usage}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {option.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex space-x-2">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyPress={handleKeyPress}
            placeholder={
              chatMode === 'edit' ? "Tell me how to modify your project..." : 
              chatMode === 'ask' ? "Ask me anything about your project..." :
              "I'm an AI agent. Tell me what you want to achieve..."
            }
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            rows={2}
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping || isStreaming}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white p-3 rounded-lg transition-colors"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Press Enter to send, Shift+Enter for new line
          </p>
          
          {/* Chat Mode Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded border border-gray-300 dark:border-gray-600 transition-colors"
            >
              <span>
                {chatMode === 'edit' ? 'Edit' : 
                 chatMode === 'ask' ? 'Ask' : 'Agent'}
              </span>
              <ChevronDownIcon className="h-3 w-3" />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 bottom-full mb-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-10">
                <button
                  onClick={() => {
                    setChatMode('edit');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    chatMode === 'edit' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Edit
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Modify project</div>
                </button>
                <button
                  onClick={() => {
                    setChatMode('ask');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    chatMode === 'ask' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Ask
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Get information</div>
                </button>
                <button
                  onClick={() => {
                    setChatMode('agent');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    chatMode === 'agent' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <BoltIcon className="h-3 w-3" />
                    <span>Agent</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">AI with tools</div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
