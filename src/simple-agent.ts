// Simple working voice agent based on OpenAI examples
export class SimpleVoiceAgent {
  private ws: WebSocket | null = null;
  private isConnected = false;

  async connect() {
    try {
      console.log('Connecting to OpenAI WebSocket...');
      
      const url = `wss://api.openai.com/v1/realtime?model=gpt-realtime`;
      
      this.ws = new WebSocket(url);

      return new Promise((resolve, reject) => {
        this.ws!.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          
          // Send session update with instructions
          this.send({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: 'You are a Melaleuca product advisor. Help recommend products.',
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              turn_detection: {
                type: 'server_vad',
                threshold: 0.2,
                prefix_padding_ms: 300,
                silence_duration_ms: 300
              }
            }
          });
          
          resolve(void 0);
        };

        this.ws!.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        this.ws!.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📥 Received:', data.type, data);
            
            if (data.type === 'input_audio_buffer.speech_started') {
              console.log('🎤 Speech detected!');
              this.onSpeechStart?.();
            } else if (data.type === 'input_audio_buffer.speech_stopped') {
              console.log('🔇 Speech stopped');
              this.onSpeechStop?.();
            } else if (data.type === 'response.audio.delta') {
              console.log('🔊 AI responding');
              this.onAudioResponse?.();
            }
          } catch (e) {
            console.error('Error parsing message:', e);
          }
        };

        this.ws!.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          this.isConnected = false;
        };
      });
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  send(message: any) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendText(text: string) {
    console.log('📤 Sending text:', text);
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    });
    
    // Trigger response
    this.send({ type: 'response.create' });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
    }
  }

  // Event callbacks
  onSpeechStart?: () => void;
  onSpeechStop?: () => void;
  onAudioResponse?: () => void;
}