import React, { useState } from 'react';

const OrderProcessor = ({ product, onOrderComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Call API to process order
    fetch('http://localhost:5000/api/handle-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderDetails: {
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          quantity,
          shippingAddress,
          paymentMethod
        }
      }),
    })
    .then(response => response.json())
    .then(data => {
      setIsProcessing(false);
      if (data.success) {
        onOrderComplete(data.orderNumber);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      setIsProcessing(false);
    });
  };

  return (
    <div className="order-processor">
      {step === 1 && (
        <div className="order-step">
          <h3>Order: {product?.name}</h3>
          <p>Price: ${product?.price}</p>
          <div className="quantity-selector">
            <label>Quantity:</label>
            <div className="quantity-controls">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >-</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
          </div>
          <div className="total-price">
            <span>Total: ${product?.price * quantity}</span>
          </div>
          <div className="step-buttons">
            <button onClick={onCancel} className="cancel-button">Cancel</button>
            <button onClick={handleNext} className="next-button">Next</button>
          </div>
        </div>
      )}
      
      {step === 2 && (
        <div className="order-step">
          <h3>Shipping Information</h3>
          <textarea
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            placeholder="Enter your shipping address"
            rows={4}
            required
          ></textarea>
          <div className="step-buttons">
            <button onClick={handleBack} className="back-button">Back</button>
            <button onClick={handleNext} className="next-button">Next</button>
          </div>
        </div>
      )}
      
      {step === 3 && (
        <div className="order-step">
          <h3>Payment Method</h3>
          <div className="payment-options">
            <label>
              <input
                type="radio"
                value="credit_card"
                checked={paymentMethod === 'credit_card'}
                onChange={() => setPaymentMethod('credit_card')}
              />
              Credit Card
            </label>
            <label>
              <input
                type="radio"
                value="paypal"
                checked={paymentMethod === 'paypal'}
                onChange={() => setPaymentMethod('paypal')}
              />
              PayPal
            </label>
            <label>
              <input
                type="radio"
                value="bank_transfer"
                checked={paymentMethod === 'bank_transfer'}
                onChange={() => setPaymentMethod('bank_transfer')}
              />
              Bank Transfer
            </label>
          </div>
          <div className="step-buttons">
            <button onClick={handleBack} className="back-button">Back</button>
            <button 
              onClick={handleSubmit} 
              className="submit-button"
              disabled={isProcessing || !shippingAddress.trim()}
            >
              {isProcessing ? 'Processing...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderProcessor; 