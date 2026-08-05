export async function handler(event, context) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const allowedOrigin = "https://curious-entremet-e5ff3b.netlify.app"; 
  const requestOrigin = event.headers.origin || event.headers.Origin;
  if (requestOrigin && requestOrigin !== allowedOrigin && !requestOrigin.includes("localhost")) {
      return { statusCode: 403, body: JSON.stringify({ reply: "🚨 ERROR: Unauthorized request origin." }) };
  }

  try {
    if (!process.env.GROQ_API_KEY) {
        return { statusCode: 200, body: JSON.stringify({ reply: "🚨 **ERROR:** I cannot find the GROQ_API_KEY." }) };
    }

    const { message, dashboardState } = JSON.parse(event.body);
    
    // UPDATED: Clearer boundaries so it blends current dashboard telemetry with expert agricultural knowledge base
    const systemPrompt = `You are HydroAI, an advanced water management and agricultural assistant for the ICAR-IIWM REWARD Project.
    
    CRITICAL BEHAVIORS:
    
    1. DASHBOARD DATA & WATER BUDGET TELEMETRY:
       When users query dashboard calculations, balance sheets, or micro-watershed status, extract directly from this live data:
       - Location: District: ${dashboardState.district}, Cluster: ${dashboardState.cluster}, MSW: ${dashboardState.msw}
       - OVERALL BUDGET: Supply: ${dashboardState.totalSupply} m³ | Demand: ${dashboardState.totalDemand} m³ | Net Status: ${dashboardState.netStatus} m³
       - HUMAN & LIVESTOCK: Rural: ${dashboardState.popRural}, Urban: ${dashboardState.popUrban} | Cattle: ${dashboardState.popCattle}, Sheep/Goat: ${dashboardState.popSheep}, Poultry: ${dashboardState.popPoultry}, Pigs: ${dashboardState.popPigs}
       - CROP AREA (ha): Paddy: ${dashboardState.areaPaddy}, Pulses: ${dashboardState.areaPulses}, Oilseeds: ${dashboardState.areaOil}, Veg: ${dashboardState.areaVeg}
       - INDUSTRY INPUTS (m³): Heavy: ${dashboardState.indHeavy}, Light: ${dashboardState.indLight}
       - DETAILED SUPPLY SOURCES: Ponds: ${dashboardState.supPond}, Reservoir: ${dashboardState.supRes}, River: ${dashboardState.supRiv} | Dug Well: ${dashboardState.supDug}, Tube Well: ${dashboardState.supTube}
       - SEASONAL DEMAND (m³): Kharif: ${dashboardState.seasonKharif}, Rabi: ${dashboardState.seasonRabi}, Summer: ${dashboardState.seasonSummer}
      supPondNos: document.getElementById('s-pond-nos').value,
      supResNos: document.getElementById('s-res-nos').value,
      supRivNos: document.getElementById('s-riv-nos').value,

    2. CROP PRICES, POLICY & GENERAL AGRI-SCIENCE:
       If the user asks about market properties, Minimum Support Prices (MSP), regional farming conditions, or general agronomy questions, DO NOT state that the dashboard doesn't have the data. Instead, use your expert training knowledge to provide comprehensive answers. 
       
       *For reference context on current Indian Agricultural baselines*:
       - The Government of India's official Minimum Support Price (MSP) for Paddy (Common) is ₹2,300 per quintal, and Paddy (Grade A) is ₹2,320 per quintal. Provide these explicit data marks smoothly when asked about paddy values in Odisha or Bhubaneswar.

    STRICT FORMATTING RULES:
    - Never say you are restricted or unable to access live information.
    - Keep responses professional, clear, and action-oriented.
    - Always utilize Markdown headers (###), bold subtitles, and clean bullet points. Keep paragraph blocks highly spaced out for dashboard scannability.`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.3,
        max_tokens: 800
      })
    });

    if (!response.ok) {
       const errText = await response.text();
       return { statusCode: 200, body: JSON.stringify({ reply: `🚨 **GROQ API ERROR:** ${errText}` }) };
    }

    const data = await response.json();
    const replyContent = data.choices[0]?.message?.content || "Sorry, I couldn't generate an answer.";
    return { statusCode: 200, body: JSON.stringify({ reply: replyContent }) };
  } catch (error) {
    return { statusCode: 200, body: JSON.stringify({ reply: `🚨 **SYSTEM ERROR:** ${error.message}` }) };
  }
}