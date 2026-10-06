"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { formatCategory } from "@/lib/utils";

const categories = [
  "python_programming",
  "computer_technology",
  "aptitude_patterns",
  "situational_decision",
  "improvisation_problem_solving",
  "commitment_reliability",
  "wildcard",
];
const types = ["mcq", "code_output", "true_false", "scenario_mcq", "short_text", "creative"];

export type QuestionRow = {
  id: string;
  category: string;
  type: string;
  question_text: string;
  code_snippet: string | null;
  options: string[] | null;
  correct_answer: string | null;
  points: number;
  difficulty: string;
  is_active: boolean;
  sort_order: number;
};

const blank = {
  id: "",
  category: "python_programming",
  type: "mcq",
  question_text: "",
  code_snippet: "",
  options: "",
  correct_answer: "",
  points: "5",
  difficulty: "easy",
  is_active: true,
  sort_order: "15",
};

export function QuestionManager({ questions }: { questions: QuestionRow[] }) {
  const router = useRouter();
  const nextOrder = Math.max(0, ...questions.map((question) => question.sort_order)) + 1;
  const emptyForm = () => ({ ...blank, sort_order: String(nextOrder) });
  const [form, setForm] = useState(emptyForm);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  function edit(question: QuestionRow) {
    setForm({
      id: question.id,
      category: question.category,
      type: question.type,
      question_text: question.question_text,
      code_snippet: question.code_snippet || "",
      options: (question.options || []).join("\n"),
      correct_answer: question.correct_answer || "",
      points: String(question.points),
      difficulty: question.difficulty,
      is_active: question.is_active,
      sort_order: String(question.sort_order),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setState("saving");
    setError("");
    try {
      const payload = {
        ...form,
        options: form.options.split("\n").map((v) => v.trim()).filter(Boolean),
        points: Number(form.points),
        sort_order: Number(form.sort_order),
      };
      const response = await fetch("/api/admin/questions", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not save question.");
        setState("error");
        return;
      }
      setForm({ ...emptyForm(), sort_order: String(Math.max(nextOrder, Number(form.sort_order) + (form.id ? 0 : 1))) });
      setState("idle");
      router.refresh();
    } catch {
      setError("Connection problem. Please try again.");
      setState("error");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this question? If it has candidate answers, deactivate it instead.")) return;
    setState("saving");
    try {
      const response = await fetch("/api/admin/questions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not delete question.");
        return;
      }
      router.refresh();
    } catch {
      setError("Connection problem. Please try again.");
    } finally {
      setState("idle");
    }
  }

  const activeQuestions = questions.filter((question) => question.is_active);
  const activePoints = activeQuestions.reduce((sum, question) => sum + Number(question.points), 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-3 text-xs text-zinc-500">
        <span className="rounded-full border border-line px-3 py-1.5">Active: {activeQuestions.length} questions</span>
        <span className={`rounded-full border px-3 py-1.5 ${activePoints === 100 ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}`}>Active points: {activePoints} / 100</span>
      </div>
      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <form onSubmit={save} className="h-fit rounded-2xl border border-line bg-panel/80 p-5 lg:sticky lg:top-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{form.id ? "Edit question" : "Add question"}</h2>
          {form.id && <button type="button" onClick={() => setForm(emptyForm())} className="text-xs text-zinc-500 hover:text-zinc-200">Cancel</button>}
        </div>
        <div className="mt-5 space-y-4">
          <label className="block text-xs text-zinc-500">Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-panel px-3 text-sm text-zinc-200">{categories.map((category) => <option key={category} value={category}>{formatCategory(category)}</option>)}</select></label>
          <label className="block text-xs text-zinc-500">Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-panel px-3 text-sm text-zinc-200">{types.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="block text-xs text-zinc-500">Question<Textarea className="mt-2" rows={4} value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} required /></label>
          <label className="block text-xs text-zinc-500">Code snippet (optional)<Textarea className="mt-2 font-mono text-xs" rows={4} value={form.code_snippet} onChange={(e) => setForm({ ...form, code_snippet: e.target.value })} /></label>
          <label className="block text-xs text-zinc-500">Options — one per line<Textarea className="mt-2" rows={5} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} /></label>
          <label className="block text-xs text-zinc-500">Correct answer<Input className="mt-2" value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} placeholder="Leave blank for manual scoring" /></label>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-zinc-500">Points<Input className="mt-2" type="number" min="0" max="100" step="0.5" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></label>
            <label className="text-xs text-zinc-500">Order<Input className="mt-2" type="number" min="1" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></label>
            <label className="text-xs text-zinc-500">Difficulty<select className="mt-2 min-h-12 w-full rounded-xl border border-line bg-panel px-2 text-sm" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}><option>easy</option><option>medium</option></select></label>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <Button type="submit" className="w-full" disabled={state === "saving"}>{state === "saving" ? "Saving…" : form.id ? "Save Changes" : "Add Question"}</Button>
        </div>
      </form>

      <div className="space-y-3">
        {questions.map((question) => (
          <div key={question.id} className="rounded-2xl border border-line bg-panel/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-zinc-600">#{question.sort_order} · {formatCategory(question.category)} · {question.type} · {question.points} pts</div>
                <div className="mt-2 font-medium leading-6 text-zinc-100">{question.question_text}</div>
                <div className="mt-2 text-xs text-zinc-500">{question.is_active ? "Active" : "Inactive"} · {question.difficulty}</div>
              </div>
              <div className="flex shrink-0 flex-col gap-1 text-xs font-semibold sm:flex-row">
                <button disabled={state === "saving"} onClick={() => edit(question)} className="min-h-11 rounded-lg px-3 text-violet-300 hover:bg-white/5">Edit</button>
                <button disabled={state === "saving"} onClick={() => void remove(question.id)} className="min-h-11 rounded-lg px-3 text-red-300 hover:bg-red-500/10">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
