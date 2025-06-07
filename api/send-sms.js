import { smsOperations, clientOperations } from '../src/database.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { apiKey, phone, message, senderName, clientId } = req.body;

  if (!apiKey || !phone || !message || !senderName) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Send SMS via Semaphore API
    const response = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apikey: apiKey,
        number: phone,
        message,
        sendername: senderName
      })
    });

    const data = await response.json();
    
    // Determine status based on response
    const status = response.ok && data.status === 'success' ? 'sent' : 'failed';
    
    // Save to SMS history
    smsOperations.add.run(
      clientId || null,
      phone,
      message,
      senderName,
      status,
      JSON.stringify(data)
    );

    res.status(200).json({
      ...data,
      saved: true,
      status
    });
  } catch (error) {
    // Save failed attempt to history
    smsOperations.add.run(
      clientId || null,
      phone,
      message,
      senderName,
      'failed',
      JSON.stringify({ error: error.message })
    );

    res.status(500).json({ 
      error: 'Failed to send SMS', 
      details: error.message,
      saved: true
    });
  }
}