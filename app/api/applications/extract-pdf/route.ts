import { NextRequest, NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

export async function POST(request: NextRequest) {
  try {
    console.log("[PDF Extract] Starting PDF extraction request");

    const formData = await request.formData();
    console.log("[PDF Extract] FormData received");

    const file = formData.get("file") as File;
    console.log("[PDF Extract] File extracted from FormData:", {
      name: file?.name,
      type: file?.type,
      size: file?.size,
    });

    if (!file) {
      console.log("[PDF Extract] Error: No file provided");
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      console.log("[PDF Extract] Error: Invalid file type:", file.type);
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 },
      );
    }

    console.log("[PDF Extract] File validation passed");

    // Load and extract PDF content
    console.log("[PDF Extract] Creating PDFLoader instance");
    const loader = new PDFLoader(file);

    console.log("[PDF Extract] Loading PDF documents");
    const docs = await loader.load();
    console.log(
      "[PDF Extract] PDF loaded successfully. Page count:",
      docs.length,
    );

    console.log("[PDF Extract] Extracting text content from pages");
    const textContents = docs.map((doc) => doc.pageContent).join("\n");
    console.log(
      "[PDF Extract] Text extraction complete. Content length:",
      textContents.length,
    );

    console.log("[PDF Extract] Returning success response");
    return NextResponse.json({
      success: true,
      content: textContents,
      pageCount: docs.length,
    });
  } catch (error) {
    console.error("[PDF Extract] Error occurred:", error);
    console.error(
      "[PDF Extract] Error type:",
      error instanceof Error ? error.constructor.name : typeof error,
    );
    console.error(
      "[PDF Extract] Error message:",
      error instanceof Error ? error.message : String(error),
    );
    console.error(
      "[PDF Extract] Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );

    return NextResponse.json(
      {
        error: "Failed to extract PDF content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
