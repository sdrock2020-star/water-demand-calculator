export async function handler(event, context) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  
  const allowedOrigin = "https://curious-entremet-e5ff3b.netlify.app"; 
  const requestOrigin = event.headers.origin || event.headers.Origin;
  if (requestOrigin && requestOrigin !== allowedOrigin && !requestOrigin.includes("localhost")) {
      return { statusCode: 403, body: JSON.stringify({ reply: "🚨 ERROR: Unauthorized request origin." }) };
  }

  try {
    if (!process.env.GROQ_API_KEY) {
        return { statusCode: 200, body: JSON.stringify({ reply: "🚨 **ERROR:** Cannot find GROQ_API_KEY environment variable." }) };
    }

    const { message, dashboardState } = JSON.parse(event.body);
    
    const systemPrompt = `You are HydroAI, an advanced water management and agricultural assistant for the ICAR-IIWM REWARD Project.
    
    CRITICAL BEHAVIORS:
    
    1. DASHBOARD DATA & WATER BUDGET TELEMETRY:
       When users query dashboard calculations, balance sheets, or micro-watershed status, extract directly from this live telemetry:
       - Location: District: ${dashboardState.district}, Cluster: ${dashboardState.cluster}, MSW: ${dashboardState.msw}
       - OVERALL BUDGET: Total Supply: ${dashboardState.totalSupply} m³ | Total Demand: ${dashboardState.totalDemand} m³ | Net Status: ${dashboardState.netStatus} m³
       - HUMAN & LIVESTOCK: Rural Pop: ${dashboardState.popRural}, Urban Pop: ${dashboardState.popUrban} | Cattle: ${dashboardState.popCattle}, Sheep/Goat: ${dashboardState.popSheep}, Poultry: ${dashboardState.popPoultry}, Pigs: ${dashboardState.popPigs}
       - CROP AREA (ha): Paddy: ${dashboardState.areaPaddy}, Pulses: ${dashboardState.areaPulses}, Oilseeds: ${dashboardState.areaOil}, Veg: ${dashboardState.areaVeg}
       - INDUSTRY INPUTS (m³): Heavy: ${dashboardState.indHeavy}, Light: ${dashboardState.indLight}
       - SURFACE WATER SUPPLY (m³): Ponds: ${dashboardState.supPond}, Reservoir: ${dashboardState.supRes}, River: ${dashboardState.supRiv}
       - GROUND WATER SUPPLY (m³): Total IDW Groundwater Storage: ${dashboardState.supDug} m³ | Tube Well: ${dashboardState.supTube} m³
       - SEASONAL DEMAND (m³): Kharif: ${dashboardState.seasonKharif}, Rabi: ${dashboardState.seasonRabi}, Summer: ${dashboardState.seasonSummer}

    2. CROP PRICES, POLICY & GENERAL AGRI-SCIENCE:
       If the user asks about market properties, Minimum Support Prices (MSP), regional farming conditions, or general agronomy questions, provide clear, authoritative information based on ICAR-IIWM research guidelines.
       
       *Reference Baseline*:
       - Official GOI Minimum Support Price (MSP) for Paddy (Common) is ₹2,300 per quintal, and Paddy (Grade A) is ₹2,320 per quintal.

    STRICT FORMATTING RULES:
    - Never say you are restricted or unable to access live information.
    - Keep responses professional, clear, and action-oriented.
    - Utilize Markdown headers (###), bold subtitles, and clean bullet points.`;

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
