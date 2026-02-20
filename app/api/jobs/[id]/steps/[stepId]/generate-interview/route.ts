import { ChatOpenAI } from "@langchain/openai";

interface GenerateInterviewRequest {
  interviewType: "technical" | "behavioral" | "case-study";
  companyName: string;
  role: string;
  roleDetails: string;
}

const llm = new ChatOpenAI({
  model: "grok-4-1-fast-reasoning",
  apiKey: process.env.XAI_API_KEY,
  configuration: {
    baseURL: "https://api.x.ai/v1",
  },
});

function generatePrompt(
  interviewType: string,
  companyName: string,
  role: string,
  roleDetails: string,
): string {
  const typeDescriptions = {
    technical:
      "focus on technical skills, problem-solving, and domain expertise",
    behavioral:
      "focus on past experiences, soft skills, and how the candidate handles situations",
    "case-study":
      "focus on analytical thinking, decision-making, and business acumen with realistic scenarios",
  };

  const description =
    typeDescriptions[interviewType as keyof typeof typeDescriptions] ||
    typeDescriptions.behavioral;

  return `Generate exactly 10 interview questions for a ${interviewType} interview. 
  
Context:
- Company: ${companyName}
- Position: ${role}
- Role Details: ${roleDetails}

Requirements:
- This should ${description}
- Questions should be specific to the role and company
- Format as a numbered list (1-10)
- Each question should be independent and clear
- No explanations or answers needed, just the questions
- Keep questions concise and professional

Generate only the 10 questions, nothing else.`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const { id, stepId } = await params;
    const body = (await request.json()) as GenerateInterviewRequest;

    const { interviewType, companyName, role, roleDetails } = body;

    if (!interviewType || !companyName || !role || !roleDetails) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const prompt = generatePrompt(
      interviewType,
      companyName,
      role,
      roleDetails,
    );

    const message = await llm.invoke(prompt);
    const content =
      typeof message.content === "string"
        ? message.content
        : String(message.content);

    return Response.json({
      success: true,
      content,
      metadata: {
        interviewType,
        companyName,
        role,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating interview prompt:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate prompt",
      },
      { status: 500 },
    );
  }
}
