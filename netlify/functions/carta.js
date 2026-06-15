exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { prompt, nombre, email, sorteo } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    const carta = data?.content?.[0]?.text || '';

    // Enviar a n8n para disparar el email — CON await, sino la función se apaga antes de que salga
    if (carta && email) {
      try {
        const n8nRes = await fetch('https://diostehabla.app.n8n.cloud/webhook/carta-diostehabla', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ carta, nombre, email, sorteo })
        });
        console.log('n8n webhook status:', n8nRes.status);
      } catch (err) {
        console.log('n8n webhook error:', err.message);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ carta })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
