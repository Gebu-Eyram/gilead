import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";

type Params = { params: Promise<{ id: string }> };

// Structured output schema for the CV analysis
interface CVAnalysisResult {
  score: number; // 0-100
  status: "passed" | "rejected" | "pending";
  review: string; // detailed feedback
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/applications/[id]/analyze-cv
// Accepts JSON with:
//   - pdfContent: extracted PDF text content
//   - stepId: the recruitment step ID for "CV review"
export async function POST(request: NextRequest, { params }: Params) {
  const { id: applicationId } = await params;

  try {
    console.log("[CV Analysis] Starting CV analysis request");

    // 1. Parse the JSON body
    const body = await request.json();
    const { pdfContent, stepId } = body;

    console.log("[CV Analysis] Parsed request body");

    if (!pdfContent) {
      console.log("[CV Analysis] Error: No PDF content provided");
      return NextResponse.json(
        { error: "No PDF content provided" },
        { status: 400 },
      );
    }

    if (!stepId) {
      console.log("[CV Analysis] Error: No step ID provided");
      return NextResponse.json(
        { error: "No step ID provided" },
        { status: 400 },
      );
    }

    if (!pdfContent.trim()) {
      console.log("[CV Analysis] Error: PDF content is empty");
      return NextResponse.json(
        {
          error: "PDF content is empty. Please upload a readable PDF.",
        },
        { status: 400 },
      );
    }

    console.log(
      "[CV Analysis] PDF content received. Length:",
      pdfContent.length,
    );

    // 2. Fetch the application with its job details
    console.log("[CV Analysis] Fetching application details");
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select(
        `*,
         job:jobs(*, company:companies(*), recruitment_steps(*))`,
      )
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      console.log("[CV Analysis] Error: Application not found");
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    console.log("[CV Analysis] Application found:", applicationId);

    const job = application.job;

    // 3. Build the prompt for AI analysis
    const systemPrompt = `You are an expert HR recruiter and CV analyst. You will analyze a candidate's CV against a job posting and provide a structured evaluation.

You must respond with ONLY valid JSON matching this exact schema:
{
  "score": <number 0-100>,
  "status": "<passed|rejected>",
  "review": "<detailed 2-4 sentence review of the candidate's fit>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
  "recommendation": "<1-2 sentence final recommendation>"
}

Scoring guidelines:
- 80-100: Excellent fit, strong match on most requirements → status: "passed"
- 60-79: Good fit, meets key requirements with some gaps → status: "passed"
- 40-59: Moderate fit, meets some requirements but has notable gaps → status: "rejected"
- 0-39: Poor fit, does not meet most requirements → status: "rejected"

Be fair, objective, and constructive in your analysis.`;

    const userPrompt = `## Job Details
**Title:** ${job.title}
**Company:** ${job.company?.name || "N/A"}
**Type:** ${job.type}
**Location:** ${job.location || "N/A"}
**Remote Status:** ${job.remote_status || "N/A"}
**Experience Level:** ${job.experience_level || "N/A"}
**Department:** ${job.department || "N/A"}

**Description:**
${job.description || "No description provided."}

**Requirements:**
${job.requirements || "No specific requirements listed."}

**Benefits:**
${job.benefits || "No benefits listed."}

---

## Candidate CV Content
${pdfContent}

---

Analyze this CV against the job posting and provide your structured evaluation as JSON.`;

    // 4. Call ChatOpenAI for analysis
    console.log("[CV Analysis] Sending request to ChatOpenAI");
    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    console.log("[CV Analysis] Received response from ChatOpenAI");

    // 5. Parse the AI response
    let analysisResult: CVAnalysisResult;
    try {
      const content =
        typeof response.content === "string"
          ? response.content
          : String(response.content);

      console.log("[CV Analysis] Parsing AI response");

      // Strip markdown code fences if present
      const cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      analysisResult = JSON.parse(cleaned);
      console.log("[CV Analysis] Successfully parsed analysis result");
    } catch (parseError) {
      console.error("[CV Analysis] Failed to parse AI response:", parseError);
      return NextResponse.json(
        { error: "Failed to parse AI analysis response" },
        { status: 500 },
      );
    }

    // 6. Check if progress record already exists for this step
    console.log("[CV Analysis] Checking for existing progress record");
    const { data: existingProgress } = await supabase
      .from("application_progress")
      .select("id")
      .eq("application_id", applicationId)
      .eq("step_id", stepId)
      .single();

    let progressData;

    if (existingProgress) {
      console.log("[CV Analysis] Updating existing progress record");
      // Update existing progress
      const { data, error } = await supabase
        .from("application_progress")
        .update({
          score: analysisResult.score,
          status: analysisResult.status,
          review: analysisResult.review,
        })
        .eq("id", existingProgress.id)
        .select("*, recruitment_step:recruitment_steps(*)")
        .single();

      if (error) {
        console.error("[CV Analysis] Error updating progress:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      progressData = data;
    } else {
      console.log("[CV Analysis] Creating new progress record");
      // Create new progress record
      const { data, error } = await supabase
        .from("application_progress")
        .insert({
          application_id: applicationId,
          user_id: application.user_id,
          step_id: stepId,
          score: analysisResult.score,
          status: analysisResult.status,
          review: analysisResult.review,
        })
        .select("*, recruitment_step:recruitment_steps(*)")
        .single();

      if (error) {
        console.error("[CV Analysis] Error creating progress:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      progressData = data;
    }

    // 7. Return the full analysis along with the saved progress
    console.log("[CV Analysis] Analysis complete, returning results");
    return NextResponse.json({
      analysis: analysisResult,
      progress: progressData,
    });
  } catch (error) {
    console.error("[CV Analysis] Error occurred:", error);
    console.error(
      "[CV Analysis] Error type:",
      error instanceof Error ? error.constructor.name : typeof error,
    );
    console.error(
      "[CV Analysis] Error message:",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to analyze CV",
      },
      { status: 500 },
    );
  }
}
