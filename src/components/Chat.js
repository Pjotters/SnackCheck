import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, User, HelpCircle } from 'react-feather';
import axios from 'axios';
import { API } from '../config';

const Chat = ({ isAdmin = false }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Laad gesprekken
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API}/chat/conversations`, {
          headers: {
            'Authorization': `Basic ${btoa('testuser:test123')}`
          }
        });
        setConversations(response.data);
        
        // Als er gesprekken zijn, laad het eerste gesprek
        if (response.data.length > 0) {
          setActiveConversation(response.data[0].id);
          setMessages(response.data[0].messages || []);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Fout bij ophalen gesprekken:', err);
        setError('Kon gesprekken niet laden. Probeer het later opnieuw.');
        setLoading(false);
      }
    };

    fetchConversations();
    
    // Poll voor nieuwe berichten (elke 5 seconden)
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Scroll naar onderen bij nieuwe berichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    try {
      const response = await axios.post(
        `${API}/chat/message`,
        {
          conversationId: activeConversation,
          content: newMessage.trim()
        },
        {
          headers: {
            'Authorization': `Basic ${btoa('testuser:test123')}`
          }
        }
      );

      // Voeg het nieuwe bericht toe aan de lijst
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
    } catch (err) {
      console.error('Fout bij versturen bericht:', err);
      setError('Kon bericht niet versturen. Probeer het opnieuw.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <HelpCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] bg-white rounded-lg shadow-md overflow-hidden">
      {/* Gesprekkenlijst (alleen voor admin) */}
      {isAdmin && (
        <div className="w-1/3 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Gesprekken</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 hover:bg-gray-100 cursor-pointer ${
                  activeConversation === conv.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  setActiveConversation(conv.id);
                  setMessages(conv.messages || []);
                }}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      Gebruiker {conv.userId?.substring(0, 6)}...
                    </p>
                    <p className="text-xs text-gray-500">
                      {conv.messages?.length > 0
                        ? conv.messages[conv.messages.length - 1].content.substring(0, 30) + '...'
                        : 'Geen berichten'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chatvenster */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-medium text-gray-900">
            {isAdmin ? `Gesprek met Gebruiker ${activeConversation?.substring(0, 6)}...` : 'Hulp nodig?'}
          </h2>
        </div>
        
        {/* Berichten */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
          <AnimatePresence>
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-4 flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white border border-gray-200 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p>Nog geen berichten. Stel je vraag en we helpen je graag verder!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </AnimatePresence>
        </div>
        
        {/* Bericht invoer */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-end space-x-2">
            <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200">
              <textarea
                rows="1"
                className="w-full px-4 py-2 bg-transparent focus:outline-none resize-none"
                placeholder="Typ je bericht..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className={`p-2 rounded-full ${
                newMessage.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
