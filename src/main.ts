import './style.css'
import { realtime } from '@openai/agents'
const { RealtimeAgent, RealtimeSession } = realtime



const agent = new RealtimeAgent({
  name: 'Melaleuca Product Expert',
  instructions: 'You are a knowledgeable Melaleuca product advisor. Help users find the right Melaleuca products for their wellness needs. Available products include: Vitality Pack (complete nutritional supplement), Sol-U-Mel (natural cleaner), and Renew Lotion (skin therapy). Be enthusiastic but honest about recommendations.',
});

const session = new RealtimeSession(agent, {
  model: 'gpt-realtime',
});

let isConnected = false;

// Initialize app
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
        <button id="interrupt-btn" class="btn secondary" disabled>Interrupt</button>
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
const interruptBtn = document.querySelector('#interrupt-btn') as HTMLButtonElement;
const statusText = document.querySelector('#status-text') as HTMLSpanElement;
const statusIndicator = document.querySelector('#indicator') as HTMLSpanElement;
const conversation = document.querySelector('#conversation') as HTMLDivElement;

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
  interruptBtn.disabled = status !== 'connected';
}

function addMessage(role: 'user' | 'assistant', content: string) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  messageDiv.innerHTML = `<p>${content}</p>`;
  conversation.appendChild(messageDiv);
  conversation.scrollTop = conversation.scrollHeight;
}

// Session event handling
session.on('history_updated', (history: any) => {
  // Clear conversation except first message
  const firstMessage = conversation.querySelector('.message.assistant');
  conversation.innerHTML = '';
  if (firstMessage) {
    conversation.appendChild(firstMessage);
  }
  
  // Add all messages from history
  for (const item of history) {
    if (item.type === 'message') {
      addMessage(item.role, item.content?.[0]?.text || '');
    }
  }
});

async function connectSession() {
  try {
    updateStatus('connecting');
    
    // Fetch client secret from server (matching working repo pattern)
    const resp = await fetch('http://localhost:5000/session', { method: 'POST' });
    if (!resp.ok) {
      throw new Error(`Failed to get session: ${resp.status}`);
    }
    
    const data = await resp.json();
    const clientKey = data?.client_secret?.value;
    
    if (!clientKey) {
      throw new Error('No client key received');
    }
    
    console.log('Connecting with client key:', clientKey.substring(0, 10) + '...');
    
    // Connect session with retrieved client key
    await session.connect({ apiKey: clientKey });
    
    isConnected = true;
    updateStatus('connected');
    addMessage('assistant', '🎤 Ready! You can now speak or type your questions about Melaleuca products.');
    
  } catch (error) {
    console.error('Connection failed:', error);
    updateStatus('disconnected');
    alert('Connection failed: ' + (error as Error).message);
  }
}

async function disconnectSession() {
  try {
    // RealtimeSession doesn't have disconnect method, just reset state
    isConnected = false;
    updateStatus('disconnected');
  } catch (error) {
    console.error('Disconnect failed:', error);
  }
}

// Event listeners
connectBtn.addEventListener('click', connectSession);
disconnectBtn.addEventListener('click', disconnectSession);
interruptBtn.addEventListener('click', () => {
  if (isConnected) {
    session.interrupt();
  }
});

// Initialize
updateStatus('disconnected');
console.log('🟢 Melaleuca Voice Assistant ready - using RealtimeAgent pattern');