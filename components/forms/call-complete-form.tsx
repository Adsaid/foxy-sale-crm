"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmojiTextareaField } from "@/components/ui/emoji-textarea-field";

interface CallCompleteFormProps {
  isPending: boolean;
  onSubmit: (devFeedback: string) => void;
}

export function CallCompleteForm({ isPending, onSubmit }: CallCompleteFormProps) {
  const [feedback, setFeedback] = useState("");

  return (
    <div className="grid gap-3 py-4">
      <EmojiTextareaField
        label={null}
        placeholder="Ваш фідбек (необов'язково)"
        value={feedback}
        onChange={setFeedback}
        rows={3}
      />
      <Button onClick={() => onSubmit(feedback)} disabled={isPending}>
        Завершити
      </Button>
    </div>
  );
}
