export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ reply: "Method Not Allowed" }) };
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ reply: "🚨 **Configuration Error:** Missing GROQ_API_KEY." })
      };
    }

    const { message, dashboardState = {} } = JSON.parse(event.body || "{}");

    const systemPrompt = `You are HydroAI, an advanced water management and agricultural assistant for the ICAR-IIWM REWARD Project.

CRITICAL BEHAVIORS:
1. DASHBOARD DATA & WATER BUDGET TELEMETRY:
When users query dashboard calculations, balance sheets, or micro-watershed status, extract directly from this live telemetry:
- Location: District: ${dashboardState.district || "None"}, Cluster: ${dashboardState.cluster || "None"}, MSW: ${dashboardState.msw || "None"}
- OVERALL BUDGET: Total Supply: ${dashboardState.totalSupply || "0"} m³ | Total Demand: ${dashboardState.totalDemand || "0"} m³ | Net Status: ${dashboardState.netStatus || "0"} m³
- DOMESTIC & LIVESTOCK:
  * Total Population: Rural: ${dashboardState.popRural || "0"}, Urban: ${dashboardState.popUrban || "0"} (Rate: 135 LPCD)
  * Livestock Count: Cattle/Buffalo: ${dashboardState.popCattle || "0"}, Sheep/Goat: ${dashboardState.popSheep || "0"}, Poultry: ${dashboardState.popPoultry || "0"}, Pigs: ${dashboardState.popPigs || "0"}
- CROP AREAS (ha):
  * Kharif: Paddy: ${dashboardState.areaPaddy || "0"}, Blackgram: ${dashboardState.areaKBlackgram || "0"}, Maize: ${dashboardState.areaKMaize || "0"}
  * Rabi: Blackgram: ${dashboardState.areaRBlackgram || "0"}, Greengram: ${dashboardState.areaRGreengram || "0"}, Mustard: ${dashboardState.areaRMustard || "0"}, Maize: ${dashboardState.areaRMaize || "0"}, Sugarcane: ${dashboardState.areaRSugarcane || "0"}, Vegetables: ${dashboardState.areaRVeg || "0"}
  * Summer: Vegetables: ${dashboardState.areaSVeg || "0"}
- INDUSTRY INPUTS (m³): Heavy: ${dashboardState.indHeavy || "0"}, Light: ${dashboardState.indLight || "0"}
- SURFACE WATER SUPPLY (m³): Ponds: ${dashboardState.supPond || "0"}, Reservoir: ${dashboardState.supRes || "0"}, River: ${dashboardState.supRiv || "0"}
- GROUND WATER SUPPLY (m³): Groundwater Storage: ${dashboardState.supDug || "0"} m³ | Tube Well: ${dashboardState.supTube || "0"} m³
- SEASONAL DEMAND (m³): Kharif: ${dashboardState.seasonKharif || "0"}, Rabi: ${dashboardState.seasonRabi || "0"}, Summer: ${dashboardState.seasonSummer || "0"}

2. CROP PRICES, POLICY & AGRI-SCIENCE:
Provide clear, authoritative information based on ICAR-IIWM research guidelines.
- Official GOI Minimum Support Price (MSP) for Paddy (Common) is ₹2,300 per quintal, and Paddy (Grade A) is ₹2,320 per quintal.
- Crop water requirement calculations strictly follow the FAO agro-climatic method: AET (mm) = ETo × Kc × Month Days, and Volume (m³) = Area (ha) × AET (mm) × 10.

STRICT FORMATTING RULES:
- Never say you are restricted or unable to access live information.
- Keep responses professional, clear, and action-oriented.
- Utilize clean Markdown bullet points and bold headers.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ reply: `🚨 **Groq API Error (${response.status}):** ${errText}` })
      };
    }

    const data = await response.json();
    const replyContent = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate an answer.";
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: replyContent })
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: `🚨 **System Error:** ${error.message}` })
    };
  }
}