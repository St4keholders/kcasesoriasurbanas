export const SITE = {
  name: 'KC Asesorías Urbanas',
  shortName: 'KC Asesorías Urbanas',
  tagline: 'Gestión Inmobiliaria Profesional',
  description:
    'KC Asesorías Urbanas: firma especializada en gestión de trámites inmobiliarios, urbanismo y legalización de propiedades en Medellín y el Área Metropolitana.',
  city: 'Medellín',
  region: 'Área Metropolitana',
  address: 'Diagonal 50 # 49 - 84, Oficina 1203',
  whatsappNumber: '573011281492',
  email: '',
  mapsEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.0!2d-75.5657!3d6.2518!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e4429a0b5b5b5b5%3A0x0!2zNsKwMTUnMDYuNSJOIDc1wrAzMyczOS4zIlc!5e0!3m2!1ses!2sco!4v1',
  mapsLink: 'https://share.google/U973PW5idMShDrR5b',
} as const;

export const SERVICES = [
  'Legalización de posesiones',
  'Trámites notariales y urbanos',
  'Escrituración y mejoras',
  'Consultoría legal inmobiliaria',
  'Licencia de construcción',
  'Desenglobes',
  'Otro trámite',
] as const;

export const SCHEDULE = [
  { day: 'Lunes', hours: '10:00 AM — 4:00 PM', open: true },
  { day: 'Martes', hours: '10:00 AM — 4:00 PM', open: true },
  { day: 'Miércoles', hours: '10:00 AM — 4:00 PM', open: true },
  { day: 'Jueves', hours: '10:00 AM — 4:00 PM', open: true },
  { day: 'Viernes', hours: '10:00 AM — 4:00 PM', open: true },
  { day: 'Sábado', hours: 'Cerrado', open: false },
  { day: 'Domingo', hours: 'Cerrado', open: false },
] as const;

export const TIME_SLOTS = [
  { label: '10:00', value: '10:00 a.m.' },
  { label: '11:00', value: '11:00 a.m.' },
  { label: '12:00', value: '12:00 p.m.' },
  { label: '13:00', value: '1:00 p.m.' },
  { label: '14:00', value: '2:00 p.m.' },
  { label: '15:00', value: '3:00 p.m.' },
] as const;

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

export const DIAS = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
] as const;

export const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

export const BUSINESS_DAYS = [1, 2, 3, 4, 5] as const;

export const MAX_MONTHS_AHEAD = 2;
