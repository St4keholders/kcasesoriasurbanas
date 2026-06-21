"use client";

import { TIME_SLOTS } from "@/lib/constants";

interface TimeSlotsProps {
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
}

export function TimeSlots({ selectedSlot, onSelectSlot }: TimeSlotsProps) {
  return (
    <div
      className="cal-slots"
      role="group"
      aria-label="Selecciona una hora"
    >
      {TIME_SLOTS.map((slot) => (
        <button
          key={slot.value}
          type="button"
          className={`slot${selectedSlot === slot.value ? " picked" : ""}`}
          data-slot={slot.value}
          onClick={() => onSelectSlot(slot.value)}
        >
          {slot.label}
        </button>
      ))}
    </div>
  );
}
