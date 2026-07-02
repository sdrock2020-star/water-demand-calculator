export async function handler(event, context) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { message, dashboardState } = JSON.parse(event.body);
    
    // ==========================================
    // THE "HYDROLOGY EXPERT" SYSTEM PROMPT
    // ==========================================
    const systemPrompt = `You are a Senior Hydrologist and the Lead Water Resource Management Expert for the ICAR-IIWM REWARD Project in Odisha, India. 
    You possess deep academic and practical knowledge of hydrology, watershed management, soil moisture conservation, groundwater dynamics, evapotranspiration, and climate-resilient agriculture.

    YOUR TWO PRIMARY ROLES:
    1. DASHBOARD ANALYST: Analyze the live water budget data provided below. When analyzing data, you MUST use professional formatting (Executive Summary, Deficit/Surplus Analysis, and Strategic Interventions).
    2. HYDROLOGY EDUCATOR: Answer any out-of-the-box questions regarding hydrology, water cycles, irrigation techniques, or general water management. Explain complex hydrological concepts clearly to non-experts.

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
    - ALWAYS use bullet points, bold text for key terms, and keep your tone scientific, authoritative, and helpful. 
    - Keep responses concise and easy to read in a small chat window.`;

    // Fetch call to Groq's blazing fast API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192", // Groq's highly intelligent, open-source model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.6, // Gives it a good balance of accuracy and creativity
        max_tokens: 600
      })
    });

    if (response.status === 429) {
        return { statusCode: 200, body: JSON.stringify({ reply: "⏳ I am receiving too many requests right now. Please wait a few seconds and try again!" }) };
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq Error:", errorText);
        throw new Error("Failed to connect to Groq AI");
    }

    const data = await response.json();export async function handler(event, context) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { message, dashboardState } = JSON.parse(event.body);
    
    // ==========================================
    // THE "HYDROLOGY EXPERT" SYSTEM PROMPT
    // ==========================================
    const systemPrompt = `You are a Senior Hydrologist and the Lead Water Resource Management Expert for the ICAR-IIWM REWARD Project in Odisha, India. 
    You possess deep academic and practical knowledge of hydrology, watershed management, soil moisture conservation, groundwater dynamics, evapotranspiration, and climate-resilient agriculture.

    YOUR TWO PRIMARY ROLES:
    1. DASHBOARD ANALYST: Analyze the live water budget data provided below. When analyzing data, you MUST use professional formatting (Executive Summary, Deficit/Surplus Analysis, and Strategic Interventions).
    2. HYDROLOGY EDUCATOR: Answer any out-of-the-box questions regarding hydrology, water cycles, irrigation techniques, or general water management. Explain complex hydrological concepts clearly to non-experts.

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
    - If the user asks a general question: Ignore the dashboard numbers for that specific answer and act as an encyclopedia of hydrology.
    - ALWAYS use bullet points, bold text for key terms, and keep your tone scientific, authoritative, and helpful. 
    - Keep responses concise and easy to read in a small chat window.`;

    // Fetch call to Groq's API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile", // <--- THIS IS THE UPDATED, ACTIVE MODEL
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.6,
        max_tokens: 600
      })
    });

    if (response.status === 429) {
        return { statusCode: 200, body: JSON.stringify({ reply: "⏳ I am receiving too many requests right now. Please wait a few seconds and try again!" }) };
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq Error:", errorText);
        throw new Error("Failed to connect to Groq AI");
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "Sorry, I couldn't generate an answer.";

    return { statusCode: 200, body: JSON.stringify({ reply }) };

  } catch (error) {
    console.error("Server Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Backend server error." }) };
  }
}
    const reply = data.choices[0]?.message?.content || "Sorry, I couldn't generate an answer.";

    return { statusCode: 200, body: JSON.stringify({ reply }) };

  } catch (error) {
    console.error("Server Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Backend server error." }) };
  }
}
