import React, { useState, useEffect, useCallback } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

// Placeholder for a real-time connection library (e.g., socket.io-client)
// const socket = io('http://localhost:4000');

function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [userId] = useState('user123'); // Example current user ID

  // --- 📡 Real-time Communication Logic ---
  
  // 1. Initial Load: Fetch past messages (would use an API call)
  useEffect(() => {
    // Simulate fetching initial messages
    setMessages([
      { id: 1, text: "Hey there! How can I help?", senderId: 'bot', timestamp: new Date(Date.now() - 60000) },
      { id: 2, text: "Hi! I have a question about my order.", senderId: 'user123', timestamp: new Date() },
    ]);
    
    // In a real app, this is where you'd connect to the socket:
    // socket.connect();
    // socket.on('receive_message', (message) => {
    //   setMessages(prev => [...prev, message]);
    // });
    
    // return () => socket.disconnect();
  }, []);

  // 2. Send Message Handler
  const handleSendMessage = useCallback((text) => {
    if (text.trim() === '') return;

    const newMessage = {
      id: Date.now(), // Unique ID
      text: text,
      senderId: userId,
      timestamp: new Date(),
    };

    // Update state immediately for optimistic UI update
    setMessages(prev => [...prev, newMessage]);

    // In a real app, this is where you'd send the message to the server:
    // socket.emit('send_message', newMessage);

  }, [userId]);


  // --- 🖥️ Rendering the Chat UI ---
  
  return (
    <div className="chat-container">
      <h2>Chat with Support</h2>
      <div className="messages-area">
        <MessageList messages={messages} currentUserId={userId} />
      </div>
      <div className="input-area">
        <MessageInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}

export default ChatApp;