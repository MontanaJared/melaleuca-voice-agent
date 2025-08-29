import './style.css'
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { z } from 'zod';

interface Product {
  name: string;
  description: string;
  category: string;
  price?: string;
  benefits: string[];
  url?: string;
}

const melaleucaProducts: Product[] = [
  {
    name: "Vitality Pack",
    description: "Complete nutritional supplement system",
    category: "Supplements",
    benefits: ["Complete nutrition", "Immune support", "Energy boost"],
    url: "https://melaleuca.com/products/vitality-pack"
  },
  {
    name: "Sol-U-Mel",
    description: "Natural disinfectant and cleaner",
    category: "Cleaning",
    benefits: ["Chemical-free cleaning", "Safe for families", "Multiple uses"],
    url: "https://melaleuca.com/products/sol-u-mel"
  },
  {
    name: "Renew Lotion",
    description: "Intensive skin therapy lotion",
    category: "Personal Care",
    benefits: ["Deep moisturization", "Skin repair", "Natural ingredients"],
    url: "https://melaleuca.com/products/renew-lotion"
  }
];

const productSearchTool = {
  type: 'function' as const,
  name: 'search_melaleuca_products',
  description: 'Search and recommend Melaleuca products based on user needs',
  parameters: z.object({
    query: z.string().describe('Search query for products'),
    category: z.string().optional().describe('Product category filter')
  }),
  handler: ({ query, category }: { query: string; category?: string }) => {
    const filtered = melaleucaProducts.filter(product => {
      const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase()) ||
                          product.description.toLowerCase().includes(query.toLowerCase()) ||
                          product.benefits.some(benefit => benefit.toLowerCase().includes(query.toLowerCase()));
      
      const matchesCategory = !category || product.category.toLowerCase().includes(category.toLowerCase());
      
      return matchesQuery && matchesCategory;
    });

    return {
      products: filtered,
      total: filtered.length
    };
  }
};

class MelaleucaVoiceAgent {
  private agent: RealtimeAgent;
  private session: RealtimeSession | null = null;
  private isConnected = false;

  constructor() {
    this.agent = new RealtimeAgent({
      name: 'Melaleuca Product Advisor',
      instructions: `You are a knowledgeable Melaleuca product advisor. Help users find the right Melaleuca products for their needs.

Key guidelines:
- Listen carefully to what the user is looking for
- Ask clarifying questions about their specific needs, health concerns, or preferences
- Use the search_melaleuca_products tool to find relevant products
- Provide detailed explanations of product benefits
- Be enthusiastic but honest about product recommendations
- If you don't find exact matches, suggest similar alternatives
- Always mention that these are wellness products and not medical treatments

Focus on understanding the user's lifestyle, health goals, and preferences to make personalized recommendations.`,
      tools: [productSearchTool]
    });
  }

  async connect() {
    if (this.isConnected) return;

    try {
      console.log('Fetching ephemeral token...');
      
      const response = await fetch('http://localhost:5000/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to get ephemeral token: ${response.status}`);
      }

      const sessionData = await response.json();
      console.log('Got ephemeral token, creating session...');
      
      this.session = new RealtimeSession(this.agent, {
        model: 'gpt-4o-realtime-preview-2024-10-01',
        transport: 'websocket'
      });
      
      console.log('Connecting with ephemeral token...');
      
      await this.session.connect({
        apiKey: sessionData.client_secret.value
      });

      // Add event listeners for voice activity
      this.session.on('input_audio_buffer.speech_started', () => {
        console.log('🎤 Speech started');
        updateVoiceStatus('speaking');
      });

      this.session.on('input_audio_buffer.speech_stopped', () => {
        console.log('🔇 Speech stopped');
        updateVoiceStatus('processing');
      });

      this.session.on('response.audio.delta', () => {
        console.log('🔊 AI responding');
        updateVoiceStatus('responding');
      });

      this.session.on('response.done', () => {
        console.log('✅ Response complete');
        updateVoiceStatus('listening');
      });
      
      this.isConnected = true;
      console.log('Connected to Melaleuca Voice Agent');
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.session && this.isConnected) {
      await this.session.disconnect();
      this.isConnected = false;
      console.log('Disconnected from voice agent');
    }
  }

  isSessionConnected() {
    return this.isConnected;
  }
}

// Initialize the app
let voiceAgent: MelaleucaVoiceAgent;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="container">
    <header>
      <h1>🌿 Melaleuca Voice Assistant</h1>
      <p>Ask me about Melaleuca products for your wellness needs</p>
    </header>
    
    <main>
      <div class="status" id="status">
        <span class="status-indicator" id="indicator"></span>
        <span id="status-text">Disconnected</span>
      </div>
      
      <div class="voice-status" id="voice-status">
        <div class="voice-indicator" id="voice-indicator"></div>
        <span id="voice-text">Ready to listen</span>
      </div>
      
      <div class="controls">
        <button id="connect-btn" class="btn primary">Connect</button>
        <button id="disconnect-btn" class="btn secondary" disabled>Disconnect</button>
      </div>
      
      <div class="conversation" id="conversation">
        <div class="message assistant">
          <p>👋 Hi! I'm your Melaleuca product advisor. Click Connect to start our voice conversation!</p>
        </div>
      </div>
    </main>
  </div>
`;

// Get DOM elements
const connectBtn = document.querySelector('#connect-btn') as HTMLButtonElement;
const disconnectBtn = document.querySelector('#disconnect-btn') as HTMLButtonElement;
const statusText = document.querySelector('#status-text') as HTMLSpanElement;
const statusIndicator = document.querySelector('#indicator') as HTMLSpanElement;
const voiceText = document.querySelector('#voice-text') as HTMLSpanElement;
const voiceIndicator = document.querySelector('#voice-indicator') as HTMLDivElement;

function updateVoiceStatus(status: 'listening' | 'speaking' | 'processing' | 'responding') {
  const statusMap = {
    listening: { text: '👂 Listening for your voice...', class: 'listening' },
    speaking: { text: '🎤 You are speaking', class: 'speaking' },
    processing: { text: '🤔 Processing your request...', class: 'processing' },
    responding: { text: '🔊 AI is responding', class: 'responding' }
  };

  const config = statusMap[status];
  voiceText.textContent = config.text;
  voiceIndicator.className = `voice-indicator ${config.class}`;
}

function updateStatus(status: 'connected' | 'disconnected' | 'connecting') {
  const statusMap = {
    connected: { text: 'Connected - Speak now!', class: 'connected' },
    disconnected: { text: 'Disconnected', class: 'disconnected' },
    connecting: { text: 'Connecting...', class: 'connecting' }
  };

  const config = statusMap[status];
  statusText.textContent = config.text;
  statusIndicator.className = `status-indicator ${config.class}`;
  
  connectBtn.disabled = status === 'connected' || status === 'connecting';
  disconnectBtn.disabled = status !== 'connected';
}

// Event listeners
connectBtn.addEventListener('click', async () => {
  try {
    updateStatus('connecting');
    voiceAgent = new MelaleucaVoiceAgent();
    await voiceAgent.connect();
    updateStatus('connected');
    updateVoiceStatus('listening');
  } catch (error) {
    console.error('Connection failed:', error);
    updateStatus('disconnected');
    alert('Connection failed. Please check the console for details.');
  }
});

disconnectBtn.addEventListener('click', async () => {
  try {
    if (voiceAgent) {
      await voiceAgent.disconnect();
    }
    updateStatus('disconnected');
  } catch (error) {
    console.error('Disconnection failed:', error);
  }
});

// Initialize with disconnected status
updateStatus('disconnected');