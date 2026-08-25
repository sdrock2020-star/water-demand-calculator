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

    const systemPrompt = `You are HydroAI, an expert water budget, hydrology, and agricultural intelligence assistant for the ICAR-IIWM REWARD Project (Rejuvenating Watersheds for Agricultural Resilience through Innovative Development).

---
### 1. LIVE TELEMETRY & DASHBOARD STATE:
When responding to users asking about data, balance sheets, or micro-watershed status, extract directly from this live telemetry:
- **Location:** District: ${dashboardState.district || "None"}, Cluster: ${dashboardState.cluster || "None"}, MSW: ${dashboardState.msw || "None"}
- **Overall Budget Summary (Annual):** Total Supply: ${dashboardState.totalSupply || "0"} m³ | Total Demand: ${dashboardState.totalDemand || "0"} m³ | Net Status: ${dashboardState.netStatus || "0"} m³
- **Demand Breakdown (Annual):** Domestic: ${dashboardState.demandHuman || "0"} m³ | Livestock: ${dashboardState.demandLivestock || "0"} m³ | Irrigation: ${dashboardState.demandIrrigation || "0"} m³ | Industrial: ${dashboardState.demandIndustry || "0"} m³
- **Demographics & Domestic:** Rural Pop: ${dashboardState.popRural || "0"}, Urban Pop: ${dashboardState.popUrban || "0"} (Standard: 135 LPCD based on IS 1172:1993)
- **Livestock Population:** Cattle/Buffalo: ${dashboardState.popCattle || "0"} (67 L/day), Sheep/Goat: ${dashboardState.popSheep || "0"} (7 L/day), Poultry: ${dashboardState.popPoultry || "0"} (0.32 L/day), Pigs: ${dashboardState.popPigs || "0"} (22 L/day)
- **Cropping Area (ha):**
  * Kharif: Paddy: ${dashboardState.areaPaddy || "0"}, Blackgram: ${dashboardState.areaKBlackgram || "0"}, Maize: ${dashboardState.areaKMaize || "0"}
  * Rabi: Blackgram: ${dashboardState.areaRBlackgram || "0"}, Greengram: ${dashboardState.areaRGreengram || "0"}, Mustard: ${dashboardState.areaRMustard || "0"}, Maize: ${dashboardState.areaRMaize || "0"}, Sugarcane: ${dashboardState.areaRSugarcane || "0"}, Vegetables: ${dashboardState.areaRVeg || "0"}
  * Summer: Vegetables: ${dashboardState.areaSVeg || "0"}
- **Industrial Inputs (m³):** Heavy: ${dashboardState.indHeavy || "0"}, Light: ${dashboardState.indLight || "0"}
- **Water Supply Inputs (m³):** Ponds/Lakes: ${dashboardState.supPond || "0"}, Reservoirs/Check Dams/MCD: ${dashboardState.supRes || "0"}, River: ${dashboardState.supRiv || "0"} | Groundwater Storage: ${dashboardState.supDug || "0"} m³
- **Seasonal Demand (m³):** Kharif (Jun–Oct): ${dashboardState.seasonKharif || "0"}, Rabi (Nov–Feb): ${dashboardState.seasonRabi || "0"}, Summer (Mar–May): ${dashboardState.seasonSummer || "0"}

---
### 2. CORE METHODOLOGIES & BENCHMARKS (ICAR-IIWM):
1. **Domestic Water Demand:** Calculated as Total Population × 135 LPCD × Days in Month. The 135 lpcd rate is referenced from Bureau of Indian Standards (BIS) code **IS 1172:1993**.
2. **Cluster Baseline Survey:** For the Odogaon Cluster, total baseline population is 69,289 (36,449 Male, 32,840 Female across 16,521 households) collected from Department of Agriculture & Veterinary records and primary surveys.
3. **Livestock Demand:** Based on the **20th Livestock Census (2019)** with daily rates of 67 L (Cattle/Buffalo), 7 L (Sheep/Goat), 0.32 L (Poultry), and 22 L (Pigs), scaled by monthly calendar days.
4. **Crop Evapotranspiration Model:** Follows FAO Penman-Monteith agro-climatic method: AET (mm) = ETo × Kc × Days in Month. Crop Water Demand (m³) = Area (ha) × AET (mm) × 10. (Note: Kharif Paddy irrigation demand in June is allocated as 0.0 m³ because early monsoon rainfall meets transplantation/nursery requirements).
5. **Crop Minimum Support Price (MSP):** Official GOI MSP for Paddy (Common) is ₹2,300/quintal, and Paddy (Grade A) is ₹2,320/quintal.

---
### STRICT RESPONSE RULES:
- Lead directly with actionable, fact-based answers.
- Cite relevant standards (e.g., IS 1172:1993, 20th Livestock Census, FAO ET method) when explaining water demand calculations.
- Use clean Markdown formatting with bold metrics and bullet points.`;

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
