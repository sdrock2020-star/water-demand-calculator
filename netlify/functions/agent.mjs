export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, dashboardState } = JSON.parse(event.body);
    
    const systemPrompt = `You are the REWARD Project Water Budget Assistant. Answer based on: 
    District: ${dashboardState.district}, Micro-watershed: ${dashboardState.msw}, 
    Net Status: ${dashboardState.netStatus} m³.`;

    const geminiPayload = {
      contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\nUser Question: " + message }] }]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
        throw new Error(`Gemini API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };

  } catch (error) {
    console.error("Backend Error:", error);
    return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Failed to process request', details: error.message }) 
    };
  }
}