-- =====================================================================
-- KC Asesorías Urbanas S.A.S — Fase 4: Motor Contable, Plan Único de Cuentas
-- (Decreto 2650 Clases 1-6), Fusión de Terceros, Parámetros Tributarios 2026,
-- Reglas de Contabilización, Comprobantes (CC, CE, RC, NC) y Controles
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EXTENSIÓN DE CENTROS DE COSTO (Sección B)
-- ---------------------------------------------------------------------
alter table public.cost_centers
  add column if not exists accounting_class int not null default 5 check (accounting_class in (5, 6)),
  add column if not exists center_type text not null default 'administracion' check (center_type in ('administracion', 'construccion'));

update public.cost_centers
set accounting_class = 5,
    center_type = 'administracion'
where lower(name) like '%kc%' or lower(name) like '%medell%';

update public.cost_centers
set accounting_class = 6,
    center_type = 'construccion'
where lower(name) like '%tol%' or lower(name) like '%bello%';

insert into public.cost_centers (name, description, is_active, accounting_class, center_type)
values ('Medellín', 'Oficina principal Medellín (Administración - Clase 5)', true, 5, 'administracion')
on conflict (name) do update
  set accounting_class = 5,
      center_type = 'administracion',
      is_active = true;

-- ---------------------------------------------------------------------
-- 2. PLAN ÚNICO DE CUENTAS (chart_of_accounts)
-- ---------------------------------------------------------------------
create table if not exists public.chart_of_accounts (
  code                  text primary key,
  name                  text not null,
  account_class         int not null check (account_class between 1 and 9),
  level                 text not null check (level in ('clase', 'grupo', 'cuenta', 'subcuenta')),
  parent_code           text references public.chart_of_accounts(code),
  nature                text not null check (nature in ('debito', 'credito')),
  is_postable           boolean not null default false,
  requires_third_party  boolean not null default true,
  requires_cost_center  boolean not null default false,
  default_tax_concept   text check (default_tax_concept in ('compras', 'servicios', 'honorarios', 'arrendamientos', 'ninguno')),
  keywords              text[] not null default '{}',
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

alter table public.chart_of_accounts enable row level security;

drop policy if exists chart_of_accounts_read on public.chart_of_accounts;
create policy chart_of_accounts_read on public.chart_of_accounts
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

drop policy if exists chart_of_accounts_insert on public.chart_of_accounts;
create policy chart_of_accounts_insert on public.chart_of_accounts
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria'));

drop policy if exists chart_of_accounts_update on public.chart_of_accounts;
create policy chart_of_accounts_update on public.chart_of_accounts
  for update to authenticated
  using (public.has_role('admin', 'tesoreria'))
  with check (public.has_role('admin', 'tesoreria'));

-- Siembra PUC Decreto 2650 Clases 1 a 6 y Cuentas de Sección B
insert into public.chart_of_accounts (code, name, account_class, level, parent_code, nature, is_postable, requires_third_party, requires_cost_center, default_tax_concept, keywords)
values
  -- CLASES
  ('1', 'ACTIVO', 1, 'clase', null, 'debito', false, false, false, 'ninguno', '{}'),
  ('2', 'PASIVO', 2, 'clase', null, 'credito', false, false, false, 'ninguno', '{}'),
  ('3', 'PATRIMONIO', 3, 'clase', null, 'credito', false, false, false, 'ninguno', '{}'),
  ('4', 'INGRESOS', 4, 'clase', null, 'credito', false, false, false, 'ninguno', '{}'),
  ('5', 'GASTOS', 5, 'clase', null, 'debito', false, false, true, 'ninguno', '{}'),
  ('6', 'COSTOS DE VENTAS Y DE PRESTACIÓN DE SERVICIOS', 6, 'clase', null, 'debito', false, false, true, 'ninguno', '{}'),

  -- CLASE 1: ACTIVO
  ('11', 'DISPONIBLE', 1, 'grupo', '1', 'debito', false, false, false, 'ninguno', '{}'),
  ('1105', 'CAJA', 1, 'cuenta', '11', 'debito', false, false, false, 'ninguno', '{}'),
  ('110505', 'CAJA GENERAL', 1, 'subcuenta', '1105', 'debito', true, false, false, 'ninguno', array['caja general', 'efectivo oficina']),
  ('110510', 'CAJA MENOR', 1, 'subcuenta', '1105', 'debito', true, false, false, 'ninguno', array['caja menor', 'reembolso caja', 'recarga caja']),
  ('1110', 'BANCOS', 1, 'cuenta', '11', 'debito', false, false, false, 'ninguno', '{}'),
  ('111005', 'BANCOS', 1, 'subcuenta', '1110', 'debito', true, false, false, 'ninguno', array['bancos', 'transferencia', 'bancolombia', 'nequi', 'daviplata', 'pse']),
  ('13', 'DEUDORES', 1, 'grupo', '1', 'debito', false, true, false, 'ninguno', '{}'),
  ('1305', 'CLIENTES', 1, 'cuenta', '13', 'debito', false, true, false, 'ninguno', '{}'),
  ('130505', 'CLIENTES NACIONALES', 1, 'subcuenta', '1305', 'debito', true, true, false, 'ninguno', array['clientes', 'cartera']),
  ('1355', 'ANTICIPO DE IMPUESTOS Y CONTRIBUCIONES', 1, 'cuenta', '13', 'debito', false, true, false, 'ninguno', '{}'),
  ('135515', 'RETENCIÓN EN LA FUENTE A FAVOR', 1, 'subcuenta', '1355', 'debito', true, true, false, 'ninguno', array['autorretencion', 'retefuente a favor']),
  ('15', 'PROPIEDADES, PLANTA Y EQUIPO', 1, 'grupo', '1', 'debito', false, true, false, 'ninguno', '{}'),
  ('1524', 'EQUIPO DE OFICINA', 1, 'cuenta', '15', 'debito', false, true, false, 'compras', '{}'),
  ('152405', 'MUEBLES Y ENSERES', 1, 'subcuenta', '1524', 'debito', true, true, false, 'compras', array['muebles', 'silla', 'escritorio', 'archivador']),
  ('1528', 'EQUIPO DE COMPUTACIÓN Y COMUNICACIÓN', 1, 'cuenta', '15', 'debito', false, true, false, 'compras', '{}'),
  ('152805', 'EQUIPOS DE PROCESAMIENTO DE DATOS', 1, 'subcuenta', '1528', 'debito', true, true, false, 'compras', array['computador', 'portatil', 'impresora', 'monitor', 'celular']),

  -- CLASE 2: PASIVO
  ('21', 'OBLIGACIONES FINANCIERAS', 2, 'grupo', '2', 'credito', false, true, false, 'ninguno', '{}'),
  ('2105', 'BANCOS NACIONALES / PROVEEDORES BIENES', 2, 'cuenta', '21', 'credito', false, true, false, 'ninguno', '{}'),
  ('210505', 'PROVEEDORES', 2, 'subcuenta', '2105', 'credito', true, true, false, 'compras', array['proveedores', 'compra de bienes', 'insumos', 'materiales']),
  ('22', 'PROVEEDORES NACIONALES ESTÁNDAR', 2, 'grupo', '2', 'credito', false, true, false, 'ninguno', '{}'),
  ('2205', 'PROVEEDORES NACIONALES', 2, 'cuenta', '22', 'credito', false, true, false, 'ninguno', '{}'),
  ('220505', 'PROVEEDORES NACIONALES DE INSUMOS', 2, 'subcuenta', '2205', 'credito', true, true, false, 'compras', '{}'),
  ('23', 'CUENTAS POR PAGAR', 2, 'grupo', '2', 'credito', false, true, false, 'ninguno', '{}'),
  ('2305', 'CUENTAS CORRIENTES COMERCIALES / GASTOS', 2, 'cuenta', '23', 'credito', false, true, false, 'ninguno', '{}'),
  ('230505', 'GASTOS', 2, 'subcuenta', '2305', 'credito', true, true, false, 'servicios', array['cuentas por pagar gastos', 'servicios por pagar']),
  ('2335', 'COSTOS Y GASTOS POR PAGAR', 2, 'cuenta', '23', 'credito', false, true, false, 'servicios', '{}'),
  ('233595', 'OTROS COSTOS Y GASTOS POR PAGAR', 2, 'subcuenta', '2335', 'credito', true, true, false, 'servicios', '{}'),
  ('2365', 'RETENCIÓN EN LA FUENTE', 2, 'cuenta', '23', 'credito', false, true, false, 'ninguno', '{}'),
  ('236515', 'RETENCIÓN EN LA FUENTE — HONORARIOS', 2, 'subcuenta', '2365', 'credito', true, true, false, 'honorarios', array['retencion honorarios']),
  ('236525', 'RETENCIÓN EN LA FUENTE — SERVICIOS', 2, 'subcuenta', '2365', 'credito', true, true, false, 'servicios', array['retencion servicios']),
  ('236530', 'RETENCIÓN EN LA FUENTE — ARRENDAMIENTOS', 2, 'subcuenta', '2365', 'credito', true, true, false, 'arrendamientos', array['retencion arrendamientos']),
  ('236540', 'RETENCIÓN EN LA FUENTE — COMPRAS', 2, 'subcuenta', '2365', 'credito', true, true, false, 'compras', array['retencion compras']),
  ('24', 'IMPUESTOS, GRAVÁMENES Y TASAS', 2, 'grupo', '2', 'credito', false, false, false, 'ninguno', '{}'),
  ('2408', 'IMPUESTO SOBRE LAS VENTAS POR PAGAR', 2, 'cuenta', '24', 'credito', false, false, false, 'ninguno', '{}'),
  ('240805', 'IVA GENERADO EN VENTAS', 2, 'subcuenta', '2408', 'credito', true, true, false, 'ninguno', array['iva generado']),
  ('240810', 'IVA DESCONTABLE', 2, 'subcuenta', '2408', 'debito', true, true, false, 'ninguno', array['iva descontable', 'iva compras']),

  -- CLASE 3: PATRIMONIO
  ('31', 'CAPITAL SOCIAL', 3, 'grupo', '3', 'credito', false, false, false, 'ninguno', '{}'),
  ('3105', 'CAPITAL SUSCRITO Y PAGADO', 3, 'cuenta', '31', 'credito', false, false, false, 'ninguno', '{}'),
  ('310505', 'CAPITAL AUTORIZADO', 3, 'subcuenta', '3105', 'credito', true, false, false, 'ninguno', '{}'),
  ('36', 'RESULTADOS DEL EJERCICIO', 3, 'grupo', '3', 'credito', false, false, false, 'ninguno', '{}'),
  ('3605', 'UTILIDAD DEL EJERCICIO', 3, 'cuenta', '36', 'credito', false, false, false, 'ninguno', '{}'),
  ('360505', 'UTILIDAD DEL EJERCICIO', 3, 'subcuenta', '3605', 'credito', true, false, false, 'ninguno', '{}'),

  -- CLASE 4: INGRESOS
  ('41', 'OPERACIONALES', 4, 'grupo', '4', 'credito', false, true, false, 'ninguno', '{}'),
  ('4135', 'COMERCIO Y ASESORÍAS URBANAS', 4, 'cuenta', '41', 'credito', false, true, false, 'ninguno', '{}'),
  ('413505', 'VENTAS', 4, 'subcuenta', '4135', 'credito', true, true, false, 'ninguno', array['ventas', 'asesoria urbana', 'licencia', 'tramite urbanistico', 'desenglobe', 'reglamento propiedad horizontal']),
  ('42', 'NO OPERACIONALES', 4, 'grupo', '4', 'credito', false, true, false, 'ninguno', '{}'),
  ('4210', 'FINANCIEROS', 4, 'cuenta', '42', 'credito', false, true, false, 'ninguno', '{}'),
  ('421005', 'INTERESES Y RENDIMIENTOS FINANCIEROS', 4, 'subcuenta', '4210', 'credito', true, true, false, 'ninguno', '{}'),

  -- CLASE 5: GASTOS (Oficina Medellín y Cajas Menores Administrativas)
  ('51', 'OPERACIONALES DE ADMINISTRACIÓN', 5, 'grupo', '5', 'debito', false, true, true, 'ninguno', '{}'),
  ('5105', 'GASTOS DE PERSONAL', 5, 'cuenta', '51', 'debito', false, true, true, 'ninguno', '{}'),
  ('510506', 'SUELDOS Y SALARIOS ADMINISTRACIÓN', 5, 'subcuenta', '5105', 'debito', true, true, true, 'ninguno', array['nomina', 'sueldo', 'salario', 'quincena', 'liquidacion']),
  ('510595', 'OTROS GASTOS DE PERSONAL Y BIENESTAR', 5, 'subcuenta', '5105', 'debito', true, true, true, 'ninguno', array['dotacion', 'bienestar', 'seguridad social', 'aporte']),
  ('5110', 'HONORARIOS', 5, 'cuenta', '51', 'debito', false, true, true, 'honorarios', '{}'),
  ('511010', 'REVISORÍA FISCAL Y CONTABILIDAD', 5, 'subcuenta', '5110', 'debito', true, true, true, 'honorarios', array['contador', 'contabilidad', 'revisoria', 'asesoria contable', 'tributaria']),
  ('511025', 'ASESORÍA JURÍDICA Y TÉCNICA', 5, 'subcuenta', '5110', 'debito', true, true, true, 'honorarios', array['abogado', 'honorarios', 'asesoria juridica', 'arquitecto oficina', 'ingeniero', 'consultoria', 'protocolista']),
  ('511095', 'OTROS HONORARIOS', 5, 'subcuenta', '5110', 'debito', true, true, true, 'honorarios', array['otros honorarios', 'profesional']),
  ('5115', 'IMPUESTOS', 5, 'cuenta', '51', 'debito', false, true, true, 'ninguno', '{}'),
  ('511505', 'INDUSTRIA Y COMERCIO (ICA)', 5, 'subcuenta', '5115', 'debito', true, true, true, 'ninguno', array['industria y comercio', 'ica', 'impuesto municipal', 'predial']),
  ('511595', 'OTROS IMPUESTOS Y TASAS', 5, 'subcuenta', '5115', 'debito', true, true, true, 'ninguno', array['impuesto', 'estampilla', 'tasa']),
  ('5120', 'ARRENDAMIENTOS', 5, 'cuenta', '51', 'debito', false, true, true, 'arrendamientos', '{}'),
  ('512010', 'ARRENDAMIENTO DE CONSTRUCCIONES Y EDIFICACIONES', 5, 'subcuenta', '5120', 'debito', true, true, true, 'arrendamientos', array['arriendo', 'arrendamiento', 'canon', 'alquiler oficina', 'local']),
  ('512095', 'OTROS ARRENDAMIENTOS', 5, 'subcuenta', '5120', 'debito', true, true, true, 'arrendamientos', array['alquiler equipo']),
  ('5130', 'SEGUROS', 5, 'cuenta', '51', 'debito', false, true, true, 'ninguno', '{}'),
  ('513025', 'SEGUROS E INMUEBLES Y PÓLIZAS', 5, 'subcuenta', '5130', 'debito', true, true, true, 'ninguno', array['seguro', 'poliza', 'soat', 'sura']),
  ('5135', 'SERVICIOS', 5, 'cuenta', '51', 'debito', false, true, true, 'servicios', '{}'),
  ('513505', 'ASEO Y VIGILANCIA', 5, 'subcuenta', '5135', 'debito', true, true, true, 'servicios', array['aseo', 'limpieza', 'vigilancia', 'administracion edificio']),
  ('513525', 'ACUEDUCTO Y ALCANTARILLADO', 5, 'subcuenta', '5135', 'debito', true, true, true, 'ninguno', array['acueducto', 'agua']),
  ('513530', 'ENERGÍA ELÉCTRICA Y SERVICIOS PÚBLICOS', 5, 'subcuenta', '5135', 'debito', true, true, true, 'ninguno', array['epm', 'energia', 'luz', 'servicios publicos', 'empresas publicas']),
  ('513535', 'TELÉFONO, INTERNET Y COMUNICACIONES', 5, 'subcuenta', '5135', 'debito', true, true, true, 'servicios', array['internet', 'telefono', 'celular', 'claro', 'tigo', 'movistar', 'movil exito', 'une', 'comunicaciones', 'recarga']),
  ('513540', 'CORREO, PORTES Y MENSAJERÍA', 5, 'subcuenta', '5135', 'debito', true, true, true, 'servicios', array['mensajeria', 'domicilio', 'envia', 'servientrega', 'interrapidisimo', 'coordinadora', 'kairo', 'correo']),
  ('513550', 'TRANSPORTE, FLETES Y ACARREOS', 5, 'subcuenta', '5135', 'debito', true, true, true, 'servicios', array['transporte', 'taxi', 'uber', 'didi', 'bus', 'pasaje', 'peaje', 'parqueadero', 'gasolina', 'combustible', 'distracom', 'eds', 'flete']),
  ('513555', 'PUBLICIDAD, PROPAGANDA Y PROMOCIÓN', 5, 'subcuenta', '5135', 'debito', true, true, true, 'servicios', array['publicidad', 'marketing', 'meta', 'facebook', 'google ads', 'pauta', 'avisos', 'pendon', 'diseno']),
  ('513595', 'OTROS SERVICIOS ADMINISTRATIVOS', 5, 'subcuenta', '5135', 'debito', true, true, true, 'servicios', array['servicio tecnico', 'software', 'suscripcion', 'hosting', 'dominio']),
  ('5140', 'GASTOS LEGALES', 5, 'cuenta', '51', 'debito', false, true, true, 'ninguno', '{}'),
  ('514005', 'NOTARIALES', 5, 'subcuenta', '5140', 'debito', true, true, true, 'ninguno', array['notaria', 'autenticacion', 'escritura propia']),
  ('514010', 'REGISTRO MERCANTIL Y CÁMARA DE COMERCIO', 5, 'subcuenta', '5140', 'debito', true, true, true, 'ninguno', array['camara de comercio', 'registro mercantil', 'certificado existencia', 'certificado libertad', 'snr', 'supernotariado']),
  ('514015', 'TRÁMITES Y LICENCIAS ADMINISTRATIVAS', 5, 'subcuenta', '5140', 'debito', true, true, true, 'ninguno', array['curaduria', 'radicacion', 'catastro', 'planeacion', 'tramite']),
  ('514095', 'OTROS GASTOS LEGALES', 5, 'subcuenta', '5140', 'debito', true, true, true, 'ninguno', array['gasto legal']),
  ('5145', 'MANTENIMIENTO Y REPARACIONES', 5, 'cuenta', '51', 'debito', false, true, true, 'servicios', '{}'),
  ('514510', 'MANTENIMIENTO DE CONSTRUCCIONES Y OFICINA', 5, 'subcuenta', '5145', 'debito', true, true, true, 'servicios', array['mantenimiento', 'reparacion', 'arreglo', 'plomeria', 'electricista', 'cerrajeria', 'pintura oficina']),
  ('514520', 'MANTENIMIENTO DE EQUIPO DE OFICINA Y CÓMPUTO', 5, 'subcuenta', '5145', 'debito', true, true, true, 'servicios', array['mantenimiento computador', 'mantenimiento impresora', 'reparacion equipo']),
  ('5155', 'GASTOS DE VIAJE', 5, 'cuenta', '51', 'debito', false, true, true, 'servicios', '{}'),
  ('515505', 'ALOJAMIENTO Y MANUTENCIÓN DE VIAJE', 5, 'subcuenta', '5155', 'debito', true, true, true, 'servicios', array['hotel', 'hospedaje', 'viaticos', 'viaje']),
  ('515515', 'PASAJES AÉREOS Y TERRESTRES', 5, 'subcuenta', '5155', 'debito', true, true, true, 'servicios', array['tiquete', 'vuelo', 'avianca', 'latam', 'wingo', 'pasaje aereo']),
  ('5195', 'DIVERSOS', 5, 'cuenta', '51', 'debito', false, true, true, 'compras', '{}'),
  ('519520', 'GASTOS DE REPRESENTACIÓN Y RELACIONES PÚBLICAS', 5, 'subcuenta', '5195', 'debito', true, true, true, 'servicios', array['atencion clientes', 'reunion clientes']),
  ('519525', 'ELEMENTOS DE ASEO Y CAFETERÍA', 5, 'subcuenta', '5195', 'debito', true, true, true, 'compras', array['cafeteria', 'cafe', 'agua', 'implementos aseo', 'papel higienico', 'jabon', 'exito', 'd1', 'ara', 'euro', 'supermercado', 'almuerzo', 'restaurante', 'refrigerio']),
  ('519530', 'ÚTILES, PAPELERÍA Y FOTOCOPIAS', 5, 'subcuenta', '5195', 'debito', true, true, true, 'compras', array['papeleria', 'planos', 'impresion', 'fotocopia', 'ciber color', 'plotter', 'carpeta', 'resma', 'toner', 'tinta', 'lapicero', 'sello']),
  ('519595', 'OTROS GASTOS DIVERSOS DE ADMINISTRACIÓN', 5, 'subcuenta', '5195', 'debito', true, true, true, 'compras', array['otros gastos', 'varios oficina']),
  ('53', 'NO OPERACIONALES', 5, 'grupo', '5', 'debito', false, true, true, 'ninguno', '{}'),
  ('5305', 'FINANCIEROS', 5, 'cuenta', '53', 'debito', false, true, true, 'ninguno', '{}'),
  ('530505', 'GASTOS BANCARIOS Y COMISIONES', 5, 'subcuenta', '5305', 'debito', true, true, true, 'ninguno', array['cuota manejo', 'comision bancaria', 'gmf', '4x1000', 'intereses', 'tarjeta credito', 'tc amex', 'gm financial', 'credito']),
  ('5315', 'GASTOS EXTRAORDINARIOS Y NO DEDUCIBLES', 5, 'cuenta', '53', 'debito', false, true, true, 'ninguno', '{}'),
  ('531595', 'GASTOS NO DEDUCIBLES', 5, 'subcuenta', '5315', 'debito', true, true, true, 'ninguno', array['personal', 'salud', 'terapia', 'medico', 'farmacia', 'mercado personal', 'ropa', 'papi', 'cuenta del papi', 'andrea', 'colegio', 'mascota', 'no deducible']),

  -- CLASE 6: COSTOS (Obras en curso: Tolú, Apto Bello y Pagos Notariales de clientes)
  ('61', 'COSTO DE VENTAS Y DE PRESTACIÓN DE SERVICIOS', 6, 'grupo', '6', 'debito', false, true, true, 'compras', '{}'),
  ('6120', 'CONSTRUCCIÓN Y ADECUACIÓN DE OBRAS', 6, 'cuenta', '61', 'debito', false, true, true, 'compras', '{}'),
  ('612005', 'MATERIALES DE CONSTRUCCIÓN Y FERRETERÍA', 6, 'subcuenta', '6120', 'debito', true, true, true, 'compras', array['cemento', 'arena', 'hierro', 'varilla', 'ladrillo', 'bloque', 'adobe', 'ferreteria', 'tuberia', 'pvc', 'pintura', 'pintucolor', 'pinvicolor', 'estuco', 'enchape', 'ceramica', 'porcelanato', 'drywall', 'madera', 'cable', 'alambre', 'homecenter', ' tornillos', 'insumos']),
  ('612010', 'COSTOS DE OBRA Y CONSTRUCCIÓN (GENERAL)', 6, 'subcuenta', '6120', 'debito', true, true, true, 'compras', array['obra', 'construccion', 'adecuacion', 'remodelacion', 'anticipo obra', 'avance obra']),
  ('612015', 'MANO DE OBRA Y CONTRATISTAS DE OBRA', 6, 'subcuenta', '6120', 'debito', true, true, true, 'servicios', array['mano de obra', 'contratista', 'oficial', 'ayudante', 'maestro', 'albanil', 'plomero', 'electricista obra', 'instalacion', 'jornal']),
  ('612020', 'CARPINTERÍA, PUERTAS, VENTANERÍA Y ACABADOS', 6, 'subcuenta', '6120', 'debito', true, true, true, 'compras', array['puerta', 'puertas', 'ventana', 'vidrio', 'aluminio', 'carpinteria', 'closet', 'cocina', 'meson', 'granito', 'acabados']),
  ('612025', 'TRANSPORTE, FLETES Y ACARREOS DE OBRA', 6, 'subcuenta', '6120', 'debito', true, true, true, 'servicios', array['flete obra', 'acarreo', 'volqueta', 'escombros', 'transporte material', 'transportes tolu']),
  ('612030', 'ESTUDIOS TÉCNICOS, TOPOGRAFÍA Y DISEÑOS DE OBRA', 6, 'subcuenta', '6120', 'debito', true, true, true, 'honorarios', array['topografia', 'levantamiento', 'estudio suelos', 'calculo estructural', 'diseno arquitectonico']),
  ('612095', 'OTROS COSTOS DE CONSTRUCCIÓN Y OBRA', 6, 'subcuenta', '6120', 'debito', true, true, true, 'compras', array['otros costos obra', 'varios obra']),
  ('6155', 'COSTOS DE TRÁMITES URBANÍSTICOS, NOTARIALES Y REGISTRO', 6, 'cuenta', '61', 'debito', false, true, true, 'servicios', '{}'),
  ('615505', 'DERECHOS DE CURADURÍA Y LICENCIAS DE PROYECTO', 6, 'subcuenta', '6155', 'debito', true, true, true, 'servicios', array['expensas curaduria', 'licencia construccion', 'impuesto delineacion']),
  ('615595', 'GASTOS NOTARIALES Y DE REGISTRO ASUMIDOS (SOPORTE TERCERO)', 6, 'subcuenta', '6155', 'debito', true, true, true, 'ninguno', array['notarial', 'beneficencia', 'rentas departamentales', 'boleta fiscal', 'registro instrumentos publicos', 'escrituracion cliente', 'protocolo'])
on conflict (code) do update
  set name = excluded.name,
      account_class = excluded.account_class,
      level = excluded.level,
      parent_code = excluded.parent_code,
      nature = excluded.nature,
      is_postable = excluded.is_postable,
      requires_third_party = excluded.requires_third_party,
      requires_cost_center = excluded.requires_cost_center,
      default_tax_concept = excluded.default_tax_concept,
      keywords = excluded.keywords,
      is_active = true;

-- ---------------------------------------------------------------------
-- 3. TERCEROS UNIFICADOS (third_parties) Y FUSIÓN DE SUPPLIERS
-- ---------------------------------------------------------------------
create table if not exists public.third_parties (
  id                   uuid primary key default gen_random_uuid(),
  legacy_supplier_id   uuid unique,
  merged_supplier_ids  uuid[] not null default '{}',
  name                 text not null,
  nit_normalized       text,
  dv                   text,
  document_number      text,
  document_type        text not null default 'NIT' check (document_type in ('NIT', 'CC', 'CE', 'OTRO')),
  is_dv_valid          boolean not null default false,
  has_rut              boolean not null default false,
  is_billing_obligated boolean not null default true,
  is_occasional        boolean not null default false,
  email                text,
  phone                text,
  address              text,
  default_account_code text references public.chart_of_accounts(code),
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_third_parties_nit on public.third_parties(nit_normalized);
create index if not exists idx_third_parties_name_trgm on public.third_parties using gin (name gin_trgm_ops);

alter table public.third_parties enable row level security;

drop policy if exists third_parties_read on public.third_parties;
create policy third_parties_read on public.third_parties
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

drop policy if exists third_parties_insert on public.third_parties;
create policy third_parties_insert on public.third_parties
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria', 'asesor'));

drop policy if exists third_parties_update on public.third_parties;
create policy third_parties_update on public.third_parties
  for update to authenticated
  using (public.has_role('admin', 'tesoreria'))
  with check (public.has_role('admin', 'tesoreria'));

alter table public.purchases
  add column if not exists third_party_id uuid references public.third_parties(id);

alter table public.petty_cash_entries
  add column if not exists third_party_id uuid references public.third_parties(id);

alter table public.sales
  add column if not exists third_party_id uuid references public.third_parties(id);

create index if not exists idx_purchases_third_party on public.purchases(third_party_id);
create index if not exists idx_petty_cash_entries_third_party on public.petty_cash_entries(third_party_id);
create index if not exists idx_sales_third_party on public.sales(third_party_id);

-- ---------------------------------------------------------------------
-- 4. PARÁMETROS TRIBUTARIOS 2026 (tax_parameters — Sección B)
-- ---------------------------------------------------------------------
create table if not exists public.tax_parameters (
  id           uuid primary key default gen_random_uuid(),
  year         int not null default 2026,
  concept      text not null check (concept in ('compras', 'servicios', 'honorarios', 'arrendamientos')),
  uvt_value    numeric(12,2) not null default 52374,
  min_base_uvt numeric(8,2) not null,
  min_base_cop numeric(14,2) not null,
  rate_pct     numeric(6,3) not null,
  account_code text not null references public.chart_of_accounts(code),
  valid_from   date not null,
  valid_to     date not null,
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (concept, valid_from, valid_to)
);

alter table public.tax_parameters enable row level security;

drop policy if exists tax_parameters_read on public.tax_parameters;
create policy tax_parameters_read on public.tax_parameters
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

drop policy if exists tax_parameters_write on public.tax_parameters;
create policy tax_parameters_write on public.tax_parameters
  for all to authenticated
  using (public.has_role('admin', 'tesoreria'))
  with check (public.has_role('admin', 'tesoreria'));

insert into public.tax_parameters (year, concept, uvt_value, min_base_uvt, min_base_cop, rate_pct, account_code, valid_from, valid_to, notes)
values
  -- Compras (2.5% -> 236540): 10 UVT ene 1 - may 7; 27 UVT may 8 - jun 30; 10 UVT jul 1 - dic 31
  (2026, 'compras', 52374, 10, 523740, 2.500, '236540', '2026-01-01', '2026-05-07', 'Compras generales 10 UVT (Ene 1 a May 7 de 2026)'),
  (2026, 'compras', 52374, 27, 1414098, 2.500, '236540', '2026-05-08', '2026-06-30', 'Compras generales 27 UVT (May 8 a Jun 30 de 2026)'),
  (2026, 'compras', 52374, 10, 523740, 2.500, '236540', '2026-07-01', '2026-12-31', 'Compras generales 10 UVT (Jul 1 a Dic 31 de 2026)'),
  -- Servicios (4.0% -> 236525): 2 UVT ene 1 - may 7; 4 UVT may 8 - jun 30; 2 UVT jul 1 - dic 31
  (2026, 'servicios', 52374, 2, 104748, 4.000, '236525', '2026-01-01', '2026-05-07', 'Servicios en general 2 UVT (Ene 1 a May 7 de 2026)'),
  (2026, 'servicios', 52374, 4, 209496, 4.000, '236525', '2026-05-08', '2026-06-30', 'Servicios en general 4 UVT (May 8 a Jun 30 de 2026)'),
  (2026, 'servicios', 52374, 2, 104748, 4.000, '236525', '2026-07-01', '2026-12-31', 'Servicios en general 2 UVT (Jul 1 a Dic 31 de 2026)'),
  -- Honorarios (11.0% -> 236515): desde 0 UVT
  (2026, 'honorarios', 52374, 0, 0, 11.000, '236515', '2026-01-01', '2026-12-31', 'Honorarios y comisiones 11% (sin cuantía mínima)'),
  -- Arrendamientos de inmuebles (3.5% -> 236530): 27 UVT
  (2026, 'arrendamientos', 52374, 27, 1414098, 3.500, '236530', '2026-01-01', '2026-12-31', 'Arrendamiento de bienes raíces 3.5% (27 UVT)')
on conflict (concept, valid_from, valid_to) do update
  set uvt_value = excluded.uvt_value,
      min_base_uvt = excluded.min_base_uvt,
      min_base_cop = excluded.min_base_cop,
      rate_pct = excluded.rate_pct,
      account_code = excluded.account_code,
      notes = excluded.notes;

-- ---------------------------------------------------------------------
-- 5. CUENTAS DE PAGO Y PARAMETRIZACIÓN DE FIRMAS (payment_accounts, accounting_settings)
-- ---------------------------------------------------------------------
create table if not exists public.payment_accounts (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  payment_method public.payment_method,
  account_code   text not null references public.chart_of_accounts(code),
  is_default     boolean not null default false,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table public.payment_accounts enable row level security;

drop policy if exists payment_accounts_read on public.payment_accounts;
create policy payment_accounts_read on public.payment_accounts
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

drop policy if exists payment_accounts_write on public.payment_accounts;
create policy payment_accounts_write on public.payment_accounts
  for all to authenticated
  using (public.has_role('admin', 'tesoreria'))
  with check (public.has_role('admin', 'tesoreria'));

insert into public.payment_accounts (name, payment_method, account_code, is_default, is_active)
values
  ('Bancos Principal (Transferencia)', 'transferencia', '111005', true, true),
  ('Bancos Tarjeta', 'tarjeta', '111005', false, true),
  ('Bancos Nequi', 'nequi', '111005', false, true),
  ('Bancos Daviplata', 'daviplata', '111005', false, true),
  ('Bancos PSE', 'pse', '111005', false, true),
  ('Caja General (Efectivo)', 'efectivo', '110505', false, true),
  ('Caja Menor', 'otro', '110510', false, true)
on conflict (name) do update
  set account_code = excluded.account_code,
      payment_method = excluded.payment_method,
      is_default = excluded.is_default;

create table if not exists public.accounting_settings (
  id           int primary key default 1 check (id = 1),
  company_name text not null default 'KC Asesorías Urbanas S.A.S',
  company_nit  text not null default '902012620-0',
  reviso_name  text not null default 'Contador',
  aprobo_name  text not null default 'Representante legal',
  updated_at   timestamptz not null default now()
);

alter table public.accounting_settings enable row level security;

drop policy if exists accounting_settings_read on public.accounting_settings;
create policy accounting_settings_read on public.accounting_settings
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

drop policy if exists accounting_settings_write on public.accounting_settings;
create policy accounting_settings_write on public.accounting_settings
  for all to authenticated
  using (public.has_role('admin', 'tesoreria'))
  with check (public.has_role('admin', 'tesoreria'));

insert into public.accounting_settings (id, company_name, company_nit, reviso_name, aprobo_name)
values (1, 'KC Asesorías Urbanas S.A.S', '902012620-0', 'Contador', 'Representante legal')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 6. REGLAS DE CONTABILIZACIÓN (posting_rules: manual / aprendida)
-- ---------------------------------------------------------------------
create table if not exists public.posting_rules (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  source                   text not null default 'manual' check (source in ('manual', 'aprendida')),
  priority                 int not null default 100,
  cost_center_id           uuid references public.cost_centers(id),
  account_class            int check (account_class in (5, 6)),
  nit_normalized           text,
  keyword_pattern          text not null,
  debit_account_code       text not null references public.chart_of_accounts(code),
  credit_account_code      text references public.chart_of_accounts(code),
  tax_concept              text check (tax_concept in ('compras', 'servicios', 'honorarios', 'arrendamientos', 'ninguno')),
  is_deductible            boolean not null default true,
  mark_personal            boolean not null default false,
  mark_third_party_support boolean not null default false,
  mark_possible_asset      boolean not null default false,
  is_active                boolean not null default true,
  created_at               timestamptz not null default now()
);

alter table public.posting_rules enable row level security;

drop policy if exists posting_rules_read on public.posting_rules;
create policy posting_rules_read on public.posting_rules
  for select to authenticated
  using (public.has_role('admin', 'tesoreria', 'asesor'));

drop policy if exists posting_rules_write on public.posting_rules;
create policy posting_rules_write on public.posting_rules
  for all to authenticated
  using (public.has_role('admin', 'tesoreria'))
  with check (public.has_role('admin', 'tesoreria'));

insert into public.posting_rules (name, source, priority, account_class, keyword_pattern, debit_account_code, credit_account_code, tax_concept, is_deductible, mark_personal, mark_third_party_support, mark_possible_asset)
values
  ('Gastos personales / familiares / no deducibles', 'manual', 10, null, 'terapia|salud|papi|cuenta del papi|colegio|mercado personal|andrea|restaurante personal|ropa|medico|odontolog', '531595', '230505', 'ninguno', false, true, false, false),
  ('Pagos notariales, rentas y registro a nombre de clientes', 'manual', 15, null, 'notaria|notarial|rentas|beneficencia|boleta fiscal|registro instrumentos|protocolo|escritura|supernotariado|snr', '615595', '230505', 'ninguno', true, false, true, false),
  ('Servicios públicos oficina (EPM, energía, acueducto)', 'manual', 20, 5, 'epm|empresas publicas|energia|acueducto|luz|servicios publicos', '513530', '230505', 'ninguno', true, false, false, false),
  ('Telecomunicaciones e internet oficina', 'manual', 25, 5, 'claro|tigo|movistar|movil exito|internet|telefono|celular|une|recarga', '513535', '230505', 'servicios', true, false, false, false),
  ('Papelería, planos, copias e impresiones oficina', 'manual', 30, 5, 'plano|planos|impresion|fotocopia|papeleria|ciber color|plotter|resma|toner|carpeta', '519530', '210505', 'compras', true, false, false, false),
  ('Arrendamiento oficina', 'manual', 30, 5, 'arriendo|arrendamiento|canon|alquiler local|alquiler oficina', '512010', '230505', 'arrendamientos', true, false, false, false),
  ('Honorarios profesionales y asesorías oficina', 'manual', 35, 5, 'honorarios|abogado|contador|contabilidad|asesoria|consultoria|protocolista|arquitecto|ingeniero', '511025', '230505', 'honorarios', true, false, false, false),
  ('Transporte, gasolina, peajes y parqueaderos oficina', 'manual', 40, 5, 'taxi|uber|didi|peaje|parqueadero|gasolina|combustible|distracom|eds|pasaje|bus|transporte', '513550', '230505', 'servicios', true, false, false, false),
  ('Mensajería, correo y domicilios oficina', 'manual', 40, 5, 'mensajeria|domicilio|envia|servientrega|interrapidisimo|coordinadora|kairo|correo', '513540', '230505', 'servicios', true, false, false, false),
  ('Cafetería, aseo y atención en oficina', 'manual', 45, 5, 'cafeteria|cafe|aseo|limpieza|almuerzo|refrigerio|supermercado|exito|d1|ara|agua', '519525', '210505', 'compras', true, false, false, false),
  ('Gastos bancarios, tarjetas y financieros', 'manual', 45, 5, 'comision|cuota manejo|tc amex|gm financial|bancolombia|4x1000|gmf|intereses|credito', '530505', '230505', 'ninguno', true, false, false, false),
  ('Trámites curaduría, catastro y cámara de comercio (oficina)', 'manual', 45, 5, 'curaduria|catastro|camara de comercio|certificado libertad|planeacion|radicacion', '514015', '230505', 'ninguno', true, false, false, false),
  ('Materiales de construcción, ferretería y pinturas (Obras)', 'manual', 20, 6, 'cemento|arena|hierro|varilla|ladrillo|bloque|adobe|ferreteria|tuberia|pvc|pintura|pintucolor|pinvicolor|estuco|enchape|ceramica|porcelanato|drywall|madera|cable|alambre|homecenter|tornillo|insumo|material', '612005', '210505', 'compras', true, false, false, false),
  ('Mano de obra, contratistas y jornales (Obras)', 'manual', 25, 6, 'mano de obra|contratista|oficial|ayudante|maestro|albanil|plomero|electricista|instalacion|jornal|avance|estuco|pintor|revite|revoque', '612015', '230505', 'servicios', true, false, false, false),
  ('Puertas, ventanas, carpintería y acabados (Obras)', 'manual', 30, 6, 'puerta|puertas|ventana|vidrio|aluminio|carpinteria|closet|cocina|meson|granito|acabado|cerradura', '612020', '210505', 'compras', true, false, false, false),
  ('Transporte de materiales, fletes y escombros (Obras)', 'manual', 35, 6, 'flete|acarreo|volqueta|escombro|transporte|transportes tolu|peaje|combustible|gasolina', '612025', '230505', 'servicios', true, false, false, false),
  ('Topografía, estudios y diseños técnicos (Obras)', 'manual', 35, 6, 'topografia|levantamiento|estudio suelos|calculo|diseno|arquitecto|planos obra', '612030', '230505', 'honorarios', true, false, false, false)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 7. COMPROBANTES CONTABLES Y LÍNEAS (journal_entries, journal_lines, classification_feedback)
-- ---------------------------------------------------------------------
create table if not exists public.journal_entries (
  id                     uuid primary key default gen_random_uuid(),
  entry_number           text not null unique,
  entry_type             text not null check (entry_type in ('CC', 'CE', 'RC', 'NC')),
  entry_date             date not null,
  status                 text not null default 'borrador' check (status in ('borrador', 'contabilizado', 'anulado')),
  source_table           text not null,
  source_id              uuid not null,
  linked_entry_id        uuid references public.journal_entries(id),
  reversed_entry_id      uuid references public.journal_entries(id),
  third_party_id         uuid references public.third_parties(id),
  cost_center_id         uuid references public.cost_centers(id),
  concept                text not null,
  total_debit            numeric(14,2) not null default 0,
  total_credit           numeric(14,2) not null default 0,
  ai_confidence          numeric(5,4) not null default 1.0,
  ai_rationale           text,
  needs_review           boolean not null default false,
  is_personal_expense    boolean not null default false,
  is_third_party_support boolean not null default false,
  is_possible_asset      boolean not null default false,
  withholding_expected   numeric(14,2) not null default 0,
  withholding_applied    numeric(14,2) not null default 0,
  missing_withholding    boolean not null default false,
  support_url            text,
  created_by             uuid references public.profiles(id),
  elaboro_name           text not null default 'Sistema KC',
  reviso_name            text not null default 'Contador',
  aprobo_name            text not null default 'Representante legal',
  posted_at              timestamptz,
  posted_by              uuid references public.profiles(id),
  voided_at              timestamptz,
  voided_by              uuid references public.profiles(id),
  void_reason            text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (source_table, source_id, entry_type)
);

create index if not exists idx_journal_entries_date_type_num on public.journal_entries(entry_date, entry_type, entry_number);
create index if not exists idx_journal_entries_status on public.journal_entries(status);
create index if not exists idx_journal_entries_third_party on public.journal_entries(third_party_id);
create index if not exists idx_journal_entries_cost_center on public.journal_entries(cost_center_id);
create index if not exists idx_journal_entries_source on public.journal_entries(source_table, source_id);
create index if not exists idx_journal_entries_linked on public.journal_entries(linked_entry_id);

create table if not exists public.journal_lines (
  id              uuid primary key default gen_random_uuid(),
  entry_id        uuid not null references public.journal_entries(id) on delete cascade,
  line_order      int not null default 1,
  account_code    text not null references public.chart_of_accounts(code),
  third_party_id  uuid references public.third_parties(id),
  cost_center_id  uuid references public.cost_centers(id),
  description     text,
  debit           numeric(14,2) not null default 0 check (debit >= 0),
  credit          numeric(14,2) not null default 0 check (credit >= 0),
  base_amount     numeric(14,2) not null default 0,
  is_deductible   boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists idx_journal_lines_entry on public.journal_lines(entry_id);
create index if not exists idx_journal_lines_account on public.journal_lines(account_code);
create index if not exists idx_journal_lines_third_party on public.journal_lines(third_party_id);
create index if not exists idx_journal_lines_cost_center on public.journal_lines(cost_center_id);

create table if not exists public.classification_feedback (
  id                     uuid primary key default gen_random_uuid(),
  entry_id               uuid references public.journal_entries(id),
  source_table           text,
  source_id              uuid,
  third_party_id         uuid references public.third_parties(id),
  nit_normalized         text,
  cost_center_id         uuid references public.cost_centers(id),
  concept                text not null,
  previous_account_code  text references public.chart_of_accounts(code),
  confirmed_account_code text not null references public.chart_of_accounts(code),
  created_rule_id        uuid references public.posting_rules(id),
  corrected_by           uuid references public.profiles(id),
  created_at             timestamptz not null default now()
);

create index if not exists idx_classification_feedback_nit on public.classification_feedback(nit_normalized);
create index if not exists idx_classification_feedback_third_party on public.classification_feedback(third_party_id);
create index if not exists idx_classification_feedback_concept_trgm on public.classification_feedback using gin (concept gin_trgm_ops);

alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.classification_feedback enable row level security;

-- RLS Contabilidad: ver/borradores/PDF -> admin y tesoreria; contabilizar/anular contabilizados -> solo admin
drop policy if exists journal_entries_read on public.journal_entries;
create policy journal_entries_read on public.journal_entries
  for select to authenticated
  using (public.has_role('admin', 'tesoreria'));

drop policy if exists journal_entries_insert on public.journal_entries;
create policy journal_entries_insert on public.journal_entries
  for insert to authenticated
  with check (
    public.has_role('admin', 'tesoreria')
    and (status = 'borrador' or public.has_role('admin'))
  );

drop policy if exists journal_entries_update on public.journal_entries;
create policy journal_entries_update on public.journal_entries
  for update to authenticated
  using (public.has_role('admin', 'tesoreria'))
  with check (
    (status = 'borrador' and public.has_role('admin', 'tesoreria'))
    or public.has_role('admin')
  );

drop policy if exists journal_lines_read on public.journal_lines;
create policy journal_lines_read on public.journal_lines
  for select to authenticated
  using (public.has_role('admin', 'tesoreria'));

drop policy if exists journal_lines_insert on public.journal_lines;
create policy journal_lines_insert on public.journal_lines
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria'));

drop policy if exists journal_lines_update on public.journal_lines;
create policy journal_lines_update on public.journal_lines
  for update to authenticated
  using (public.has_role('admin', 'tesoreria'))
  with check (public.has_role('admin', 'tesoreria'));

drop policy if exists journal_lines_delete on public.journal_lines;
create policy journal_lines_delete on public.journal_lines
  for delete to authenticated
  using (
    public.has_role('admin', 'tesoreria')
    and exists (
      select 1 from public.journal_entries je
      where je.id = entry_id and je.status = 'borrador'
    )
  );

drop policy if exists classification_feedback_read on public.classification_feedback;
create policy classification_feedback_read on public.classification_feedback
  for select to authenticated
  using (public.has_role('admin', 'tesoreria'));

drop policy if exists classification_feedback_insert on public.classification_feedback;
create policy classification_feedback_insert on public.classification_feedback
  for insert to authenticated
  with check (public.has_role('admin', 'tesoreria'));

-- ---------------------------------------------------------------------
-- 8. TRIGGERS DE INTEGRIDAD CONTABLE (Partida Doble e Inmutabilidad de Contabilizados)
-- ---------------------------------------------------------------------
create or replace function public.trg_validate_journal_entry()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_lines_debit numeric(14,2);
  v_lines_credit numeric(14,2);
  v_lines_count int;
  v_has_reversal boolean;
begin
  if tg_op = 'DELETE' then
    raise exception 'No se permite eliminar comprobantes contables (%; %). Use anulación.', old.entry_number, old.status;
  end if;

  if tg_op = 'UPDATE' then
    -- Si ya estaba contabilizado, no se puede editar salvo para anularlo con un comprobante de reverso (NC)
    if old.status = 'contabilizado' then
      if new.status <> 'anulado' then
        raise exception 'El comprobante % ya está contabilizado y es inmutable. Solo puede anularse mediante un reverso.', old.entry_number;
      end if;
      select exists (
        select 1 from public.journal_entries r
        where r.reversed_entry_id = old.id
      ) into v_has_reversal;
      if not v_has_reversal then
        raise exception 'Para anular el comprobante contabilizado % debe existir primero su comprobante de reverso (NC).', old.entry_number;
      end if;
    end if;
  end if;

  -- Al pasar a contabilizado, validar partida doble exacta (débitos = créditos > 0)
  if new.status = 'contabilizado' and (tg_op = 'INSERT' or old.status <> 'contabilizado') then
    select count(*), coalesce(sum(debit), 0), coalesce(sum(credit), 0)
    into v_lines_count, v_lines_debit, v_lines_credit
    from public.journal_lines
    where entry_id = new.id;

    if v_lines_count < 2 then
      raise exception 'El comprobante % requiere al menos 2 líneas para contabilizarse.', new.entry_number;
    end if;

    if v_lines_debit <= 0 or abs(v_lines_debit - v_lines_credit) > 0.01 then
      raise exception 'Partida doble inválida en %: Débitos ($%) != Créditos ($%).', new.entry_number, v_lines_debit, v_lines_credit;
    end if;

    new.total_debit := v_lines_debit;
    new.total_credit := v_lines_credit;
    new.posted_at := coalesce(new.posted_at, now());
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_journal_entries_integrity on public.journal_entries;
create trigger trg_journal_entries_integrity
  before update or delete on public.journal_entries
  for each row execute function public.trg_validate_journal_entry();

create or replace function public.trg_protect_posted_journal_lines()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status text;
  v_entry_id uuid;
begin
  v_entry_id := case when tg_op = 'DELETE' then old.entry_id else new.entry_id end;
  select status into v_status from public.journal_entries where id = v_entry_id;

  if v_status = 'contabilizado' then
    raise exception 'No se pueden modificar ni eliminar líneas de un comprobante contabilizado.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_journal_lines_protect on public.journal_lines;
create trigger trg_journal_lines_protect
  before insert or update or delete on public.journal_lines
  for each row execute function public.trg_protect_posted_journal_lines();

drop trigger if exists trg_audit_journal_entries on public.journal_entries;
create trigger trg_audit_journal_entries
  after insert or update or delete on public.journal_entries
  for each row execute function public.fn_audit_log_trigger();

drop trigger if exists trg_audit_third_parties on public.third_parties;
create trigger trg_audit_third_parties
  after insert or update or delete on public.third_parties
  for each row execute function public.fn_audit_log_trigger();
