export async function handler(event, context) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    // 1. Check if the API key even exists in Netlify
    if (!process.env.GROQ_API_KEY) {
        return { statusCode: 200, body: JSON.stringify({ reply: "🚨 **ERROR:** I cannot find the GROQ_API_KEY. Please make sure it is saved in Netlify Environment Variables and you redeployed the site!" }) };
    }

    const { message, dashboardState } = JSON.parse(event.body);
    
    const systemPrompt = `You are a Senior Hydrologist for the ICAR-IIWM REWARD Project.
    DASHBOARD STATE:
    - District: ${dashboardState.district}
    - Total Supply: ${dashboardState.totalSupply}
    - Total Demand: ${dashboardState.totalDemand}
    - Net Status: ${dashboardState.netStatus}`;

    // 2. Try to connect to Groq
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
        temperature: 0.6,
        max_tokens: 600
      })
    });

    if (response.status === 429) {
        return { statusCode: 200, body: JSON.stringify({ reply: "⏳ I am receiving too many requests right now. Please wait a few seconds and try again!" }) };
    }

    // 3. IF GROQ REJECTS IT, PRINT THE EXACT ERROR IN THE CHAT WINDOW
    if (!response.ok) {
        const errorText = await response.text();
        return { statusCode: 200, body: JSON.stringify({ reply: `🚨 **GROQ REJECTED REQUEST:** ${errorText}` }) };
    }

    // 4. Success
    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "Sorry, I couldn't generate an answer.";

    return { statusCode: 200, body: JSON.stringify({ reply }) };

  } catch (error) {
    // 5. IF THE CODE CRASHES, PRINT THE CRASH REASON
    return { statusCode: 200, body: JSON.stringify({ reply: `🚨 **CODE CRASH:** ${error.message}` }) };
  }
}
