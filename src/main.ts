import './style.css'
import { realtime } from '@openai/agents'
const { RealtimeAgent, RealtimeSession } = realtime



const agent = new RealtimeAgent({
  name: 'Melaleuca Product Expert',
  instructions: 'You are a knowledgeable Melaleuca product advisor. Help users find the right Melaleuca products for their wellness needs. Available products include: Vitality Pack (complete nutritional supplement), Sol-U-Mel (natural cleaner), and Renew Lotion (skin therapy). Speak with enthusiasm and warmth, but remain honest about recommendations. Use a friendly, conversational pace.',
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
      
      <div class="voice-settings" style="margin: 1rem 0; display: flex; gap: 1rem; flex-wrap: wrap;">
        <div>
          <label>Voice: </label>
          <select id="voice-select" style="padding: 0.25rem;">
            <option value="nova">Nova (Warm)</option>
            <option value="alloy">Alloy (Neutral)</option>
            <option value="echo">Echo (Clear)</option>
            <option value="fable">Fable (British)</option>
            <option value="onyx">Onyx (Deep)</option>
            <option value="shimmer">Shimmer (Soft)</option>
            <option value="marin">Marin (New)</option>
            <option value="cedar">Cedar (New)</option>
          </select>
        </div>
        <div>
          <label>Enthusiasm: </label>
          <select id="enthusiasm-select" style="padding: 0.25rem;">
            <option value="high">High Energy</option>
            <option value="medium" selected>Balanced</option>
            <option value="low">Calm & Professional</option>
          </select>
        </div>
        <div>
          <label>Pace: </label>
          <select id="pace-select" style="padding: 0.25rem;">
            <option value="fast">Fast</option>
            <option value="normal" selected>Normal</option>
            <option value="slow">Slow & Clear</option>
          </select>
        </div>
      </div>

      <div class="controls">
        <button id="connect-btn" class="btn primary">Connect</button>
        <button id="disconnect-btn" class="btn secondary" disabled>Disconnect</button>
        <button id="interrupt-btn" class="btn secondary" disabled>Interrupt</button>
      </div>
      
      <div class="text-input" style="margin: 1rem 0;">
        <input type="text" id="text-input" placeholder="Type a message..." style="width: 70%; padding: 0.5rem; margin-right: 0.5rem;" disabled>
        <button id="send-btn" class="btn secondary" disabled>Send</button>
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
const textInput = document.querySelector('#text-input') as HTMLInputElement;
const sendBtn = document.querySelector('#send-btn') as HTMLButtonElement;
const voiceSelect = document.querySelector('#voice-select') as HTMLSelectElement;
const enthusiasmSelect = document.querySelector('#enthusiasm-select') as HTMLSelectElement;
const paceSelect = document.querySelector('#pace-select') as HTMLSelectElement;
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
  textInput.disabled = status !== 'connected';
  sendBtn.disabled = status !== 'connected';
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
  console.log('History updated:', history);
  
  // Clear conversation except first message
  const firstMessage = conversation.querySelector('.message.assistant');
  conversation.innerHTML = '';
  if (firstMessage) {
    conversation.appendChild(firstMessage);
  }
  
  // Add all messages from history
  for (const item of history) {
    console.log('Processing history item:', item);
    if (item.type === 'message' && item.role && item.content) {
      // Handle different content structures
      let messageText = '';
      if (Array.isArray(item.content)) {
        messageText = item.content.map((c: any) => c.text || c.transcript || '').join(' ');
      } else if (typeof item.content === 'string') {
        messageText = item.content;
      } else if (item.content.text) {
        messageText = item.content.text;
      }
      
      if (messageText.trim()) {
        addMessage(item.role, messageText);
      }
    }
  }
});

// Voice configuration functions
function getEnthusiasmInstructions(level: string): string {
  const enthusiasmMap = {
    high: 'Speak with high energy and excitement! Use exclamation points in your tone of voice. Be very enthusiastic about Melaleuca products.',
    medium: 'Speak with balanced enthusiasm. Be warm and friendly, showing genuine interest in helping.',
    low: 'Speak in a calm, professional manner. Be helpful and knowledgeable without being overly excited.'
  };
  return enthusiasmMap[level as keyof typeof enthusiasmMap] || enthusiasmMap.medium;
}

function getPaceInstructions(pace: string): string {
  const paceMap = {
    fast: 'Speak quickly and energetically, but remain clear and understandable.',
    normal: 'Speak at a natural, conversational pace.',
    slow: 'Speak slowly and clearly, taking time to explain things thoroughly.'
  };
  return paceMap[pace as keyof typeof paceMap] || paceMap.normal;
}

function updateAgentInstructions() {
  const enthusiasm = enthusiasmSelect.value;
  const pace = paceSelect.value;
  
  const baseInstructions = 'You are a knowledgeable Melaleuca product advisor. Help users find the right Melaleuca products for their wellness needs. Available products include: Vitality Pack (complete nutritional supplement), Sol-U-Mel (natural cleaner), and Renew Lotion (skin therapy).';
  
  const enthusiasmInstr = getEnthusiasmInstructions(enthusiasm);
  const paceInstr = getPaceInstructions(pace);
  
  const fullInstructions = `${baseInstructions} ${enthusiasmInstr} ${paceInstr}`;
  
  // Update agent instructions
  agent.instructions = fullInstructions;
  console.log('Updated agent instructions:', fullInstructions);
}

// Session event debugging
console.log('Session created, waiting for connection events...');

async function connectSession() {
  try {
    updateStatus('connecting');
    
    // Update agent with current voice settings
    updateAgentInstructions();
    
    // Fetch client secret from server (works both locally and on Vercel)
    const baseUrl = window.location.origin;
    const resp = await fetch(`${baseUrl}/api/session`, { method: 'POST' });
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

sendBtn.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (text && isConnected) {
    addMessage('user', text);
    // For now, just display the user message - the RealtimeSession handles voice primarily
    console.log('User text input:', text);
    textInput.value = '';
  }
});

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

// Voice control event listeners
voiceSelect.addEventListener('change', () => {
  if (!isConnected) {
    console.log('Voice changed to:', voiceSelect.value);
  }
});

enthusiasmSelect.addEventListener('change', () => {
  if (isConnected) {
    updateAgentInstructions();
    addMessage('assistant', `📢 Enthusiasm level changed to: ${enthusiasmSelect.value}`);
  }
});

paceSelect.addEventListener('change', () => {
  if (isConnected) {
    updateAgentInstructions();
    addMessage('assistant', `⏱️ Speaking pace changed to: ${paceSelect.value}`);
  }
});

// Initialize
updateStatus('disconnected');
console.log('🟢 Melaleuca Voice Assistant ready - using RealtimeAgent pattern');