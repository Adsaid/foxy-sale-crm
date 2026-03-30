"use client";

import { useState } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";
import { CalendarIcon } from "lucide-react";
import { CRM_TIMEZONE } from "@/lib/date-kyiv";
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

  const z = value ? TZDate.tz(CRM_TIMEZONE, new Date(value)) : undefined;
  const date = value ? new Date(value) : undefined;
  const timeValue = z
    ? `${String(z.getHours()).padStart(2, "0")}:${String(z.getMinutes()).padStart(2, "0")}`
    : "09:00";

  function handleDateSelect(selected: Date | undefined) {
    if (!selected) return;
    const k = TZDate.tz(CRM_TIMEZONE, selected);
    const [hours, minutes] = timeValue.split(":").map(Number);
    const combined = new TZDate(
      k.getFullYear(),
      k.getMonth(),
      k.getDate(),
      hours,
      minutes,
      0,
      CRM_TIMEZONE
    );
    onChange(combined.toISOString());
  }

  function handleTimeChange(time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    const base = z ?? TZDate.tz(CRM_TIMEZONE, Date.now());
    const combined = new TZDate(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      hours,
      minutes,
      0,
      CRM_TIMEZONE
    );
    onChange(combined.toISOString());
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
          {z ? format(z, "dd.MM.yyyy HH:mm", { locale: uk }) : placeholder}
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
