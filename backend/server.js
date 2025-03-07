const express = require('express');
const cors = require('cors');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence, RunnablePassthrough } = require('@langchain/core/runnables');
const { formatDocumentsAsString } = require('@langchain/core/documents');
require('dotenv').config();

if (!process.env.GOOGLE_API_KEY) {
  console.error("ERROR: GOOGLE_API_KEY not found in environment variables");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize LLM with Gemini instead of OpenAI
const llm = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  modelName: "gemini-1.5-pro", // Updated model name
  temperature: 0.2
});

// Set up vector store
let vectorStore;

// Store chat history by session ID
const chatSessions = {};

// Sample order data for testing and development
const orderData = [
  {
    id: '12345',
    customer: 'John Smith',
    items: [
      { id: 'p001', name: 'Modern Sofa', price: 899, quantity: 1 }
    ],
    total: 899,
    status: 'processing',
    orderDate: '2023-04-15',
    deliveryDate: '2023-04-30',
    shippingAddress: '123 Main St, Anytown, USA',
    paymentMethod: 'credit_card'
  },
  {
    id: '12346',
    customer: 'Jane Doe',
    items: [
      { id: 'p002', name: 'Queen Storage Bed', price: 749, quantity: 1 },
      { id: 'p007', name: 'Bedside Table', price: 199, quantity: 2 }
    ],
    total: 1147,
    status: 'shipped',
    orderDate: '2023-04-12',
    deliveryDate: '2023-04-24',
    shippingAddress: '456 Oak Ave, Somewhere, USA',
    paymentMethod: 'paypal'
  },
  {
    id: '12347',
    customer: 'Robert Johnson',
    items: [
      { id: 'p003', name: 'Dining Table Set', price: 1299, quantity: 1 }
    ],
    total: 1299,
    status: 'delivered',
    orderDate: '2023-03-28',
    deliveryDate: '2023-04-10',
    shippingAddress: '789 Pine Rd, Nowhere, USA',
    paymentMethod: 'credit_card'
  }
];

// Function to format documents as string
function formatDocsAsString(docs) {
  return docs.map(doc => doc.pageContent).join('\n\n');
}

// Function to format chat history as string
function formatChatHistoryAsString(chatHistory) {
  if (!chatHistory || chatHistory.length === 0) return '';
  
  return chatHistory.map(msg => {
    const role = msg.sender === 'user' ? 'Human' : 'Assistant';
    return `${role}: ${msg.text}`;
  }).join('\n');
}

// Initialize vector store with furniture data
async function initializeVectorStore() {
  try {
    // Sample furniture data - in production, load from database or files
    const furnitureData = [
      {
        id: "p001",
        name: "Modern Sofa",
        category: "living-room",
        price: 899,
        description: "Elegant modern sofa with high-density foam cushions and durable fabric upholstery.",
        features: ["Stain-resistant fabric", "Solid wood frame", "5-year warranty", "Multiple color options"],
        availability: "In stock",
        dimensions: "84W x 38D x 34H inches",
        related_products: ["p008", "p005"]
      },
      {
        id: "p002",
        name: "Queen Storage Bed",
        category: "bedroom",
        price: 749,
        description: "Queen-sized bed with 4 spacious storage drawers in the base.",
        features: ["Solid wood construction", "Easy-glide drawers", "Fits standard queen mattress", "No box spring needed"],
        availability: "In stock",
        dimensions: "65W x 86D x 45H inches",
        related_products: ["p009", "p010"]
      },
      {
        id: "p003",
        name: "Dining Table Set",
        category: "dining-room",
        price: 1299,
        description: "6-piece dining set including table and chairs made from solid oak.",
        features: ["Solid oak construction", "Scratch-resistant finish", "Seats 6 people", "Easy assembly"],
        availability: "Ships in 1-2 weeks",
        dimensions: "72W x 42D x 30H inches (table)",
        related_products: ["p011", "p012"]
      },
      // Add more product entries as needed
    ];

    // Add sample order data for demonstration
    const orderData = [
      {
        id: "12345",
        user_id: "u12345",
        status: "processing",
        items: [
          { product_id: "p001", name: "Modern Sofa", quantity: 1, price: 899 }
        ],
        total: 899,
        shipping_address: "123 Main St, Anytown, US 12345",
        payment_method: "credit_card",
        order_date: "2023-06-15T10:30:00Z",
        estimated_delivery: "2023-06-30T00:00:00Z"
      },
      {
        id: "12346",
        user_id: "u12346",
        status: "shipped",
        items: [
          { product_id: "p002", name: "Queen Storage Bed", quantity: 1, price: 749 },
          { product_id: "p009", name: "Memory Foam Mattress", quantity: 1, price: 499 }
        ],
        total: 1248,
        shipping_address: "456 Oak Ave, Somewhere, US 54321",
        payment_method: "paypal",
        order_date: "2023-06-10T15:45:00Z",
        estimated_delivery: "2023-06-25T00:00:00Z",
        tracking_number: "TRK9876543210"
      }
      // Add more order entries as needed
    ];

    // Another approach - convert userProfiles to array during initialization
    const userProfilesArray = [
      {
        id: "u12345",
        name: "John Smith",
        email: "john.smith@example.com",
        preferences: {
          room_interests: ["living-room", "office"],
          style_preferences: ["modern", "minimalist"],
          color_preferences: ["neutral", "gray"]
        },
        order_history: ["12345"]
      },
      {
        id: "u12346",
        name: "Emily Johnson",
        email: "emily.j@example.com",
        preferences: {
          room_interests: ["bedroom", "dining-room"],
          style_preferences: ["traditional", "rustic"],
          color_preferences: ["warm", "wood tones"]
        },
        order_history: ["12346"]
      }
    ];

    // Then use this array directly
    const allData = [...furnitureData, ...orderData, ...userProfilesArray];

    // Convert objects to strings before text splitting
    const allDataStrings = allData.map(item => JSON.stringify(item));

    // Split text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    });

    // Process the string versions of the data
    const docs = await textSplitter.createDocuments(allDataStrings);

    // Create vector store with Gemini embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      modelName: "models/embedding-001",
    });
    
    vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
    
    console.log("Vector store initialized successfully");
  } catch (error) {
    console.error("Error initializing vector store:", error);
  }
}

// Set up RAG pipeline with chat history
async function setupRAGChain(sessionId, question) {
  const retriever = vectorStore.asRetriever(4); // Retrieve top 4 chunks
  
  // Get chat history for this session
  const sessionHistory = chatSessions[sessionId] || [];
  const chatHistoryText = formatChatHistoryAsString(sessionHistory.slice(-6)); // Use last 6 messages
  
  // Ensure question is a string
  const safeQuestion = String(question || '');
  
  // Create prompt template that includes chat history
  const prompt = PromptTemplate.fromTemplate(`
    You are a helpful customer service assistant for a furniture store. 
    Answer the question based on the following context and chat history.
    If you don't know the answer, say that you don't know.
    Be friendly, concise, and helpful.

    Previous conversation:
    ${chatHistoryText ? chatHistoryText : "No previous conversation."}
    
    Context: {context}
    
    Question: ${safeQuestion}
    
    Answer:
  `);

  // Modified chain creation to avoid pipe compatibility issues
  const chain = RunnableSequence.from([
    {
      // Use a function instead of pipe for better compatibility
      context: async () => {
        try {
          // Make sure we're passing a string to the retriever
          const docs = await retriever.getRelevantDocuments(safeQuestion);
          return formatDocsAsString(docs);
        } catch (error) {
          console.error("Error retrieving documents:", error);
          return "Unable to retrieve relevant information.";
        }
      },
    },
    prompt,
    llm,
    new StringOutputParser(),
  ]);

  return chain;
}

// Enhanced simplifiedRAG function with product and order knowledge
async function simplifiedRAG(sessionId, question) {
  try {
    // Ensure question is a string
    const safeQuestion = String(question || '');
    
    // Get chat history
    const sessionHistory = chatSessions[sessionId] || [];
    const recentMessages = sessionHistory.slice(-4).map(m => `${m.sender}: ${m.text}`).join('\n');
    
    // Extract potential order number from question
    const orderNumMatch = safeQuestion.match(/order\s*#?\s*(\d{5,6})/i);
    let orderInfo = "";
    
    // If question mentions an order number, add that order's details to the context
    if (orderNumMatch) {
      const orderNum = orderNumMatch[1];
      const order = orderData.find(o => o.id === orderNum);
      
      if (order) {
        orderInfo = `
          Order #${order.id} Details:
          Status: ${order.status}
          Items: ${order.items.map(i => `${i.name} (${i.quantity}) - $${i.price}`).join(', ')}
          Total: $${order.total}
          Order Date: ${new Date(order.order_date).toLocaleDateString()}
          Estimated Delivery: ${new Date(order.estimated_delivery).toLocaleDateString()}
          ${order.tracking_number ? `Tracking Number: ${order.tracking_number}` : ''}
        `;
      } else {
        orderInfo = `I couldn't find an order with number #${orderNum} in our system.`;
      }
    }
    
    // Create an enhanced prompt with more product knowledge and order information
    const prompt = `
      You are a helpful furniture store assistant for Elegant Furnishings.
      
      Our furniture information includes:
      - Modern sofas with high-density foam cushions ($899)
      - Solid oak dining tables with 6 chairs ($1299)
      - Queen storage beds with drawers ($749)
      - Recliner chairs with USB charging ($599)
      - TV stands for up to 65" TVs ($349)
      - Office desks with cable management ($499)
      - Bookshelves with adjustable shelves ($279)
      - Coffee tables with storage ($199)
      
      Our policies:
      - Free delivery for orders over $999
      - Standard delivery takes 3-5 business days
      - Premium delivery with installation is available for $99
      - 30-day return policy with 15% restocking fee
      - 1-year warranty with extended options available
      - Financing available on purchases over $500
      
      ${orderInfo}
      
      Recent conversation:
      ${recentMessages}
      
      Customer: ${safeQuestion}
      
      Assistant:
    `;
    
    // Use LLM directly
    const result = await llm.invoke(prompt);
    return result.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error in simplified RAG:", error);
    return "I apologize, but I'm having technical difficulties. Please try again later or contact support.";
  }
}

// Enhanced predefined bot responses
const botResponses = {
  welcome: {
    text: "Welcome to Elegant Furnishings! How can I help you today?",
    options: [
      { id: 'browse_products', label: 'Browse Products' },
      { id: 'order_management', label: 'Manage My Order' },
      { id: 'faq', label: 'FAQ' },
      { id: 'question', label: 'Ask a Question' }
    ]
  },
  
  // Enhanced browsing options
  browse_products: {
    text: "We have a wide range of furniture for every room. What type of furniture are you looking for?",
    options: [
      { id: 'living_room_products', label: 'Living Room' },
      { id: 'bedroom_products', label: 'Bedroom' },
      { id: 'dining_products', label: 'Dining Room' },
      { id: 'office_products', label: 'Office' }
    ]
  },
  
  // Enhanced living room products
  living_room_products: {
    text: "Our living room collection includes modern sofas starting at $899, coffee tables from $199, and TV stands from $349. Would you like to see any specific item?",
    options: [
      { id: 'sofa_info', label: 'Modern Sofas' },
      { id: 'coffee_table_info', label: 'Coffee Tables' },
      { id: 'tv_stand_info', label: 'TV Stands' },
      { id: 'browse_products', label: 'Back to Categories' }
    ]
  },
  
  // Product details with order options
  sofa_info: {
    text: "Our Modern Sofa ($899) features high-density foam cushions, stain-resistant fabric, and a solid wood frame with a 5-year warranty. It's available in multiple colors and ships within 3-5 business days.",
    options: [
      { id: 'order_sofa', label: 'Order This Sofa' },
      { id: 'living_room_products', label: 'Other Living Room Items' },
      { id: 'ask_sofa_question', label: 'Ask About This Sofa' }
    ]
  },
  
  // Enhanced order management
  order_management: {
    text: "What would you like to do with your order?",
    options: [
      { id: 'check_order_status', label: 'Check Order Status' },
      { id: 'change_delivery_date', label: 'Change Delivery Date' },
      { id: 'cancel_order', label: 'Cancel Order' },
      { id: 'main_menu', label: 'Back to Main Menu' }
    ]
  },
  
  // Order status functionality
  check_order_status: {
    text: "Please enter your order number to check its status. Your order number can be found in your confirmation email.",
    options: [
      { id: 'example_order_status', label: 'Example (Order #12345)' },
      { id: 'main_menu', label: 'Back to Main Menu' }
    ]
  },
  
  // Enhanced design advice
  design_advice: {
    text: "I'd be happy to help with design advice! What type of space are you looking to furnish or update?",
    options: [
      { id: 'small_space_design', label: 'Small Space Solutions' },
      { id: 'color_schemes', label: 'Color Schemes' },
      { id: 'furniture_arrangement', label: 'Furniture Arrangement' },
      { id: 'style_guidance', label: 'Style Guidance' }
    ]
  },
  
  // Additional design advice options
  style_guidance: {
    text: "We offer furniture in several popular styles. Which aesthetic are you interested in?",
    options: [
      { id: 'modern_style', label: 'Modern & Contemporary' },
      { id: 'traditional_style', label: 'Traditional' },
      { id: 'industrial_style', label: 'Industrial' },
      { id: 'scandinavian_style', label: 'Scandinavian' }
    ]
  },
  
  // Add new route for specific style advice
  modern_style: {
    text: "Modern and contemporary furniture features clean lines, neutral colors, and minimalist design. Our Modern Sofa, Glass Coffee Table, and Sleek TV Stand would create a cohesive modern living room. Would you like specific recommendations for your space?",
    options: [
      { id: 'living_room_products', label: 'See Modern Living Room Items' },
      { id: 'design_advice', label: 'Back to Design Advice' },
      { id: 'ask_design_question', label: 'Ask Specific Question' }
    ]
  }
};

// Routes
app.post('/api/bot-response', (req, res) => {
  const { path, sessionId } = req.body;
  
  if (!path) {
    return res.status(400).json({ error: 'Path is required' });
  }
  
  // Get response for the requested path or default to welcome
  const response = botResponses[path] || botResponses.welcome;
  
  // Save bot response to chat history if session ID is provided
  if (sessionId) {
    if (!chatSessions[sessionId]) {
      chatSessions[sessionId] = [];
    }
    
    chatSessions[sessionId].push({
      text: response.text,
      sender: 'bot',
      timestamp: new Date().toISOString(),
      options: response.options || []
    });
    
    // Limit history size per session
    if (chatSessions[sessionId].length > 50) {
      chatSessions[sessionId] = chatSessions[sessionId].slice(-50);
    }
  }
  
  res.json(response);
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!vectorStore) {
      await initializeVectorStore();
    }

    const { message, sessionId, chatHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Initialize session if it doesn't exist
    if (sessionId && !chatSessions[sessionId]) {
      chatSessions[sessionId] = [];
    }
    
    // Update session with message from user
    if (sessionId) {
      chatSessions[sessionId].push({
        text: String(message), // Ensure this is a string
        sender: 'user',
        timestamp: new Date().toISOString()
      });
    }
    
    // If chat history was provided and session doesn't have history, use it
    if (chatHistory && sessionId && chatSessions[sessionId].length <= 1) {
      // Make sure all entries have text as string
      const safeHistory = chatHistory.map(msg => ({
        ...msg,
        text: String(msg.text || '')
      }));
      chatSessions[sessionId] = [...safeHistory, chatSessions[sessionId][chatSessions[sessionId].length - 1]];
    }

    try {
      const chain = await setupRAGChain(sessionId, message);
      const response = await chain.invoke({});

      // Save bot response to chat history
      if (sessionId) {
        chatSessions[sessionId].push({
          text: String(response), // Ensure this is a string
          sender: 'bot',
          timestamp: new Date().toISOString()
        });
        
        // Limit history size
        if (chatSessions[sessionId].length > 50) {
          chatSessions[sessionId] = chatSessions[sessionId].slice(-50);
        }
      }

      res.json({ response });
    } catch (ragError) {
      console.error('Error in primary RAG chain:', ragError);
      // Try the simplified approach
      try {
        const fallbackResponse = await simplifiedRAG(sessionId, message);
        // Save and return the fallback response
        if (sessionId) {
          chatSessions[sessionId].push({
            text: String(fallbackResponse),
            sender: 'bot',
            timestamp: new Date().toISOString()
          });
        }
        res.json({ response: fallbackResponse });
      } catch (fallbackError) {
        // Ultimate fallback
        console.error('Error in fallback RAG:', fallbackError);
        res.json({ 
          response: "I'm experiencing technical difficulties. Please try again later or contact our support team."
        });
      }
    }
  } catch (error) {
    console.error('Error processing chat request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: vectorStore ? 'ready' : 'initializing',
    message: vectorStore ? 'System is ready' : 'System is initializing vector store, please wait...'
  });
});

// Add order handling endpoint
app.post('/api/handle-order', async (req, res) => {
  try {
    const { orderDetails, sessionId } = req.body;
    
    // Generate order number
    const orderNumber = Math.floor(10000 + Math.random() * 90000).toString();
    
    // Create new order (in production, would save to database)
    const newOrder = {
      id: orderNumber,
      user_id: sessionId,
      status: "processing",
      items: [
        { 
          product_id: orderDetails.productId || "custom", 
          name: orderDetails.productName, 
          quantity: orderDetails.quantity, 
          price: orderDetails.productPrice 
        }
      ],
      total: orderDetails.quantity * orderDetails.productPrice,
      shipping_address: orderDetails.shippingAddress,
      payment_method: orderDetails.paymentMethod,
      order_date: new Date().toISOString(),
      estimated_delivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
    };
    
    // In production, add to database
    orderData.push(newOrder);
    
    // Add to chat session
    if (sessionId && chatSessions[sessionId]) {
      chatSessions[sessionId].push({
        text: `Order #${orderNumber} has been successfully placed for ${orderDetails.productName} (Qty: ${orderDetails.quantity}). Total: $${newOrder.total}. Estimated delivery: ${new Date(newOrder.estimated_delivery).toLocaleDateString()}.`,
        sender: 'bot',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true, 
      orderNumber: orderNumber,
      orderDetails: newOrder
    });
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

// Add endpoint to check order status
app.post('/api/check-order', async (req, res) => {
  try {
    const { orderNumber } = req.body;
    
    // Find order
    const order = orderData.find(o => o.id === orderNumber);
    
    if (!order) {
      return res.json({ 
        success: false, 
        message: `Order #${orderNumber} not found in our system.` 
      });
    }
    
    res.json({ 
      success: true, 
      orderDetails: order
    });
  } catch (error) {
    console.error('Error checking order:', error);
    res.status(500).json({ error: 'Failed to check order status' });
  }
});

// Add endpoint to update delivery date
app.post('/api/update-delivery', async (req, res) => {
  try {
    const { orderNumber, newDeliveryDate } = req.body;
    
    // Find order
    const orderIndex = orderData.findIndex(o => o.id === orderNumber);
    
    if (orderIndex === -1) {
      return res.json({ 
        success: false, 
        message: `Order #${orderNumber} not found in our system.` 
      });
    }
    
    // Check if order can be updated (not already shipped)
    if (orderData[orderIndex].status === 'shipped' || orderData[orderIndex].status === 'delivered') {
      return res.json({ 
        success: false, 
        message: `Order #${orderNumber} has already been ${orderData[orderIndex].status} and delivery date cannot be changed.` 
      });
    }
    
    // Update delivery date
    orderData[orderIndex].estimated_delivery = new Date(newDeliveryDate).toISOString();
    
    res.json({ 
      success: true, 
      message: `The delivery date for order #${orderNumber} has been updated to ${new Date(newDeliveryDate).toLocaleDateString()}.`,
      orderDetails: orderData[orderIndex]
    });
  } catch (error) {
    console.error('Error updating delivery date:', error);
    res.status(500).json({ error: 'Failed to update delivery date' });
  }
});

// Add endpoint to cancel order
app.post('/api/cancel-order', async (req, res) => {
  try {
    const { orderNumber } = req.body;
    
    // Find order
    const orderIndex = orderData.findIndex(o => o.id === orderNumber);
    
    if (orderIndex === -1) {
      return res.json({ 
        success: false, 
        message: `Order #${orderNumber} not found in our system.` 
      });
    }
    
    // Check if order can be canceled (not already shipped)
    if (orderData[orderIndex].status === 'shipped' || orderData[orderIndex].status === 'delivered') {
      return res.json({ 
        success: false, 
        message: `Order #${orderNumber} has already been ${orderData[orderIndex].status} and cannot be canceled online. Please contact customer support.` 
      });
    }
    
    // Cancel order
    orderData[orderIndex].status = 'canceled';
    
    res.json({ 
      success: true, 
      message: `Order #${orderNumber} has been successfully canceled. If payment was processed, a refund will be issued within 3-5 business days.`
    });
  } catch (error) {
    console.error('Error canceling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Fallback route
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
initializeVectorStore().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});