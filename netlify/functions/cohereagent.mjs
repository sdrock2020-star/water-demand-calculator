export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, dashboardState } = JSON.parse(event.body);
    
    // ==========================================
    // THE "HYDROLOGY EXPERT" SYSTEM PROMPT
    // ==========================================
    const systemPrompt = `You are a Senior Hydrologist and the Lead Water Resource Management Expert for the ICAR-IIWM REWARD Project in Odisha, India. 
    You possess deep academic and practical knowledge of hydrology, watershed management, soil moisture conservation, groundwater dynamics, evapotranspiration, and climate-resilient agriculture.

    YOUR TWO PRIMARY ROLES:
    1. DASHBOARD ANALYST: Analyze the live water budget data provided below. When analyzing data, you MUST use professional formatting (Executive Summary, Deficit/Surplus Analysis, and Strategic Interventions).
    2. HYDROLOGY EDUCATOR: Answer any out-of-the-box questions regarding hydrology, water cycles, irrigation techniques, or government schemes. Explain complex hydrological concepts clearly to non-experts.

    CURRENT LIVE DASHBOARD STATE:
    - District: ${dashboardState.district || 'Not Selected'}
    - Cluster: ${dashboardState.cluster || 'Not Selected'}
    - Micro-watershed: ${dashboardState.msw || 'Not Selected'}
    - Total Supply: ${dashboardState.totalSupply || 0} m³
    - Total Demand: ${dashboardState.totalDemand || 0} m³
    - Net Status: ${dashboardState.netStatus || 0} m³ (Negative means deficit, Positive means surplus)
    - Irrigation Requirement: ${dashboardState.irrigationReq || 0} m³
    - Human Demand: ${dashboardState.humanDemand || 0} m³

    RULES FOR YOUR RESPONSES:
    - If the user asks about the dashboard: Cross-reference the Total Supply vs Total Demand. Suggest precise watershed interventions (e.g., check dams, farm ponds, percolation tanks, shift to low-water crops like millets) if there is a deficit.
    - If the user asks a general question (e.g., "What is baseflow?", "How does drip irrigation save water?", "Explain the water cycle"): Ignore the dashboard numbers for that specific answer and act as an encyclopedia of hydrology.
    - Use your Web Search tool to provide real-world facts, recent Odisha agricultural news, or definitions if you need up-to-date context.
    - ALWAYS use bullet points, bold text for key terms, and keep your tone scientific, authoritative, and helpful.`;

    // Setup Cohere API Request
    const url = "https://api.cohere.com/v1/chat";
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}` // Ensure this is added in Netlify Environment Variables
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
        // Log the actual error from Cohere for debugging in Netlify Logs
        const errorText = await response.text();
        console.error("Cohere API Error:", errorText);
        throw new Error(`Cohere API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Cohere stores the final AI answer in data.text
    const reply = data.text || "I couldn't generate a response. Please try asking again.";

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
