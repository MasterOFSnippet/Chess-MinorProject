/**
 * ChatPanel Component
 * Real-time in-game chat using Socket.IO
 * 
 * Features:
 * - Auto-scroll to latest message
 * - Typing indicators
 * - Message history loading
 * - Clean UI with timestamp formatting
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MessageCircle, Send } from 'lucide-react';
import socketService from '../../services/socketService';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ChatPanel = ({ gameId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [opponentTyping, setOpponentTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // ============================================
  // LOAD CHAT HISTORY
  // ============================================
  useEffect(() => {
    loadChatHistory();
  }, [gameId]);

  const loadChatHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/messages/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.messages || []);
      setLoading(false);
      // Only scroll on initial load, not every time
      if (response.data.messages?.length > 0) {
        setTimeout(scrollToBottom, 300);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setLoading(false);
    }
  };

  // ============================================
  // SOCKET.IO EVENT LISTENERS
  // ============================================
  useEffect(() => {
    // Listen for incoming messages
    socketService.onMessage((newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    });

    // Listen for typing indicator
    socketService.onUserTyping(({ username, isTyping }) => {
      if (username !== currentUser) {
        setOpponentTyping(isTyping);
      }
    });

    // Listen for deleted messages
    socketService.onMessageDeleted(({ messageId }) => {
      setMessages((prev) => prev.filter(msg => msg._id !== messageId));
    });

    // Cleanup
    return () => {
      socketService.removeListener('chat:message');
      socketService.removeListener('chat:user-typing');
      socketService.removeListener('chat:message-deleted');
    };
  }, [currentUser]);

  // ============================================
  // AUTO-SCROLL TO BOTTOM
  // ============================================
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // ============================================
  // SEND MESSAGE
  // ============================================
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage) return;

    // Send via Socket.IO
    socketService.sendMessage(gameId, trimmedMessage);
    
    // Clear input
    setInputMessage('');
    setIsTyping(false);
    socketService.sendTyping(gameId, false);
    
    // Focus input
    inputRef.current?.focus();
  };

  // ============================================
  // TYPING INDICATOR
  // ============================================
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);

    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      socketService.sendTyping(gameId, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.sendTyping(gameId, false);
    }, 2000);
  };

  // ============================================
  // FORMAT TIMESTAMP
  // ============================================
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--color-primary))]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 overflow-hidden p-0">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-[hsl(var(--color-muted-foreground))]">
              No messages yet. Say hello! 👋
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.username === currentUser;
              return (
                <div
                  key={msg._id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      isOwnMessage
                        ? 'bg-[hsl(var(--color-primary)/0.15)] text-[hsl(var(--color-foreground))]'
                        : 'bg-[hsl(var(--color-muted)/0.5)] text-[hsl(var(--color-foreground))]'
                    }`}
                  >
                    {!isOwnMessage && (
                      <div className="text-xs font-semibold mb-1 text-[hsl(var(--color-primary))]">
                        {msg.username}
                      </div>
                    )}
                    <div className="text-sm break-words">{msg.message}</div>
                    <div className="text-xs text-[hsl(var(--color-muted-foreground))] mt-1">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* Typing Indicator */}
          {opponentTyping && (
            <div className="flex justify-start">
              <div className="bg-[hsl(var(--color-muted)/0.5)] rounded-lg px-3 py-2 text-sm text-[hsl(var(--color-muted-foreground))] italic">
                Opponent is typing...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="flex-shrink-0 p-4 border-t border-[hsl(var(--color-border))]">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              maxLength={500}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!inputMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatPanel;