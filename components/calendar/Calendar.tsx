"use client";

import { useMemo, useState, useCallback } from "react";
import { MESES, DOW, BUSINESS_DAYS, MAX_MONTHS_AHEAD } from "@/lib/constants";

interface CalendarProps {
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
}

export function Calendar({ selectedDate, onSelectDate }: CalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const monthOffset = useCallback(
    (y: number, m: number) =>
      (y - today.getFullYear()) * 12 + (m - today.getMonth()),
    [today]
  );

  const canPrev = monthOffset(view.year, view.month) > 0;
  const canNext = monthOffset(view.year, view.month) < MAX_MONTHS_AHEAD;

  const handlePrev = () => {
    if (!canPrev) return;
    setView((prev) => {
      let m = prev.month - 1;
      let y = prev.year;
      if (m < 0) {
        m = 11;
        y--;
      }
      return { year: y, month: m };
    });
  };

  const handleNext = () => {
    if (!canNext) return;
    setView((prev) => {
      let m = prev.month + 1;
      let y = prev.year;
      if (m > 11) {
        m = 0;
        y++;
      }
      return { year: y, month: m };
    });
  };

  const firstDay = new Date(view.year, view.month, 1);
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7; // Monday = 0

  const monthName =
    MESES[view.month][0].toUpperCase() +
    MESES[view.month].slice(1) +
    " " +
    view.year;

  const days: Array<{
    num: number;
    disabled: boolean;
    selected: boolean;
    date: Date;
  }> = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(view.year, view.month, d);
    const isPast = date <= today;
    const isBusinessDay = (BUSINESS_DAYS as readonly number[]).includes(
      date.getDay()
    );
    const isSelected =
      selectedDate !== null &&
      selectedDate.getFullYear() === view.year &&
      selectedDate.getMonth() === view.month &&
      selectedDate.getDate() === d;

    days.push({
      num: d,
      disabled: isPast || !isBusinessDay,
      selected: isSelected,
      date,
    });
  }

  return (
    <>
      <div className="cal-head">
        <div className="cal-month">{monthName}</div>
        <div className="cal-nav">
          <button
            type="button"
            aria-label="Mes anterior"
            disabled={!canPrev}
            onClick={handlePrev}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Mes siguiente"
            disabled={!canNext}
            onClick={handleNext}
          >
            ›
          </button>
        </div>
        <div className="cal-tag">Consulta · Inmobiliaria</div>
      </div>

      <div
        className="cal-grid"
        role="group"
        aria-label="Selecciona un día"
      >
        {DOW.map((d) => (
          <div key={d} className="dow">
            {d}
          </div>
        ))}

        {/* Empty cells for offset */}
        {Array.from({ length: offset }).map((_, i) => (
          <button
            key={`empty-${i}`}
            className="day empty"
            disabled
            tabIndex={-1}
          />
        ))}

        {/* Day buttons */}
        {days.map((day) => (
          <button
            key={day.num}
            type="button"
            className={`day${day.selected ? " selected" : ""}`}
            disabled={day.disabled}
            onClick={() => !day.disabled && onSelectDate(day.date)}
          >
            {day.num}
          </button>
        ))}
      </div>
    </>
  );
}
