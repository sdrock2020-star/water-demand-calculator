// Helper function to pause execution
const delay = ms => new Promise(res => setTimeout(res, ms));

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, dashboardState } = JSON.parse(event.body);
    
    const systemPrompt = `You are a Senior Hydrology Expert and the REWARD Project Water Budget Analyst. 
    1. Analyze the provided watershed dashboard data for officials in Odisha.
    2. Answer general questions regarding hydrology, agriculture, climate, and water management.

    CURRENT DASHBOARD STATE:
    - District: ${dashboardState.district || 'Not Selected'}
    - Cluster: ${dashboardState.cluster || 'Not Selected'}
    - Micro-watershed: ${dashboardState.msw || 'Not Selected'}
    - Total Supply: ${dashboardState.totalSupply || 0} m³
    - Total Demand: ${dashboardState.totalDemand || 0} m³
    - Net Status: ${dashboardState.netStatus || 0} m³
    - Irrigation Requirement: ${dashboardState.irrigationReq || 0} m³
    - Human Demand: ${dashboardState.humanDemand || 0} m³

    INSTRUCTIONS: Use professional bullet points for dashboard analysis. Answer general domain questions accurately using web search.`;

    const geminiPayload = {
      contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\nUser Question: " + message }] }],
      tools: [{ googleSearch: {} }]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    let response;
    let attempts = 0;
    const maxAttempts = 3; // Try up to 3 times

    // AUTOMATIC RETRY LOGIC
    while (attempts < maxAttempts) {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      });

      if (response.status === 429) {
        attempts++;
        if (attempts >= maxAttempts) break; // Give up after 3 tries
        console.warn(`Rate limited. Retrying attempt ${attempts}...`);
        await delay(2000 * attempts); // Wait 2s, then 4s, then try again
      } else {
        break; // Success or a different error, exit loop
      }
    }

    if (response.status === 429) {
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reply: "⚠️ **System is highly congested.** Too many users are asking questions at once. Please wait 1 minute and try again." })
        };
    }

    if (!response.ok) {
        throw new Error(`Gemini API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates[0]?.content?.parts[0]?.text || "I couldn't generate a response.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };

  } catch (error) {
    console.error("Backend Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process request', details: error.message }) };
  }
}

//testing a new deploy only