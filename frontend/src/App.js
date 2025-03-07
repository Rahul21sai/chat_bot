import React, { useState, useEffect } from 'react';
import './App.css';
import Chatbot from './components/Chatbot';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [products, setProducts] = useState([
    {
      id: 'p001',
      name: 'Modern Sofa',
      price: 899,
      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
      category: 'living-room',
      description: "Elegant modern sofa with high-density foam cushions and durable fabric upholstery.",
      features: ["Stain-resistant fabric", "Solid wood frame", "5-year warranty", "Multiple color options"],
      availability: "In stock",
      dimensions: "84W x 38D x 34H inches"
    },
    {
      id: 'p002',
      name: 'Queen Storage Bed',
      price: 749,
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80', 
      category: 'bedroom',
      description: "Queen-sized bed with 4 spacious storage drawers in the base.",
      features: ["Solid wood construction", "Easy-glide drawers", "Fits standard queen mattress", "No box spring needed"],
      availability: "In stock",
      dimensions: "65W x 86D x 45H inches"
    },
    {
      id: 'p003',
      name: 'Dining Table Set',
      price: 1299,
      image: 'https://images.unsplash.com/photo-1617098900591-3f90928e8c54?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
      category: 'dining-room',
      description: "6-piece dining set including table and chairs made from solid oak.",
      features: ["Solid oak construction", "Scratch-resistant finish", "Seats 6 people", "Easy assembly"],
      availability: "Ships in 1-2 weeks",
      dimensions: "72W x 42D x 30H inches (table)"
    },
    {
      id: 'p004',
      name: 'Executive Office Desk',
      price: 499,
      image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
      category: 'office',
      description: "Spacious office desk with cable management and drawer storage.",
      features: ["Built-in cable organizers", "Steel frame", "Multiple drawers", "Assembly included"],
      availability: "In stock",
      dimensions: "60W x 30D x 29H inches"
    },
    {
      id: 'p005',
      name: 'Accent Chair',
      price: 349,
      image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1172&q=80',
      category: 'living-room',
      description: "Stylish accent chair with comfortable cushioning and sturdy construction.",
      features: ["Premium fabric", "Ergonomic design", "Solid wood legs", "No assembly required"],
      availability: "In stock",
      dimensions: "30W x 32D x 33H inches"
    },
    {
      id: 'p006',
      name: 'Storage Cabinet',
      price: 599,
      image: 'https://images.unsplash.com/photo-1532372576444-dda954194ad0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1272&q=80',
      category: 'storage',
      description: "Versatile storage cabinet with adjustable shelves and stylish design.",
      features: ["Adjustable shelves", "Magnetic door catches", "Solid construction", "Easy assembly"],
      availability: "In stock",
      dimensions: "36W x 18D x 72H inches"
    }
  ]);

  return (
    <div className="furniture-site">
      {/* Header */}
      <header className="site-header">
        <div className="header-container">
          <div className="logo">Elegant Furnishings</div>
          
          <div className="search-box">
            <input type="text" placeholder="Search furniture..." />
            <button className="search-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </div>
          
          <div className="main-nav">
            <a href="#" className="active">Home</a>
            <a href="#">Shop</a>
            <a href="#">About</a>
            <a href="#">Contact</a>
          </div>
          
          <div className="cart-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span className="cart-count">2</span>
        </div>
        </div>
      </header>
      
      {/* Enhanced Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Transform Your Space</h1>
          <p>Quality furniture for every room in your home</p>
          <button className="shop-button">Shop Collection</button>
        </div>
      </section>
      
      {/* Products with Categories Layout */}
      <div className="products-container">
        {/* Categories Sidebar */}
        <div className="categories">
          <h2>Categories</h2>
          <div className="category-list">
            <div className="category-item">All Products</div>
            <div className="category-item">Living Room</div>
            <div className="category-item">Bedroom</div>
            <div className="category-item">Dining Room</div>
            <div className="category-item">Office</div>
            <div className="category-item">Storage</div>
          </div>
          
          <div className="summer-sale">
            <h3>Summer Sale</h3>
            <p>Up to 40% off select items</p>
            <button className="view-deals-button">View Deals</button>
              </div>
                </div>
        
        {/* Main Content - Product Display */}
        <div className="main-content">
          <section className="products">
            <h2>All Products</h2>
            <div className="product-grid">
              {products.map(product => (
                <div className="product-card" key={product.id}>
                  <div className="product-image">
                    <img src={product.image} alt={product.name} />
                  </div>
                  <h3>{product.name}</h3>
                  <p className="price">${product.price}</p>
                  <button className="view-details">View Details</button>
            </div>
          ))}
            </div>
          </section>
        </div>
        </div>
        
      {/* Only show chatbot button when chat is closed */}
      {!isChatOpen && (
        <button className="chat-widget-button" onClick={() => setIsChatOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
            </button>
      )}
      
      {/* ENLARGED Chatbot Widget with no close button */}
      {isChatOpen && (
        <div className="chat-widget-container">
          <div className="chat-widget-header">
            <span>Furniture Assistant</span>
          </div>
          <Chatbot />
        </div>
      )}
    </div>
  );
}

export default App;