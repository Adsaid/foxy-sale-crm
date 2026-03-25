"use client";

import { useState } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Оберіть дату та час",
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  const date = value ? new Date(value) : undefined;
  const timeValue = date
    ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
    : "09:00";

  function handleDateSelect(selected: Date | undefined) {
    if (!selected) return;
    const [hours, minutes] = timeValue.split(":").map(Number);
    selected.setHours(hours, minutes, 0, 0);
    onChange(selected.toISOString());
  }

  function handleTimeChange(time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    const d = date ? new Date(date) : new Date();
    d.setHours(hours, minutes, 0, 0);
    onChange(d.toISOString());
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {date ? format(date, "dd.MM.yyyy HH:mm", { locale: uk }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto flex-row gap-0 p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          locale={uk}
        />
        <div className="flex flex-col justify-center gap-2 border-l p-3">
          <label className="text-xs font-medium text-muted-foreground">Час</label>
          <Input
            type="time"
            value={timeValue}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="h-9 w-28"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
