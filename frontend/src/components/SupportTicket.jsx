import React, { useState } from 'react';
import '../SupportTicketStyles.css';

const SupportTicket = ({ onClose, onTicketSubmitted, sessionId }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [issue, setIssue] = useState('');
  const [category, setCategory] = useState('order');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [ticketId, setTicketId] = useState('');

  // Generate a unique ticket ID
  const generateTicketId = () => {
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TKT-${dateStr}-${randomStr}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Generate a ticket ID
    const newTicketId = generateTicketId();
    
    // Simulate API call to create ticket
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketCreated(true);
      setTicketId(newTicketId);
      
      // In a real app, you would send this data to your backend
      const ticketData = {
        ticketId: newTicketId,
        name,
        email,
        issue,
        category,
        sessionId,
        timestamp: new Date().toISOString(),
        status: 'open',
        chatHistory: JSON.parse(localStorage.getItem('chatMessages') || '[]')
      };
      
      console.log('Ticket created:', ticketData);
    }, 1500);
  };

  if (ticketCreated) {
    return (
      <div className="support-ticket-container">
        <div className="ticket-success">
          <div className="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2>Support Ticket Created</h2>
          <div className="ticket-id">Ticket ID: <span>{ticketId}</span></div>
          <p>Thank you for contacting our support team. We've received your request and will get back to you within 24 hours.</p>
          <p className="email-note">A confirmation has been sent to your email.</p>
          <button className="return-button" onClick={() => onTicketSubmitted(ticketId)}>
            Return to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="support-ticket-container">
      <div className="ticket-header">
        <h2>Create Support Ticket</h2>
        <button className="close-ticket-button" onClick={onClose}>×</button>
      </div>
      
      <form onSubmit={handleSubmit} className="ticket-form">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="category">Issue Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="order">Order Problem</option>
            <option value="product">Product Inquiry</option>
            <option value="delivery">Delivery Issue</option>
            <option value="returns">Returns & Refunds</option>
            <option value="website">Website Technical Issue</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="issue">Describe Your Issue</label>
          <textarea
            id="issue"
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            required
            rows="5"
            disabled={isSubmitting}
          ></textarea>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                Creating Ticket...
              </>
            ) : (
              'Submit Ticket'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupportTicket; 