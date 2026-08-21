"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AiCopilot() {
  const [question, setQuestion] = useState("Which devices have the worst SLA?");
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState("");
  const [pending, setPending] = useState(false);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const res = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setAnswer(data.error ?? "AI is unavailable.");
      return;
    }
    setSource(data.source);
    setAnswer(data.answer);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>NETMON AI</CardTitle>
        <CardDescription>Tenant-scoped copilot. Uses the engine configured in Settings → AI integration.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={ask} className="flex gap-2">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about outages, SLA, topology…" />
          <Button disabled={pending}>{pending ? "Thinking…" : "Ask"}</Button>
        </form>
        {answer && (
          <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-mono text-sm leading-6">
            {source ? `[${source}]\n` : ""}
            {answer}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
