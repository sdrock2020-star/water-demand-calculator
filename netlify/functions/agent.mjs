export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, dashboardState } = JSON.parse(event.body);
    
    // 1. Set up the Prompt with a professional persona and strict formatting rules
    const systemPrompt = `You are a Senior Hydrology Expert and the REWARD Project Water Budget Analyst. 
    You have two main roles:
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

    INSTRUCTIONS & TONE:
    - Maintain a highly professional, academic, and advisory tone at all times.
    - If the user asks to analyze the dashboard data, you MUST structure your response using clear, professional bullet points (e.g., Executive Summary, Key Metrics, Deficit/Surplus Analysis, and Strategic Recommendations).
    - If the user asks a general domain question (e.g., "what is water?", "how does drip irrigation work?"), act as a knowledgeable hydrology expert and explain it clearly. Use your web search capabilities if needed to provide accurate, up-to-date information.`;

    // 2. Prepare payload and ENABLE GOOGLE SEARCH
    const geminiPayload = {
      contents: [{
        role: "user",
        parts: [
            { text: systemPrompt + "\n\nUser Question: " + message }
        ]
      }],
      // This tells Gemini to search the web if the user asks something outside the dashboard data
      tools: [
        { googleSearch: {} }
      ]
    };

    // 3. Call the Gemini API (Using 1.5-flash on v1beta which supports web search)
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
    
    // Safely extract the text response
    const reply = data.candidates[0]?.content?.parts[0]?.text || "I'm sorry, I couldn't generate a response at this time.";

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
