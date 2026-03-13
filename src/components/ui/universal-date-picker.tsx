"use client";

import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useId, useState, useEffect } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";

type Mode = "single" | "range";

interface UniversalDatePickerProps {
  className?: string;
  selected?: DateRange;
  onSelect?: (range: DateRange | undefined) => void;
}

export function UniversalDatePicker({ className, selected, onSelect }: UniversalDatePickerProps) {
  const id = useId();
  const [mode, setMode] = useState<Mode>("range");
  const [date, setDate] = useState<Date | undefined>(selected?.from);
  const [range, setRange] = useState<DateRange | undefined>(selected);

  useEffect(() => {
    if (selected) {
        setRange(selected);
        setDate(selected.from);
    }
  }, [selected]);

  const today = new Date();
  const presets = [
    { label: "Today", range: { from: today, to: today } },
    { label: "Yesterday", range: { from: subDays(today, 1), to: subDays(today, 1) } },
    { label: "Last 7 days", range: { from: subDays(today, 6), to: today } },
    { label: "Last 30 days", range: { from: subDays(today, 29), to: today } },
    { label: "This Month", range: { from: startOfMonth(today), to: endOfMonth(today) } },
    { label: "Last Month", range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) } },
    { label: "This Year", range: { from: startOfYear(today), to: endOfYear(today) } },
  ];

  const handleSelect = (val: any) => {
    if (mode === "single") {
        setDate(val);
        if (onSelect) onSelect(val ? { from: val, to: val } : undefined);
    } else {
        setRange(val);
        if (onSelect) onSelect(val);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={id} className="whitespace-nowrap">Filter Date</Label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "single" ? "default" : "outline"}
            onClick={() => setMode("single")}
          >
            Single
          </Button>
          <Button
            size="sm"
            variant={mode === "range" ? "default" : "outline"}
            onClick={() => setMode("range")}
          >
            Range
          </Button>
        </div>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "group w-full justify-between bg-background px-3 font-normal outline-offset-0 hover:bg-background focus-visible:border-ring focus-visible:outline-[3px] focus-visible:outline-ring/20 h-10",
              !date && !range && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {mode === "single" && date
                ? format(date, "dd/MM/yyyy")
                : mode === "range" && range?.from
                ? `${format(range.from, "dd/MM/yyyy")} – ${
                    range.to ? format(range.to, "dd/MM/yyyy") : "—"
                  }`
                : "Pick a date"}
            </span>
            <CalendarIcon
              size={16}
              strokeWidth={2}
              className="shrink-0 text-muted-foreground/80 transition-colors group-hover:text-foreground ml-2"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto max-h-[400px] overflow-y-auto p-3 space-y-3" align="start">
          {/* Presets */}
          <Card className="p-2">
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <Button
                  key={p.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    if (mode === "single") {
                      setDate(p.range.to);
                      if (onSelect) onSelect({ from: p.range.to, to: p.range.to });
                    } else {
                      setRange(p.range);
                      if (onSelect) onSelect(p.range);
                    }
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </Card>

          {/* Calendar */}
          <Calendar
            mode={mode as any}
            selected={mode === "single" ? date : range}
            onSelect={handleSelect}
            showOutsideDays
            className="rounded-md border"
          />

          {/* Year Selector */}
          <Card className="p-3">
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => today.getFullYear() - 8 + i).map(
                (year) => (
                  <Button
                    key={year}
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const yDate = new Date(year, today.getMonth(), today.getDate());
                      if (mode === "single") {
                        setDate(yDate);
                        if (onSelect) onSelect({ from: yDate, to: yDate });
                      } else {
                        const r = { from: startOfYear(yDate), to: endOfYear(yDate) };
                        setRange(r);
                        if (onSelect) onSelect(r);
                      }
                    }}
                  >
                    {year}
                  </Button>
                )
              )}
            </div>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}
