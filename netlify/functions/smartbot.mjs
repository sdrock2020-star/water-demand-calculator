// ==========================================
    // 🧠 DUAL-ROLE SYSTEM PROMPT
    // ==========================================
    const systemPrompt = `You are an advanced AI with exactly TWO roles. You must seamlessly switch between them based on the user's prompt.

    --- ROLE 1: Dr. HydroAI (Water Management Expert) ---
    If the user asks about water, agriculture, or the project, act as the Chief Hydrologist for the ICAR-IIWM REWARD Project. Use ONLY this data:
    - Location: District: ${dashboardState.district}, Cluster: ${dashboardState.cluster}, MSW: ${dashboardState.msw}
    - OVERALL BUDGET: Supply: ${dashboardState.totalSupply} m³ | Demand: ${dashboardState.totalDemand} m³ | Net Status: ${dashboardState.netStatus} m³
    - HUMAN & LIVESTOCK: Rural: ${dashboardState.popRural}, Urban: ${dashboardState.popUrban} | Cattle: ${dashboardState.popCattle}, Sheep/Goat: ${dashboardState.popSheep}, Poultry: ${dashboardState.popPoultry}, Pigs: ${dashboardState.popPigs}
    - CROP AREA (ha): Paddy: ${dashboardState.areaPaddy}, Pulses: ${dashboardState.areaPulses}, Oilseeds: ${dashboardState.areaOil}, Veg: ${dashboardState.areaVeg}
    - INDUSTRY INPUTS (m³): Heavy: ${dashboardState.indHeavy}, Light: ${dashboardState.indLight}
    - DETAILED SUPPLY SOURCES: Ponds: ${dashboardState.supPond}, Reservoir: ${dashboardState.supRes}, River: ${dashboardState.supRiv} | Dug Well: ${dashboardState.supDug}, Tube Well: ${dashboardState.supTube}
    - SEASONAL DEMAND (m³): Kharif: ${dashboardState.seasonKharif}, Rabi: ${dashboardState.seasonRabi}, Summer: ${dashboardState.seasonSummer}

    --- ROLE 2: General Assistant (Web Searcher) ---
    If the user asks about ANYTHING not strictly covered in the data above (e.g., cars, sports, news, weather, general facts), you assume this role.
    
    🚨 STRICT SYSTEM RULES 🚨
    1. NEVER say "I am just a hydrologist" or refuse a question.
    2. NEVER apologize for not knowing something.
    3. If the answer is not in the dashboard data, you MUST immediately call the 'web_search' tool to find the answer.`;

    // Define the Tool
    const tools = [
      {
        type: "function",
        function: {
          name: "web_search",
          description: "MANDATORY tool for answering questions about sports, cars, news, weather, or anything not found in the local dashboard data.",
          parameters: {
            type: "object",
            properties: { query: { type: "string", description: "The search query to look up on the internet" } },
            required: ["query"],
          },
        },
      }
    ];

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
    ];

    // 1. Initial Call to Groq (Checking if a tool is needed)
    const initialResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.05 // 
      })
    });

    if (!initialResponse.ok) throw new Error(await initialResponse.text());
    const initialData = await initialResponse.json();
    const responseMessage = initialData.choices[0]?.message;

    // 2. Did the AI decide to search the web?
    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const toolArgs = JSON.parse(toolCall.function.arguments);
      
      let searchResults = "No results found.";
      
      // Execute Web Search (Using Tavily API as an example, highly recommended)
      if (process.env.TAVILY_API_KEY) {
          const searchReq = await fetch("https://api.tavily.com/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: toolArgs.query })
          });
          const searchData = await searchReq.json();
          searchResults = JSON.stringify(searchData.results || searchData);
      } else {
          searchResults = "Error: Web search tool is called, but no TAVILY_API_KEY is found in environment variables.";
      }

      // 3. Send the search results back to the AI for a final answer
      messages.push(responseMessage); // Push the assistant's tool call request
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: searchResults
      });

      const finalResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: messages, temperature: 0.3 })
      });

      const finalData = await finalResponse.json();
      return { statusCode: 200, body: JSON.stringify({ reply: finalData.choices[0]?.message?.content }) };
    }

    // If no tool was needed, just return the standard reply
    return { statusCode: 200, body: JSON.stringify({ reply: responseMessage.content || "Sorry, I couldn't generate an answer." }) };

  } catch (error) {
    return { statusCode: 200, body: JSON.stringify({ reply: `🚨 **SYSTEM ERROR:** ${error.message}` }) };
  }
}