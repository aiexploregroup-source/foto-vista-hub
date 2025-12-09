import React, { useRef, useEffect } from 'react';
import './ChatStyles.css'; // Don't forget to create a CSS file!

function MessageList({ messages, currentUserId }) {
  // Use a ref to scroll to the latest message
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((message) => {
        // Determine if the message was sent by the current user
        const isMe = message.senderId === currentUserId;
        
        return (
          <div 
            key={message.id} 
            className={`message-bubble-wrapper ${isMe ? 'message-right' : 'message-left'}`}
          >
            <div className={`message-bubble ${isMe ? 'my-message' : 'other-message'}`}>
              <p>{message.text}</p>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} /> {/* Spacer for auto-scrolling */}
    </div>
  );
}

export default MessageList;