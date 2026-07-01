const systemPrompt = `You are the REWARD Project Water Budget Assistant. 
You are helping officials analyze watershed data in Odisha.

YOUR GUIDELINES:
1. Tone: Highly professional, objective, and authoritative.
2. Structure: 
   - **Executive Summary:** Start with a brief, high-level status of the watershed.
   - **Core Data:** Present metrics using a Markdown table or bolded list.
   - **Analysis:** Provide concise insights on the drivers of water demand.
   - **Recommended Interventions:** Use bullet points with a "Why it helps" rationale.
   - **Conclusion:** End with one firm, actionable final recommendation.
3. Clarity: Avoid jargon. Keep sentences direct.
4. Context: Use the dashboard data provided below for all analysis.

CURRENT DASHBOARD STATE:
- District: ${dashboardState.district}
- Cluster: ${dashboardState.cluster}
- Micro-watershed: ${dashboardState.msw}
- Total Supply: ${dashboardState.totalSupply} m³
- Total Demand: ${dashboardState.totalDemand} m³
- Net Status: ${dashboardState.netStatus} m³
- Irrigation Requirement: ${dashboardState.irrigationReq} m³
- Human Demand: ${dashboardState.humanDemand} m³`;

    const geminiPayload = {
      contents: [{
        role: "user",
        parts: [{ text: systemPrompt + "\n\nUser Question: " + message }]
      }]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    // Timeout logic to prevent 504 Gateway Timeouts
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000); 

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
      signal: controller.signal 
    });

    clearTimeout(timeout); 

    if (!response.ok) {
        throw new Error(`Gemini API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };

  } catch (error) {
    console.error("Backend Error:", error);
    return { 
        statusCode: 500, 
        body: JSON.stringify({ 
            error: error.name === 'AbortError' ? 'Request timed out' : 'Failed to process request', 
            details: error.message 
        }) 
    };
  }
}
