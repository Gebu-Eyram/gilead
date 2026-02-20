import { supabase } from "@/utils/supabase";
import { vapi } from "@/utils/vapi";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// POST /api/applications/[id]/interview
// Creates a VAPI assistant configured for this job's interview step
// Body: { stepId: string }
export async function POST(request: NextRequest, { params }: Params) {
  const { id: applicationId } = await params;

  try {
    const body = await request.json();
    const { stepId } = body;

    if (!stepId) {
      return NextResponse.json(
        { error: "stepId is required" },
        { status: 400 },
      );
    }

    // 1. Fetch application with job details
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
    const applicant = application.applicant;

    // 2. Find the interview step and its content (pre-generated questions)
    const interviewStep = job.recruitment_steps?.find(
      (s: any) => s.id === stepId && s.step_type === "Interview",
    );

    if (!interviewStep) {
      return NextResponse.json(
        { error: "Interview step not found" },
        { status: 404 },
      );
    }

    const questions =
      interviewStep.content ||
      "Ask 5 general interview questions relevant to the role.";

    // 2b. Check if the applicant has already completed this interview step
    const { data: existingProgress } = await supabase
      .from("application_progress")
      .select("id")
      .eq("application_id", applicationId)
      .eq("step_id", stepId)
      .maybeSingle();

    if (existingProgress) {
      return NextResponse.json(
        { error: "You have already completed this interview." },
        { status: 409 },
      );
    }

    // 3. Build the interview prompt
    const systemPrompt = `You are a professional AI interviewer conducting a virtual interview for ${job.company?.name || "the company"}. 

## Role Details
- **Position:** ${job.title}
- **Company:** ${job.company?.name || "N/A"}
- **Job Type:** ${job.type}
- **Department:** ${job.department || "N/A"}
- **Experience Level:** ${job.experience_level || "N/A"}

## Job Description
${job.description || "No description provided."}

## Requirements
${job.requirements || "No specific requirements listed."}

## Interview Questions
Use these pre-prepared questions as your guide. Ask them one at a time, wait for the candidate's response, then move to the next:

${questions}

## Instructions
1. Start by warmly greeting the candidate by name (${applicant?.name || "the candidate"}) and briefly introducing yourself as the AI interviewer for the ${job.title} position at ${job.company?.name || "the company"}.
2. Ask the questions ONE AT A TIME. Do not list multiple questions at once.
3. After they answer, briefly acknowledge their response (e.g., "Thank you", "That's interesting", "Great point") before moving to the next question.
4. If a candidate's answer is unclear or too brief, ask a short follow-up to get more detail before moving on.
5. Keep your tone professional, warm, and encouraging throughout.
6. After all questions are done, thank the candidate for their time and let them know the interview is complete.
7. Keep each of your responses concise — under 40 words unless you need to clarify something.
8. Do NOT provide feedback on answers during the interview. Just listen and acknowledge.`;

    // 4. Create VAPI assistant
    const assistant = await vapi.assistants.create({
      name: "Nala",
      endCallPhrases: [
        "thank you for your time",
        "that concludes our interview",
        "we will be in touch",
        "goodbye",
      ],
      firstMessage: `Hello ${applicant?.name || "there"}! Welcome to your virtual interview for the ${job.title} position at ${job.company?.name || "our company"}. I'll be conducting your interview today. Are you ready to begin?`,
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
        ],
      },
      voice: {
        provider: "11labs",
        voiceId: "8NOqHwer6AD8mGkiPfkf",
        speed: 0.85,
      },
      endCallMessage:
        "Thank you for completing the interview! Your responses have been recorded. You'll receive your results shortly. Good luck!",
      maxDurationSeconds: 1800, // 30 minutes max
    });

    // 5. Return the assistant ID for the client to use
    return NextResponse.json({
      assistantId: assistant.id,
      jobTitle: job.title,
      companyName: job.company?.name,
    });
  } catch (error) {
    console.error("[Interview] Error creating interview:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create interview",
      },
      { status: 500 },
    );
  }
}
