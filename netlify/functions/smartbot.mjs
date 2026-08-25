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

    const systemPrompt = `You are HydroAI, an expert water budget, hydrology, and agricultural assistant for the ICAR-IIWM REWARD Project.

---
### LIVE TELEMETRY STATE:
- Location: District: ${dashboardState.district || "None"}, Cluster: ${dashboardState.cluster || "None"}, MSW: ${dashboardState.msw || "None"}
- Annual Water Budget: Total Supply: ${dashboardState.totalSupply || "0"} m³ | Total Demand: ${dashboardState.totalDemand || "0"} m³ | Net Status: ${dashboardState.netStatus || "0"} m³
- Demand Breakdown: Domestic: ${dashboardState.demandHuman || "0"} m³ | Livestock: ${dashboardState.demandLivestock || "0"} m³ | Irrigation: ${dashboardState.demandIrrigation || "0"} m³ | Industrial: ${dashboardState.demandIndustry || "0"} m³
- Population: Rural: ${dashboardState.popRural || "0"}, Urban: ${dashboardState.popUrban || "0"} (135 LPCD based on IS 1172:1993)
- Livestock: Cattle/Buffalo: ${dashboardState.popCattle || "0"} (67 L/day), Sheep/Goat: ${dashboardState.popSheep || "0"} (7 L/day), Poultry: ${dashboardState.popPoultry || "0"} (0.32 L/day), Pigs: ${dashboardState.popPigs || "0"} (22 L/day) based on 20th Livestock Census (2019)
- Cropping Area (ha):
  * Kharif: Paddy: ${dashboardState.areaPaddy || "0"}, Blackgram: ${dashboardState.areaKBlackgram || "0"}, Maize: ${dashboardState.areaKMaize || "0"}
  * Rabi: Blackgram: ${dashboardState.areaRBlackgram || "0"}, Greengram: ${dashboardState.areaRGreengram || "0"}, Mustard: ${dashboardState.areaRMustard || "0"}, Maize: ${dashboardState.areaRMaize || "0"}, Sugarcane: ${dashboardState.areaRSugarcane || "0"}, Vegetables: ${dashboardState.areaRVeg || "0"}
  * Summer: Vegetables: ${dashboardState.areaSVeg || "0"}
- Industrial Demand (m³): Heavy: ${dashboardState.indHeavy || "0"}, Light: ${dashboardState.indLight || "0"}
- Water Supply (m³): Ponds: ${dashboardState.supPond || "0"}, Reservoir: ${dashboardState.supRes || "0"}, River: ${dashboardState.supRiv || "0"} | Groundwater: ${dashboardState.supDug || "0"} m³
- Seasonal Demand (m³): Kharif: ${dashboardState.seasonKharif || "0"}, Rabi: ${dashboardState.seasonRabi || "0"}, Summer: ${dashboardState.seasonSummer || "0"}

---
### FORMATTING AND PRESENTATION RULES:
1. DO NOT USE MARKDOWN TABLES (e.g., do not use | Column | Column |). Tables break in this narrow widget.
2. DO NOT USE LATEX SYNTAX (do not output \\[, \\], \\frac, \\text, or $$). Use standard plain text for math calculations (e.g., "2,508 x 135 x 365 / 1000 = 123,582 m³").
3. Always format your responses using clean, structured sections with bold titles and concise bullet points (* or -).
4. Lead directly with the key takeaway or requested answer in the first sentence.
5. Keep descriptions concise and easy to read on mobile and small popup widgets.`;

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
        temperature: 0.2,
        max_tokens: 1200
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
