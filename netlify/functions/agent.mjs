export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, dashboardState } = JSON.parse(event.body);
    
    // Updated system prompt for better clarity and structure
    const systemPrompt = `You are the REWARD Project Water Budget Assistant. 
    You are helping officials analyze watershed data in Odisha.

    YOUR GUIDELINES:
    1. Tone: Professional, helpful, and easy to understand. Avoid technical jargon.
    2. Clarity: Use short sentences. Break down complex water budget concepts into simple, actionable insights.
    3. Formatting: Use bullet points for lists and bold text for key metrics or recommendations.
    4. Structure: Start with a direct answer. If suggesting interventions, explain why they help in simple terms.
    5. Context: Use the dashboard data below to explain the current situation.
    
    CURRENT DASHBOARD STATE:
    - District: ${dashboardState.district}
    - Cluster: ${dashboardState.cluster}
    - Micro-watershed: ${dashboardState.msw}
    - Total Supply: ${dashboardState.totalSupply} m³
    - Total Demand: ${dashboardState.totalDemand} m³
    - Net Status: ${dashboardState.netStatus} m³
    - Irrigation Requirement: ${dashboardState.irrigationReq} m³
    - Human Demand: ${dashboardState.humanDemand} m³`;

    const geminiPayload = {
      contents: [{
        role: "user",
        parts: [{ text: systemPrompt + "\n\nUser Question: " + message }]
      }]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    // Timeout logic to prevent 504 Gateway Timeouts
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000); 

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
      signal: controller.signal 
    });

    clearTimeout(timeout); 

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
        body: JSON.stringify({ 
            error: error.name === 'AbortError' ? 'Request timed out' : 'Failed to process request', 
            details: error.message 
        }) 
    };
  }
}
