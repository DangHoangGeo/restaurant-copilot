import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// import { getRestaurantIdFromMiddleware } from "@/lib/utils/apiUtils"; // If needed for context

// TODO: Implement proper rate limiting (e.g., using Upstash Ratelimit, Redis, or other strategies)
// For demonstration, a very simple in-memory store (not suitable for production)
const requestCounts = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requests per window per IP (or session)

const ChatbotRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty.").max(500, "Message is too long."),
  sessionId: z.string().optional(), // customer_session_id or a specific chat session id
});

export async function POST(request: NextRequest) {
  // Optional: Get restaurant context if AI responses should be restaurant-specific
  // const restaurantId = await getRestaurantIdFromMiddleware();
  // if (!restaurantId) {
  //   return NextResponse.json({ error: "Unauthorized or restaurantId not found" }, { status: 401 });
  // }

  // Simple IP-based rate limiting example (replace with more robust solution)
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const currentEntry = requestCounts.get(ip);

  if (currentEntry && (now - currentEntry.timestamp) < RATE_LIMIT_WINDOW_MS) {
    if (currentEntry.count >= RATE_LIMIT_MAX_REQUESTS) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
    requestCounts.set(ip, { count: currentEntry.count + 1, timestamp: currentEntry.timestamp });
  } else {
    requestCounts.set(ip, { count: 1, timestamp: now });
  }
  // Periodically clear old entries (in a real app, use Redis TTL or similar)
  // setTimeout(() => { ... cleanup logic ... }, RATE_LIMIT_WINDOW_MS * 2);


  try {
    const body = await request.json();
    const validation = ChatbotRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request payload", details: validation.error.flatten() }, { status: 400 });
    }

    const { message, sessionId } = validation.data;

    console.log(`Received chatbot message (session: ${sessionId || 'N/A'}): "${message}"`);

    // TODO: Integrate with actual AI chatbot service (OpenAI, Gemini, etc.)
    // For now, returning a mock response.

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({
      reply: `This is a mock AI response to your message: "${message}". This feature is currently under development. Stay tuned!`
    });

  } catch (error) {
    console.error("Error in chatbot route:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid JSON payload", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
