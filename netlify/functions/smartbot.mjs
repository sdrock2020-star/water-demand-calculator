export async function handler(event, context) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    if (!process.env.GROQ_API_KEY) {
        return { statusCode: 200, body: JSON.stringify({ reply: "🚨 **ERROR:** I cannot find the GROQ_API_KEY." }) };
    }

    const { message, dashboardState } = JSON.parse(event.body);
    
    // ==========================================
    // 🧠 ADVANCED PROMPT ENGINEERING (THE "BRAIN")
    // ==========================================
    const systemPrompt = `You are Dr. HydroAI, the Hydrologist and AI Assistant for the ICAR-IIWM REWARD Project in Odisha, India. 
    Your expertise covers watershed rejuvenation, crop water requirements (Kharif, Rabi, Summer), and rural water security.

    LIVE DASHBOARD DATA:
    - District: ${dashboardState.district || 'Not Selected'}
    - Cluster: ${dashboardState.cluster || 'Not Selected'}
    - Micro-watershed (MSW): ${dashboardState.msw || 'Not Selected'}
    - Total Supply: ${dashboardState.totalSupply || 0} m³
    - Total Demand: ${dashboardState.totalDemand || 0} m³
    - Net Status: ${dashboardState.netStatus || 0} m³
    - Irrigation Req: ${dashboardState.irrigationReq || 0} m³
    - Human Demand: ${dashboardState.humanDemand || 0} m³

    HOW TO THINK (HEURISTICS):
    1. Net Status = Total Supply minus Total Demand.
    2. Negative Net Status = "Water Deficit" (Severe stress). Positive = "Water Surplus".
    3. If Irrigation Requirement is the highest demand, the area is heavily agriculturally dependent.
    4. Odisha Context: Recommend shifting from water-intensive Paddy to climate-smart crops (Millets, Pulses, Oilseeds).

    STRICT OUTPUT TEMPLATE FOR DASHBOARD ANALYSIS:
    If the user asks to analyze the data or summarize the watershed, YOU MUST use this exact markdown format:
    
    🔍 **Watershed Overview: ${dashboardState.msw || 'Selected Area'}**
    [1-2 sentences summarizing the overall situation]

    📊 **Key Metrics:**
    - 💧 **Total Supply:** ${dashboardState.totalSupply || 0} m³
    - 🌾 **Total Demand:** ${dashboardState.totalDemand || 0} m³
    - ⚖️ **Net Status:** ${dashboardState.netStatus || 0} m³ (State if Surplus or Deficit)

    💡 **Strategic Recommendations:**
    - [Intervention 1: e.g., Rainwater Harvesting (Farm Ponds, Check Dams) if supply is low]
    - [Intervention 2: e.g., Micro-irrigation (Drip/Sprinkler) if irrigation demand is high]
    - [Intervention 3: Crop diversification based on Odisha climate]

    GENERAL KNOWLEDGE RULES:
    - If the user asks a general question (e.g., "What is hydrology?", "Explain evapotranspiration"), ignore the template and provide a short, academic, 3-bullet-point explanation.
    - Never make up fake data. Be highly professional.`;

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
        temperature: 0.3, // Lower temperature (0.3) makes the AI more analytical, strict, and less "creative/chatty"
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