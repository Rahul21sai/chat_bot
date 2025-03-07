import React, { useState, useRef, useEffect } from 'react';
import { BotIcon, UserIcon } from '../Icons';
import '../ChatbotStyles.css';
import SupportTicket from './SupportTicket';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [showSupportForm, setShowSupportForm] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate a unique session ID if one doesn't exist
  useEffect(() => {
    const existingSessionId = localStorage.getItem('chatSessionId');
    if (existingSessionId) {
      setSessionId(existingSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
    }
  }, []);

  // Initial welcome message
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      // Set initial welcome message
      setMessages([{
        text: "Welcome to Elegant Furnishings! How can I help you today?",
        sender: 'bot',
        timestamp: new Date().toISOString(),
        options: [
          { id: 'browse_products', label: 'Browse Products' },
          { id: 'order_management', label: 'Manage My Order' },
          { id: 'faq', label: 'FAQ' },
          { id: 'ask_question', label: 'Ask a Question' }
        ]
      }]);
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Check if the message contains an order number for checking status
    const orderNumberMatch = input.match(/order\s*#?\s*(\d{5,6})/i);
    if (orderNumberMatch && messages.some(msg => msg.text.includes("Please enter your order number"))) {
      await handleCheckOrderStatus(orderNumberMatch[1]);
      return;
    }

    // Check if the message contains a date for updating delivery
    if (messages.some(msg => msg.text.includes("enter a new delivery date"))) {
      await handleUpdateDelivery(input, orderNumber);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          sessionId,
          chatHistory: messages
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        text: data.response,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        options: [
          { id: 'product_info', label: 'Product Information' },
          { id: 'design_advice', label: 'Design Advice' },
          { id: 'order_help', label: 'Help with an Order' }
        ]
      }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {
        text: "I apologize, but I'm having trouble connecting to the server. Please try again.",
        sender: 'bot',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const addUserMessage = (text) => {
    return {
      text,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
  };

  // Handle checking order status
  const handleCheckOrderStatus = async (orderNum) => {
    const orderToCheck = orderNum || orderNumber;
    setIsLoading(true);

    try {
      // Call the check-order endpoint
      const response = await fetch('http://localhost:5000/api/check-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber: orderToCheck
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const order = data.orderDetails;
        const formattedDate = new Date(order.estimated_delivery).toLocaleDateString();
        
        setOrderNumber(order.id); // Save the order number for future use
        
        // Add bot response with order details
        setMessages(prev => [...prev, {
          text: `Order #${order.id} Details:\n\nStatus: ${order.status}\nItems: ${order.items.map(item => `${item.name} (${item.quantity}) - $${item.price}`).join(', ')}\nTotal: $${order.total}\nOrder Date: ${new Date(order.order_date).toLocaleDateString()}\nEstimated Delivery: ${formattedDate}\n${order.tracking_number ? `Tracking Number: ${order.tracking_number}` : ''}`,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          options: [
            { id: 'change_delivery_date', label: 'Change Delivery Date' },
            { id: 'cancel_order', label: 'Cancel Order' },
            { id: 'back_to_main_menu', label: 'Back to Main Menu' }
          ]
        }]);
      } else {
        // Order not found
        setMessages(prev => [...prev, {
          text: data.message || "Sorry, I couldn't find that order in our system.",
          sender: 'bot',
          timestamp: new Date().toISOString(),
          options: [
            { id: 'check_order_status', label: 'Try Another Order Number' },
            { id: 'back_to_main_menu', label: 'Back to Main Menu' }
          ]
        }]);
      }
    } catch (error) {
      console.error("Error checking order:", error);
      setMessages(prev => [...prev, {
        text: "I apologize, but I'm having trouble checking your order. Please try again later.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
        options: [
          { id: 'back_to_main_menu', label: 'Back to Main Menu' }
        ]
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle updating delivery date
  const handleUpdateDelivery = async (dateInput, orderNum) => {
    setIsLoading(true);
    let parsedDate;
    
    // Try to parse the date from user input
    try {
      parsedDate = new Date(dateInput);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        text: "Sorry, I couldn't understand that date format. Please enter a date in MM/DD/YYYY format.",
        sender: 'bot',
        timestamp: new Date().toISOString()
      }]);
      setIsLoading(false);
      return;
    }
    
    try {
      // Call the update-delivery endpoint
      const response = await fetch('http://localhost:5000/api/update-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber: orderNum,
          newDeliveryDate: parsedDate.toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Add bot response with updated delivery info
      setMessages(prev => [...prev, {
        text: data.message || "The delivery date has been updated successfully.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
        options: [
          { id: 'check_order_status', label: 'View Updated Order' },
          { id: 'back_to_main_menu', label: 'Back to Main Menu' }
        ]
      }]);
    } catch (error) {
      console.error("Error updating delivery:", error);
      setMessages(prev => [...prev, {
        text: "I apologize, but I'm having trouble updating your delivery date. Please try again later.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
        options: [
          { id: 'back_to_main_menu', label: 'Back to Main Menu' }
        ]
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle canceling an order
  const handleCancelOrder = async (orderNum) => {
    setIsLoading(true);
    
    try {
      // Call the cancel-order endpoint
      const response = await fetch('http://localhost:5000/api/cancel-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber: orderNum
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Add bot response with cancellation result
      setMessages(prev => [...prev, {
        text: data.message || "Your order has been canceled.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
        options: [
          { id: 'browse_products', label: 'Browse Products' },
          { id: 'back_to_main_menu', label: 'Back to Main Menu' }
        ]
      }]);
    } catch (error) {
      console.error("Error canceling order:", error);
      setMessages(prev => [...prev, {
        text: "I apologize, but I'm having trouble canceling your order. Please try again later or contact customer support.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
        options: [
          { id: 'back_to_main_menu', label: 'Back to Main Menu' }
        ]
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle creating a new order
  const handleCreateOrder = async (productDetails) => {
    setIsLoading(true);
    
    try {
      // Call the handle-order endpoint
      const response = await fetch('http://localhost:5000/api/handle-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderDetails: {
            productId: productDetails.id || "custom",
            productName: productDetails.name,
            quantity: productDetails.quantity || 1,
            productPrice: productDetails.price,
            shippingAddress: productDetails.address,
            paymentMethod: productDetails.paymentMethod
          },
          sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const orderDetails = data.orderDetails;
        
        // Add bot response with order confirmation
        setMessages(prev => [...prev, {
          text: `Your order has been successfully placed!\n\nOrder #${data.orderNumber}\nProduct: ${orderDetails.items[0].name}\nQuantity: ${orderDetails.items[0].quantity}\nTotal: $${orderDetails.total}\n\nEstimated delivery: ${new Date(orderDetails.estimated_delivery).toLocaleDateString()}\n\nThank you for shopping with Elegant Furnishings!`,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          options: [
            { id: 'check_order_status', label: 'View Order Details' },
            { id: 'browse_products', label: 'Continue Shopping' },
            { id: 'back_to_main_menu', label: 'Back to Main Menu' }
          ]
        }]);
      } else {
        throw new Error("Order creation failed");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      setMessages(prev => [...prev, {
        text: "I apologize, but I'm having trouble processing your order. Please try again later.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
        options: [
          { id: 'back_to_main_menu', label: 'Back to Main Menu' }
        ]
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Adding support ticket handling
  const handleSupportTicketSubmitted = (ticketId) => {
    setShowSupportForm(false);
    setMessages(prev => [...prev, {
      text: `Your support ticket (ID: ${ticketId}) has been created successfully. Our team will get back to you within 24 hours. Is there anything else I can help you with?`,
      sender: 'bot',
      timestamp: new Date().toISOString(),
      options: [
        { id: 'browse_products', label: 'Browse Products' },
        { id: 'order_management', label: 'Manage My Order' },
        { id: 'faq', label: 'FAQ' },
        { id: 'back_to_main_menu', label: 'Back to Main Menu' }
      ]
    }]);
  };

  const handleOptionClick = async (optionId) => {
    setIsLoading(true);
    
    // Map option IDs to user-friendly text to be shown in chat
    const optionLabels = {
      'browse_products': "Browse Products",
      'order_management': "Manage My Order",
      'faq': "FAQ",
      'ask_question': "Ask a Question",
      'check_order_status': "Check Order Status",
      'change_delivery_date': "Change Delivery Date",
      'cancel_order': "Cancel Order",
      'back_to_main_menu': "Back to Main Menu",
      'product_info': "I'd like to know more about your products",
      'design_advice': "I need design advice",
      'order_help': "I need help with my order",
      'create_ticket': "Create Support Ticket"
    };

    // Handle create support ticket option
    if (optionId === 'create_ticket') {
      const userMessage = addUserMessage(optionLabels[optionId] || optionId);
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(false);
      setShowSupportForm(true);
      return;
    }

    // Rest of the existing code...
    try {
      // Add user message showing the selected option
      const userMessage = addUserMessage(optionLabels[optionId] || optionId);
      setMessages(prev => [...prev, userMessage]);

      // Handle order management options
      if (optionId === 'order_management') {
        setMessages(prev => [...prev, {
          text: "What would you like to do with your order?",
          sender: 'bot',
          timestamp: new Date().toISOString(),
          options: [
            { id: 'check_order_status', label: 'Check Order Status' },
            { id: 'change_delivery_date', label: 'Change Delivery Date' },
            { id: 'cancel_order', label: 'Cancel Order' },
            { id: 'back_to_main_menu', label: 'Back to Main Menu' }
          ]
        }]);
        setIsLoading(false);
        return;
      }
      
      // Rest of your existing option handling code...

    } catch (error) {
      console.error("Error processing option:", error);
      setMessages(prev => [...prev, {
        text: "I apologize, but I'm having trouble responding right now. Please try again.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
        options: [
          { id: 'back_to_main_menu', label: 'Back to Main Menu' }
        ]
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClear = () => {
    // Show a fresh welcome message
    setMessages([{
      text: "Welcome to Elegant Furnishings! How can I help you today?",
      sender: 'bot',
      timestamp: new Date().toISOString(),
      options: [
        { id: 'browse_products', label: 'Browse Products' },
        { id: 'order_management', label: 'Manage My Order' },
        { id: 'faq', label: 'FAQ' },
        { id: 'ask_question', label: 'Ask a Question' }
      ]
    }]);
    
    // Clear localStorage
    localStorage.removeItem('chatMessages');
    
    // Reset all state
    setOrderNumber('');
    setNewDeliveryDate('');
    setShowSupportForm(false);
  };

  const handleMenu = () => {
    setMessages(prev => [...prev, {
      text: "Main Menu",
      sender: 'bot',
      timestamp: new Date().toISOString(),
      options: [
        { id: 'browse_products', label: 'Browse Products' },
        { id: 'order_management', label: 'Manage My Order' },
        { id: 'faq', label: 'FAQ' },
        { id: 'ask_question', label: 'Ask a Question' }
      ]
    }]);
  };

  const handleSupport = () => {
    setMessages(prev => [...prev, {
      text: "Would you like to open a support ticket? Our team will get back to you within 24 hours.",
      sender: 'bot',
      timestamp: new Date().toISOString(),
      options: [
        { id: 'create_ticket', label: 'Create Support Ticket' },
        { id: 'continue_chat', label: 'Continue Chatting' }
      ]
    }]);
  };

  return (
    <div className="chatbot-container">
      {showSupportForm ? (
        <SupportTicket 
          onClose={() => setShowSupportForm(false)} 
          onTicketSubmitted={handleSupportTicketSubmitted}
          sessionId={sessionId}
        />
      ) : (
        <>
          <div className="messages-wrapper">
            <div className="messages">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.sender === 'bot' ? 'bot-message' : 'user-message'}`}>
                  <div className={`message-avatar ${message.sender === 'bot' ? 'bot-avatar' : 'user-avatar'}`}>
                    {message.sender === 'bot' ? <BotIcon /> : <UserIcon />}
                  </div>
                  <div className="message-content">
                    <div className="message-bubble">
                      <div className="message-text">{message.text}</div>
                      <div className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {message.options && (
                      <div className="message-options">
                        {message.options.map(option => (
                          <button 
                            key={option.id}
                            className="option-button"
                            onClick={() => handleOptionClick(option.id)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="message bot-message">
                  <div className="message-avatar bot-avatar">
                    <BotIcon />
                  </div>
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          <div className="input-area">
            <form onSubmit={handleSendMessage} className="input-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !input.trim()} className="send-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
            
            <div className="chatbot-controls">
              <button className="control-button" onClick={handleMenu}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="12" x2="20" y2="12"></line>
                  <line x1="4" y1="6" x2="20" y2="6"></line>
                  <line x1="4" y1="18" x2="20" y2="18"></line>
                </svg>
                Menu
              </button>
              
              <button className="control-button" onClick={handleClear}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Clear
              </button>
              
              <button className="control-button" onClick={handleSupport}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Support
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Chatbot;

