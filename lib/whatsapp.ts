import { SITE, DIAS, MESES } from './constants';

export function waUrl(msg: string): string {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

export function buildAppointmentMessage(params: {
  date: Date;
  slot: string;
  service: string;
  name: string;
  phone: string;
}): string {
  const { date, slot, service, name, phone } = params;
  return `Hola 👋 Quiero agendar una consulta con *${SITE.name}*

📅 *Fecha:* ${formatDateLong(date)}
🕐 *Hora:* ${slot}
📋 *Servicio:* ${service}

👤 *Nombre:* ${name}
📞 *Contacto:* ${phone}

¡Gracias, quedo atento a confirmación!`;
}

export function formatDateLong(date: Date): string {
  return `${DIAS[date.getDay()]} ${date.getDate()} de ${MESES[date.getMonth()]}`;
}
