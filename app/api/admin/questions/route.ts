import { NextResponse } from "next/server";
import { hasApiRole } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";

const CATEGORIES = new Set(["python_programming", "computer_technology", "aptitude_patterns", "situational_decision", "improvisation_problem_solving", "commitment_reliability", "wildcard"]);
const TYPES = new Set(["mcq", "code_output", "true_false", "scenario_mcq", "short_text", "creative"]);

async function parseQuestion(request: Request) {
  const body = await request.json();
  const category = String(body.category || "");
  const type = String(body.type || "");
  const questionText = String(body.question_text || "").trim();
  const options = Array.isArray(body.options) ? body.options.map((v: unknown) => String(v).trim()).filter(Boolean) : [];
  const correctAnswer = String(body.correct_answer || "").trim() || null;
  const points = Number(body.points);
  const sortOrder = Number(body.sort_order);
  if (!CATEGORIES.has(category) || !TYPES.has(type) || !questionText) throw new Error("INVALID_QUESTION");
  if (!Number.isFinite(points) || points < 0 || points > 100 || !Number.isInteger(sortOrder) || sortOrder < 1) throw new Error("INVALID_QUESTION");
  if (["mcq", "scenario_mcq", "true_false", "code_output"].includes(type) && options.length < 2) throw new Error("CHOICES_REQUIRED");
  if (["mcq", "scenario_mcq", "true_false", "code_output"].includes(type) && !correctAnswer) throw new Error("CORRECT_REQUIRED");
  if (correctAnswer && options.length && !options.includes(correctAnswer)) throw new Error("CORRECT_NOT_OPTION");
  const objective = ["mcq", "scenario_mcq", "true_false", "code_output"].includes(type);
  if (objective && (new Set(options).size !== options.length || options.some((option: string) => option.length > 500))) throw new Error("INVALID_OPTIONS");
  return {
    id: String(body.id || ""),
    category,
    type,
    question_text: questionText,
    code_snippet: String(body.code_snippet || "").trim() || null,
    options: objective ? options : null,
    correct_answer: objective ? correctAnswer : null,
    points,
    difficulty: body.difficulty === "medium" ? "medium" : "easy",
    is_active: body.is_active !== false,
    sort_order: sortOrder,
  };
}

function parseError(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  if (message === "CHOICES_REQUIRED") return "Choice questions need at least two options.";
  if (message === "CORRECT_REQUIRED") return "Objective questions need a correct answer.";
  if (message === "CORRECT_NOT_OPTION") return "The correct answer must exactly match one option.";
  if (message === "INVALID_QUESTION") return "Check the question fields and point values.";
  if (message === "INVALID_OPTIONS") return "Options must be unique and at most 500 characters.";
  if (message.includes("Active questions are locked")) return "Active questions are locked while a candidate is taking the challenge.";
  if (message.includes("Question has candidate answers")) return "This question has candidate answers. Add a replacement instead.";
  if (message.includes("questions_active_sort_order_unique")) return "Another active question already uses that order. Choose a different order.";
  return "Could not save question.";
}

export async function POST(request: Request) {
  const identity = await hasApiRole(["admin"]);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const question = await parseQuestion(request);
    const { id, ...insert } = question;
    void id;
    const { error } = await createServiceClient().from("questions").insert(insert);
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("question create error", error);
    return NextResponse.json({ error: parseError(error) }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const identity = await hasApiRole(["admin"]);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const question = await parseQuestion(request);
    if (!question.id) return NextResponse.json({ error: "Missing question id." }, { status: 400 });
    const service = createServiceClient();
    const { data: existing, error: existingError } = await service
      .from("questions")
      .select("category,type,question_text,code_snippet,options,correct_answer,points,difficulty,is_active,sort_order")
      .eq("id", question.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: "Question not found." }, { status: 404 });

    const { count: answerCount, error: answerCountError } = await service
      .from("answers")
      .select("id", { count: "exact", head: true })
      .eq("question_id", question.id);
    if (answerCountError) throw answerCountError;

    if ((answerCount || 0) > 0) {
      const protectedFieldsChanged =
        existing.category !== question.category ||
        existing.type !== question.type ||
        existing.question_text !== question.question_text ||
        (existing.code_snippet || null) !== question.code_snippet ||
        JSON.stringify(existing.options || null) !== JSON.stringify(question.options || null) ||
        (existing.correct_answer || null) !== question.correct_answer ||
        Number(existing.points) !== question.points ||
        existing.difficulty !== question.difficulty ||
        Number(existing.sort_order) !== question.sort_order;

      if (protectedFieldsChanged) {
        return NextResponse.json(
          { error: "This question already has candidate answers. Deactivate it and add a replacement instead of changing its content or points." },
          { status: 409 },
        );
      }
    }

    const { id, ...update } = question;
    const { error } = await service.from("questions").update({ ...update, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("question update error", error);
    return NextResponse.json({ error: parseError(error) }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const identity = await hasApiRole(["admin"]);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const id = String((await request.json()).id || "");
    if (!id) return NextResponse.json({ error: "Missing question id." }, { status: 400 });
    const service = createServiceClient();
    const { error } = await service.from("questions").delete().eq("id", id);
    if (error?.code === "23503") return NextResponse.json({ error: "This question already has candidate answers. Deactivate it instead." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("question delete error", error);
    return NextResponse.json({ error: parseError(error) }, { status: 400 });
  }
}
