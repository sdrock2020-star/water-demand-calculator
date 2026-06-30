export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, dashboardState } = JSON.parse(event.body);
    
    // 1. Set up the Prompt with the live dashboard data
    const systemPrompt = `You are the REWARD Project Water Budget Assistant. 
    You are helping officials analyze watershed data in Odisha.
    
    CURRENT DASHBOARD STATE:
    - District: ${dashboardState.district}
    - Cluster: ${dashboardState.cluster}
    - Micro-watershed: ${dashboardState.msw}
    - Total Supply: ${dashboardState.totalSupply} m³
    - Total Demand: ${dashboardState.totalDemand} m³
    - Net Status: ${dashboardState.netStatus} m³
    - Irrigation Requirement: ${dashboardState.irrigationReq} m³
    - Human Demand: ${dashboardState.humanDemand} m³
    
    Answer the user's query clearly and concisely based on this data. If the net status is negative, suggest standard water conservation interventions.`;

    // 2. Prepare payload
    const geminiPayload = {
      contents: [{
        role: "user",
        parts: [
            { text: systemPrompt + "\n\nUser Question: " + message }
        ]
      }]
    };

    // 3. Call the Gemini API
   const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      console.log("Full Request URL:", url);
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
