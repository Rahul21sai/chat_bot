import React, { useState } from 'react';

const ContactSupport = ({ onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSending(true);
    
    // Simulate sending
    setTimeout(() => {
      setIsSending(false);
      setSubmitted(true);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="support-form">
        <h3>Thank You!</h3>
        <p>Your message has been sent. Our team will contact you within 24 hours.</p>
        <button onClick={onClose} className="support-button">Return to Chat</button>
      </div>
    );
  }

  return (
    <div className="support-form">
      <h3>Contact Customer Support</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input 
            type="text" 
            id="name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
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
          />
        </div>
        <div className="form-group">
          <label htmlFor="message">Message</label>
          <textarea 
            id="message" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            required 
          ></textarea>
        </div>
        <div className="form-buttons">
          <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
          <button type="submit" disabled={isSending} className="submit-button">
            {isSending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactSupport; 