import { ChatOpenAI } from "@langchain/openai";

interface GenerateAptitudeRequest {
  aptitudeType: "multiple-choice" | "coding" | "logical-reasoning";
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
  aptitudeType: string,
  companyName: string,
  role: string,
  roleDetails: string,
): string {
  const typeDescriptions = {
    "multiple-choice":
      "with clear options (A, B, C, D) covering fundamental concepts, logical thinking, and domain knowledge",
    coding:
      "with clear problem statements, expected inputs/outputs, and constraints",
    "logical-reasoning":
      "that test analytical thinking, pattern recognition, and problem-solving abilities",
  };

  const description =
    typeDescriptions[aptitudeType as keyof typeof typeDescriptions] ||
    typeDescriptions["multiple-choice"];

  return `Generate exactly 8 aptitude test questions for a ${aptitudeType} test.

Context:
- Company: ${companyName}
- Position: ${role}
- Focus Areas: ${roleDetails}

Requirements:
- Questions should be ${description}
- Questions should be specific to the role and company requirements
- Format as a numbered list (1-8)
- Each question should be independent and clear
- For multiple choice, include 4 options (A, B, C, D) and mark the correct answer
- For coding problems, include sample test cases
- For logical reasoning, provide clear problem statements
- Difficulty should range from medium to hard
- No long explanations, just clear questions with options/requirements
`;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: GenerateAptitudeRequest = await request.json();
    const { aptitudeType, companyName, role, roleDetails } = body;

    const prompt = generatePrompt(aptitudeType, companyName, role, roleDetails);

    const message = await llm.invoke([
      {
        role: "user",
        content: prompt,
      },
    ]);

    const content =
      message.content && typeof message.content === "string"
        ? message.content
        : "";

    return Response.json({
      content,
      success: true,
    });
  } catch (error) {
    console.error("Error generating aptitude questions:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
