import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Handle the /v1/realtime/calls endpoint that the OpenAI library calls
app.post('/v1/realtime/calls', async (req, res) => {
  try {
    console.log('Received call to /v1/realtime/calls with body:', req.body);
    
    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const responseText = await response.text();
    console.log('OpenAI response status:', response.status);
    console.log('OpenAI response:', responseText);

    if (!response.ok) {
      console.error('OpenAI API Error:', response.status, responseText);
      return res.status(response.status).json({ error: responseText });
    }

    try {
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (parseError) {
      res.send(responseText);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate ephemeral token endpoint
app.post('/api/token', async (req, res) => {
  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-10-01',
        voice: 'alloy'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    console.log('Session created:', data.id);
    res.json(data);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Endpoints available:');
  console.log('- POST /api/token - Generate ephemeral tokens');
  console.log('- POST /v1/realtime/calls - Proxy for OpenAI realtime calls');
});