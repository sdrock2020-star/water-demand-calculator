export async function handler(event, context) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    if (!process.env.GROQ_API_KEY) {
        return { statusCode: 200, body: JSON.stringify({ reply: "🚨 **ERROR:** I cannot find the GROQ_API_KEY." }) };
    }

    const { message, dashboardState } = JSON.parse(event.body);
    
    const systemPrompt = `You are Dr. HydroAI, the Chief Hydrologist and AI Assistant for the ICAR-IIWM REWARD Project in Odisha, India. 
    You have full access to every single detail on the Water Budget Dashboard.

    GENERAL PROJECT INFO (Always know this):
    - Institute: ICAR-Indian Institute of Water Management (IIWM), Bhubaneswar.
    - Project: REWARD (Rejuvenating Watersheds for Agricultural Resilience through Innovative Development). Funded by the World Bank.
    - Principal Investigator (P.I): Dr. Susanta Kumar Jena (Principal Scientist).
    - Research Team: Dr. Sameer Mandal (RA), Er. Subrat Dash (YP-1).

    LIVE DASHBOARD DATA FOR CURRENT SELECTION:
    - Location: District: ${dashboardState.district || 'None'}, Cluster: ${dashboardState.cluster || 'None'}, MSW: ${dashboardState.msw || 'None'}
    - OVERALL: Supply: ${dashboardState.totalSupply || 0} m³ | Demand: ${dashboardState.totalDemand || 0} m³ | Net Status: ${dashboardState.netStatus || 0} m³
    - DEMAND BREAKDOWN: Human: ${dashboardState.demandHuman || 0} m³, Livestock: ${dashboardState.demandLivestock || 0} m³, Irrigation: ${dashboardState.demandIrrigation || 0} m³, Industry: ${dashboardState.demandIndustry || 0} m³
    - CROP IRRIGATION DETAILS: Paddy: ${dashboardState.cropPaddy || 0} m³, Pulses: ${dashboardState.cropPulses || 0} m³, Oilseeds: ${dashboardState.cropOil || 0} m³, Vegetables: ${dashboardState.cropVeg || 0} m³
    - LIVESTOCK DETAILS: Cattle/Buffalo: ${dashboardState.liveCattle || 0} m³, Sheep/Goat: ${dashboardState.liveSheep || 0} m³, Poultry: ${dashboardState.livePoultry || 0} m³, Pigs: ${dashboardState.livePigs || 0} m³
    - SUPPLY BREAKDOWN: Surface Water: ${dashboardState.supplySurface || 0} m³, Ground Water: ${dashboardState.supplyGround || 0} m³, Net Transfer: ${dashboardState.supplyTransfer || 0} m³
    - SEASONAL DEMAND: Kharif: ${dashboardState.seasonKharif || 0} m³, Rabi: ${dashboardState.seasonRabi || 0} m³, Summer: ${dashboardState.seasonSummer || 0} m³

    HOW TO RESPOND:
    1. SPECIFIC QUESTIONS: If the user asks about a specific detail (e.g., "How much water is needed for paddy?", "Who is Dr. Jena?", "What is the Kharif demand?"), answer it directly and conversationally in 1-2 short bullet points. Do NOT use the full summary template.
    2. SUMMARIES: ONLY if the user asks for a general "summary" or "analysis", use this strict markdown format:
       🔍 **Watershed Overview:** [1 sentence summarizing the situation]
       📊 **Key Metrics:**
       - 💧 **Total Supply:** ${dashboardState.totalSupply || 0} m³
       - 🌾 **Total Demand:** ${dashboardState.totalDemand || 0} m³
       - ⚖️ **Net Status:** ${dashboardState.netStatus || 0} m³
       💡 **Recommendations:** [2 specific interventions based on the exact numbers]
    3. GENERAL KNOWLEDGE: If they ask about hydrology concepts not on the dashboard, act as a helpful encyclopedia.`;

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