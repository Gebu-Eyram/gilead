import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";

type Params = { params: Promise<{ id: string }> };

const llm = new ChatOpenAI({
  model: "grok-4-1-fast-reasoning",
  apiKey: process.env.XAI_API_KEY,
  configuration: {
    baseURL: "https://api.x.ai/v1",
  },
});

// POST /api/applications/[id]/analyze-interview
// Analyzes a completed interview transcript and scores the candidate
// Body: { stepId: string, transcript: string, callDuration?: number }
export async function POST(request: NextRequest, { params }: Params) {
  const { id: applicationId } = await params;

  try {
    const body = await request.json();
    const { stepId, transcript, callDuration = 0 } = body;

    if (!stepId || !transcript) {
      return NextResponse.json(
        { error: "stepId and transcript are required" },
        { status: 400 },
      );
    }

    if (transcript.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "Interview transcript is too short or empty. The interview may not have been completed.",
        },
        { status: 400 },
      );
    }

    console.log(
      "[Interview Analysis] Transcript length:",
      transcript.length,
      "Duration:",
      callDuration,
      "seconds",
    );

    // 3. Fetch application + job details
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select(
        `*,
         applicant:users(*),
         job:jobs(*, company:companies(*), recruitment_steps(*))`,
      )
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    const job = application.job;
    const interviewStep = job.recruitment_steps?.find(
      (s: any) => s.id === stepId,
    );
    const questions = interviewStep?.content || "";

    // 4. Analyze the transcript with AI
    const systemPrompt = `You are an expert HR recruiter analyzing an interview transcript. You will evaluate the candidate's performance and provide a structured assessment.

You must respond with ONLY valid JSON matching this exact schema:
{
  "score": <number 0-100>,
  "review": "<markdown formatted detailed review using the structure below>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
  "recommendation": "<1-2 sentence final recommendation>"
}

The "review" field should be in markdown format with the following structure:
## Overall Assessment
A 3-5 sentence summary of the candidate's interview performance.

## Communication Skills
Evaluate clarity, articulation, confidence, and professionalism in responses.

## Technical/Domain Knowledge
Assess the depth and accuracy of the candidate's knowledge relevant to the role.

## Problem-Solving & Critical Thinking
Evaluate how well the candidate structures thoughts and approaches problems.

## Cultural Fit & Motivation
Assess enthusiasm, alignment with company values, and genuine interest in the role.

## Key Highlights
Notable moments or standout answers from the interview.

## Areas for Development
Specific areas where the candidate could improve.

Scoring guidelines:
- 85-100: Outstanding — Exceptional communication, deep expertise, excellent fit → A+ candidate
- 70-84: Strong — Good communication, solid knowledge, clear potential → Recommended
- 55-69: Average — Adequate responses but lacks depth or confidence in key areas → Consider with reservations
- 40-54: Below Average — Struggled with several questions, gaps in knowledge → Not recommended
- 0-39: Poor — Unable to answer most questions adequately → Reject

Be fair, thorough, and constructive. Consider the role requirements when scoring.`;

    const userPrompt = `## Job Context
**Position:** ${job.title}
**Company:** ${job.company?.name || "N/A"}
**Type:** ${job.type}
**Experience Level:** ${job.experience_level || "N/A"}
**Department:** ${job.department || "N/A"}

**Job Description:**
${job.description || "No description."}

**Requirements:**
${job.requirements || "No specific requirements."}

## Interview Questions Used
${questions || "Standard interview questions were used."}

## Interview Transcript
${transcript}

## Call Metadata
- Duration: ${Math.floor(callDuration / 60)} minutes ${callDuration % 60} seconds
- Candidate: ${application.applicant?.name || "Unknown"}

---

Analyze this interview transcript and provide your structured evaluation as JSON.`;

    console.log("[Interview Analysis] Sending to AI for analysis");
    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    // 5. Parse the AI response
    let analysisResult;
    try {
      const content =
        typeof response.content === "string"
          ? response.content
          : String(response.content);

      const cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      analysisResult = JSON.parse(cleaned);
      console.log("[Interview Analysis] Score:", analysisResult.score);
    } catch (parseError) {
      console.error("[Interview Analysis] Parse error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse AI analysis response" },
        { status: 500 },
      );
    }

    // 6. Save or update progress record
    const { data: existingProgress } = await supabase
      .from("application_progress")
      .select("id")
      .eq("application_id", applicationId)
      .eq("step_id", stepId)
      .single();

    let progressData;

    if (existingProgress) {
      const { data, error } = await supabase
        .from("application_progress")
        .update({
          score: analysisResult.score,
          review: analysisResult.review,
        })
        .eq("id", existingProgress.id)
        .select("*, recruitment_step:recruitment_steps(*)")
        .single();

      if (error) {
        console.error("[Interview Analysis] Update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      progressData = data;
    } else {
      const { data, error } = await supabase
        .from("application_progress")
        .insert({
          application_id: applicationId,
          user_id: application.user_id,
          step_id: stepId,
          score: analysisResult.score,
          review: analysisResult.review,
        })
        .select("*, recruitment_step:recruitment_steps(*)")
        .single();

      if (error) {
        console.error("[Interview Analysis] Insert error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      progressData = data;
    }

    console.log("[Interview Analysis] Complete");
    return NextResponse.json({
      analysis: analysisResult,
      progress: progressData,
      callDuration,
    });
  } catch (error) {
    console.error("[Interview Analysis] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze interview",
      },
      { status: 500 },
    );
  }
}
