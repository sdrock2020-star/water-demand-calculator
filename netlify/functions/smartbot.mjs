export async function handler(event, context) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    if (!process.env.GROQ_API_KEY) {
        return { statusCode: 200, body: JSON.stringify({ reply: "🚨 **ERROR:** I cannot find the GROQ_API_KEY." }) };
    }

    const { message, dashboardState } = JSON.parse(event.body);
    
    // ==========================================
    // 🧠 THE ULTIMATE HYDROLOGY EXPERT PROMPT
    // ==========================================
    const systemPrompt = `You are Dr. HydroAI, the Chief Hydrologist and AI Assistant for the ICAR-IIWM REWARD Project in Odisha, India. 
    You act as a world-class water management consultant. You analyze the dashboard data, calculate percentages mentally, and give profound insights.

    GENERAL PROJECT INFO:
    - Institute: ICAR-IIWM, Bhubaneswar. Funded by: World Bank.
    - P.I.: Dr. Susanta Kumar Jena. Team: Dr. Sameer Mandal, Er. Subrat Dash.

    LIVE DASHBOARD DATA (Current Simulator State):
    - Location: District: ${dashboardState.district}, Cluster: ${dashboardState.cluster}, MSW: ${dashboardState.msw}
    - OVERALL BUDGET: Supply: ${dashboardState.totalSupply} m³ | Demand: ${dashboardState.totalDemand} m³ | Net Status: ${dashboardState.netStatus} m³
    - HUMAN & LIVESTOCK INPUTS: Rural Pop: ${dashboardState.popRural}, Urban Pop: ${dashboardState.popUrban} | Cattle: ${dashboardState.popCattle}, Sheep/Goat: ${dashboardState.popSheep}, Poultry: ${dashboardState.popPoultry}
    - CROP AREA INPUTS (Hectares): Paddy: ${dashboardState.areaPaddy} ha, Pulses: ${dashboardState.areaPulses} ha, Oilseeds: ${dashboardState.areaOil} ha, Veg: ${dashboardState.areaVeg} ha
    - DEMAND OUTPUTS (m³): Human: ${dashboardState.demandHuman}, Livestock: ${dashboardState.demandLivestock}, Irrigation: ${dashboardState.demandIrrigation}, Industry: ${dashboardState.demandIndustry}
    - CROP DEMAND (m³): Paddy: ${dashboardState.cropPaddy}, Pulses: ${dashboardState.cropPulses}, Oilseeds: ${dashboardState.cropOil}, Veg: ${dashboardState.cropVeg}
    - SEASONAL DEMAND (m³): Kharif: ${dashboardState.seasonKharif}, Rabi: ${dashboardState.seasonRabi}, Summer: ${dashboardState.seasonSummer}
    - SUPPLY SOURCES (m³): Surface: ${dashboardState.supplySurface}, Ground: ${dashboardState.supplyGround}, Transfer: ${dashboardState.supplyTransfer}

    ADVANCED HEURISTICS (How to Analyze):
    1. If the user asks "What if we change X?", acknowledge that this is a dynamic simulator. Use logic to predict what would happen (e.g., "If you reduce Paddy area, Kharif demand will drop massively").
    2. Analyze the biggest water consumer. If Irrigation > 80% of demand, point it out.
    3. Technical Recommendations: 
       - If Paddy area > 0: Highly recommend "SRI (System of Rice Intensification)" and "AWD (Alternate Wetting and Drying)" to save 30% water.
       - If Summer Demand is high: Warn about depleting baseflow and drinking water scarcity.
       - If Net Status is heavily negative: Recommend "Farm Ponds, Check Dams, and Percolation tanks" to capture monsoon runoff.

    HOW TO RESPOND:
    1. SPECIFIC QUESTIONS (e.g., "How many hectares of paddy are there?", "What's the cattle population?"): Give the exact number directly from the INPUTS above. Keep it brief.
    2. SUMMARIES: If asked to "summarize", use this markdown format:
       🔍 **Watershed Overview:** [1 sentence summarizing the deficit/surplus and the primary cause]
       📊 **Key Metrics:** [Supply, Demand, Net]
       🌾 **Agricultural Footprint:** [Mention the highest crop area and its water demand]
       💡 **Expert Recommendations:** [2 specific interventions using the Advanced Heuristics above]
    3. DO NOT hallucinate numbers. If a value is 0, say 0.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.3,
        max_tokens: 600
      })
    });

    if (response.status === 429) {
        return { statusCode: 200, body: JSON.stringify({ reply: "⏳ System is busy saving water! Please wait 10 seconds and try again." }) };
    }

    if (!response.ok) {
        const errorText = await response.text();
        return { statusCode: 200, body: JSON.stringify({ reply: `🚨 **GROQ ERROR:** ${errorText}` }) };
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "Sorry, I couldn't generate an answer.";

    return { statusCode: 200, body: JSON.stringify({ reply }) };

  } catch (error) {
    return { statusCode: 200, body: JSON.stringify({ reply: `🚨 **CODE CRASH:** ${error.message}` }) };
  }
}