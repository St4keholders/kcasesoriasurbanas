"use client";

import { useState, useCallback } from "react";
import { Calendar } from "./Calendar";
import { TimeSlots } from "./TimeSlots";
import { SERVICES } from "@/lib/constants";
import { waUrl, buildAppointmentMessage } from "@/lib/whatsapp";
import { formatDate } from "@/lib/utils/date";
import { combineDateAndSlot } from "@/lib/utils/date";

const WA_ICON_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z";

const WA_OUTLINE_PATH =
  "M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.306-.183-2.87.852.852-2.87-.183-.306A8 8 0 1112 20z";

function validPhone(v: string): boolean {
  return v.replace(/\D/g, "").length >= 7;
}

export function AppointmentForm() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [service, setService] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const hasName = name.trim().length >= 2;
  const hasPhone = validPhone(phone);
  const hasService = service !== "";
  const ready =
    selectedDate !== null &&
    selectedSlot !== null &&
    hasName &&
    hasPhone &&
    hasService;

  const getPickText = useCallback(() => {
    if (!selectedDate && !selectedSlot) {
      return "Elige un día, hora y servicio";
    }
    if (selectedDate && !selectedSlot) {
      return `<b>${formatDate(selectedDate)}</b> · falta la hora`;
    }
    if (!selectedDate && selectedSlot) {
      return `<b>${selectedSlot}</b> · falta el día`;
    }
    if (!hasService) {
      return `<b>${formatDate(selectedDate!)} · ${selectedSlot}</b> · elige un servicio`;
    }
    if (!hasName || !hasPhone) {
      return `<b>${formatDate(selectedDate!)} · ${selectedSlot}</b> · completa tus datos`;
    }
    return `<b>${formatDate(selectedDate!)} · ${selectedSlot}</b> · todo listo ✓`;
  }, [selectedDate, selectedSlot, hasService, hasName, hasPhone]);

  const handleConfirm = async () => {
    if (!ready || !selectedDate || !selectedSlot) return;

    const scheduledAt = combineDateAndSlot(selectedDate, selectedSlot);

    // 1) Save to Supabase
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          phone: phone.trim(),
          scheduledAt,
          serviceName: service,
        }),
      });
      if (!res.ok) console.error("Error guardando cita");
    } catch (e) {
      console.error("Error de red", e);
      // Don't block the flow — still open WhatsApp
    }

    // 2) Open WhatsApp
    const msg = buildAppointmentMessage({
      date: selectedDate,
      slot: selectedSlot,
      service,
      name: name.trim(),
      phone: phone.trim(),
    });
    window.open(waUrl(msg), "_blank", "noopener");
  };

  return (
    <div className="calendar">
      {/* Calendar grid (embedded inside the calendar card) */}
      <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* Time slots */}
      <TimeSlots selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} />

      {/* Service select */}
      <div className="cal-service-select">
        <label htmlFor="calService">Servicio requerido</label>
        <select
          id="calService"
          value={service}
          onChange={(e) => setService(e.target.value)}
        >
          <option value="">— Elige un servicio —</option>
          {SERVICES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Name & phone fields */}
      <div className="cal-fields">
        <input
          type="text"
          className="cal-input"
          placeholder="Tu nombre completo"
          autoComplete="name"
          aria-label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="tel"
          className="cal-input"
          placeholder="Tu número de contacto"
          autoComplete="tel"
          inputMode="tel"
          aria-label="Número de contacto"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {/* Status text */}
      <div
        className="cal-pick"
        dangerouslySetInnerHTML={{ __html: getPickText() }}
      />

      {/* Confirm button */}
      <button
        type="button"
        className="btn btn-sky cal-confirm"
        disabled={!ready}
        onClick={handleConfirm}
      >
        <svg className="wa-icon" viewBox="0 0 24 24">
          <path d={WA_ICON_PATH} />
          <path d={WA_OUTLINE_PATH} />
        </svg>
        Confirmar por WhatsApp →
      </button>
    </div>
  );
}
