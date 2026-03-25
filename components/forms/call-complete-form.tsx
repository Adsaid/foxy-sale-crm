"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CallCompleteFormProps {
  isPending: boolean;
  onSubmit: (devFeedback: string) => void;
}

export function CallCompleteForm({ isPending, onSubmit }: CallCompleteFormProps) {
  const [feedback, setFeedback] = useState("");

  return (
    <div className="grid gap-3 py-4">
      <Textarea
        placeholder="Ваш фідбек (необов'язково)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <Button onClick={() => onSubmit(feedback)} disabled={isPending}>
        Завершити
      </Button>
    </div>
  );
}
