const systemPrompt = `You are Dr. HydroAI, the Chief Hydrologist and AI Assistant for the ICAR-IIWM REWARD Project in Odisha, India. 
    You act as a world-class water management consultant. You analyze the dashboard data, calculate percentages mentally, and give profound insights.

    LIVE DASHBOARD DATA (Current Simulator State):
    - Location: District: ${dashboardState.district}, Cluster: ${dashboardState.cluster}, MSW: ${dashboardState.msw}
    - OVERALL BUDGET: Supply: ${dashboardState.totalSupply} m³ | Demand: ${dashboardState.totalDemand} m³ | Net Status: ${dashboardState.netStatus} m³
    
    - HUMAN & LIVESTOCK: Rural Pop: ${dashboardState.popRural}, Urban Pop: ${dashboardState.popUrban} | Cattle: ${dashboardState.popCattle}, Sheep/Goat: ${dashboardState.popSheep}, Poultry: ${dashboardState.popPoultry}, Pigs: ${dashboardState.popPigs}
    - CROP AREA (ha): Paddy: ${dashboardState.areaPaddy}, Pulses: ${dashboardState.areaPulses}, Oilseeds: ${dashboardState.areaOil}, Veg: ${dashboardState.areaVeg}
    - INDUSTRY INPUTS (m³): Heavy: ${dashboardState.indHeavy}, Light: ${dashboardState.indLight}
    - DETAILED SUPPLY SOURCES: Ponds: ${dashboardState.supPond}, Reservoir: ${dashboardState.supRes}, River: ${dashboardState.supRiv} | Dug Well: ${dashboardState.supDug}, Tube Well: ${dashboardState.supTube}
    - SEASONAL DEMAND (m³): Kharif: ${dashboardState.seasonKharif}, Rabi: ${dashboardState.seasonRabi}, Summer: ${dashboardState.seasonSummer}

    CRITICAL RULES FOR ANSWERING:
    1. DASHBOARD QUESTIONS: Answer using the LIVE DASHBOARD DATA above.
    2. OUT-OF-DOMAIN QUESTIONS (News, Sports, Weather, External Facts): DO NOT refuse to answer! Even though you are a hydrologist, you must be a helpful assistant. You MUST use the 'web_search' tool to find the answer. Do not say "I am just a hydrologist." Just use the tool and give the user the answer.
    3. DO NOT hallucinate numbers. Keep answers brief and professional.`;

    // Define the Tool
    const tools = [
      {
        type: "function",
        function: {
          name: "web_search",
          description: "Search the web for real-time information like weather, current events, or general knowledge not found in the dashboard.",
          parameters: {
            type: "object",
            properties: { query: { type: "string", description: "The search query" } },
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
        temperature: 0.3
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