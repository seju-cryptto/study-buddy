
export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    const origin = request.headers.get("Origin");

    if (!origin || origin !== env.ALLOWED_ORIGIN) {
      return new Response("Origin not allowed", { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== "POST") {
      return new Response("Use POST", {
        status: 405,
        headers: corsHeaders
      });
    }

    if (!env.OPENAI_API_KEY) {
      return Response.json(
        { error: "AI backend is not configured yet." },
        { status: 500, headers: corsHeaders }
      );
    }

    try {
      const body = await request.json();
      const question = String(body.question || "").trim();
      const subject = String(body.subject || "General").slice(0, 60);

      if (!question || question.length > 4000) {
        return Response.json(
          { error: "Enter a question under 4000 characters." },
          { status: 400, headers: corsHeaders }
        );
      }

      const aiResponse = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: env.OPENAI_MODEL || "gpt-4.1-mini",
            instructions:
              "You are StudyBuddy, a friendly Class 11 tutor. " +
              "Explain concepts in simple Punjabi Hinglish when useful. " +
              "Show clear steps for Maths and Physics. " +
              "Help students understand rather than just memorize. " +
              "For school exam answers, use English when requested. " +
              "Be accurate, encouraging, and age-appropriate.",
            input: `Subject: ${subject}\nStudent question: ${question}`,
            max_output_tokens: 800
          })
        }
      );

      const data = await aiResponse.json();

      if (!aiResponse.ok) {
        return Response.json(
          { error: "AI service request failed. Check backend settings." },
          { status: 502, headers: corsHeaders }
        );
      }

      const answer = (data.output || [])
        .flatMap(item => item.content || [])
        .filter(item => item.type === "output_text")
        .map(item => item.text)
        .join("\n");

      return Response.json(
        { answer: answer || "Please try asking your question again." },
        { headers: corsHeaders }
      );
    } catch {
      return Response.json(
        { error: "Something went wrong. Please try again." },
        { status: 400, headers: corsHeaders }
      );
    }
  }
};
