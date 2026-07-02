export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, dashboardState } = JSON.parse(event.body);
    
    // 1. System Prompt for Cohere
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

    INSTRUCTIONS: Use professional bullet points for dashboard analysis. Answer general domain questions accurately using your web search capabilities.`;

    // 2. Setup Cohere API Request
    const url = "https://api.cohere.com/v1/chat";
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}` // Using the new Cohere Key
      },
      body: JSON.stringify({
        model: "command-r", // Cohere's advanced reasoning model
        preamble: systemPrompt, // System prompt
        message: message, // User question
        connectors: [{"id": "web-search"}] // THIS TURNS ON LIVE GOOGLE/WEB SEARCH!
      })
    });

    // Handle Rate Limiting gracefully
    if (response.status === 429) {
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reply: "⚠️ **System is busy.** I am receiving too many requests. Please wait a few seconds and try again." })
        };
    }

    if (!response.ok) {
        throw new Error(`Cohere API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Cohere stores the final answer in data.text
    const reply = data.text || "I couldn't generate a response.";

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
