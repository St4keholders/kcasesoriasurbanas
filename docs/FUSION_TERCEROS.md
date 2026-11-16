# Reporte de Migración y Fusión de Terceros (`suppliers` → `third_parties`)

Fecha de ejecución: `2026-11-16`

## 1. Resumen Ejecutivo

- **Proveedores originales en `suppliers`:** 463
- **Terceros unificados activos en `third_parties`:** 451
- **Grupos de duplicados fusionados:** 11
- **Registros secundarios desactivados (sin `DELETE`):** 12
- **Terceros con NIT y DV normalizado (Módulo 11 DIAN):** 276
- **Terceros pendientes de NIT/identificación fiscal:** 175
- **Tercero comodín único:** `Proveedor Ocasional` (`65e73bbc-f934-4c7e-a18d-76f3cdf6481f`)

## 2. Detalle de Grupos Fusionados

| Criterio | Clave | Nombre Canónico | ID Canónico | Variantes Fusionadas | Compras Reasignadas |
|---|---|---|---|---|---|
| **NIT** | `1000760895` | Valeria Ortega Uribe - Los Naranjos Deposito | `24383955-28fb-4602-a3d7-b3a964e23eb7` | Valeria Ortega Uribe - Los Naranjos Deposito / ORTEGA URIBE VALERIA | 2 |
| **NIT** | `1193379916` | Jose Antonio Guerrero Aviles | `8508cd79-b1e2-465a-a41d-39ab9fb364e3` | Jose Antonio Guerrero Aviles / Jos Antonio Guerrero Aviles | 5 |
| **NIT** | `900251553` | PINVICOLOR S. A. S | `3741187b-1c4c-447c-8354-0738541c0cae` | Pintucolor / PINVICOLOR S. A. S | 1 |
| **NIT** | `8824163151` | Pago Digital Simple | `60cc72c3-4df1-4cf3-bffe-c4b70cf5a03d` | Pago Digital Simple / Pago Digital | 0 |
| **NIT** | `1220468707` | Vergara Castaño, Andrea Carolina | `78748011-972c-4f3e-bccc-c529fe9b73d2` | Vergara Castaño, Andrea Carolina / KC ASESORIAS INMOBOLIDIARES / ANDREA CAROLINA VERGARA CASTAÑO | 3 |
| **NIT** | `890900608` | TEX CINE COLOMBIA S A | `72e982dd-ac1c-4fe8-829c-f81ddf623d91` | TEX CINE COLOMBIA S A / Móvil Éxito | 0 |
| **NOMBRE** | `almacenes exito s a` | ALMACENES EXITO S.A | `e5057130-d950-4346-a4cc-a00eb41c04de` | Almacenes Exito S.A / ALMACENES EXITO S.A | 1 |
| **NOMBRE** | `g patricia gallego` | G. Patricia Gallego | `d6cd38a6-86c7-462e-a19f-718cf99d3bc7` | G. PATRICIA GALLEGO / G. Patricia Gallego | 0 |
| **NOMBRE** | `bodega y ferreteria j y j sas` | Bodega Y Ferreteria J Y J SAS | `f6d5c275-47d9-4a8c-8082-e1baee547f98` | Bodega Y Ferreteria J Y J Sas / Bodega Y Ferreteria J Y J SAS | 2 |
| **NOMBRE** | `maria pureza montoya ospina` | Maria Pureza Montoya Ospina | `faca353a-2d8d-4dbb-8a91-83e24c27fbdc` | Maria Pureza Montoya Ospina  / Maria Pureza Montoya Ospina | 4 |
| **NOMBRE** | `juan de dios estrada valencia` | Juan de Dios Estrada Valencia | `5a6d67e9-5005-4523-9220-bf1c8fcbcd1f` | Juan de Dios Estrada Valencia / Juan de Dios Estrada Valencia | 3 |

## 3. Reglas Aplicadas

1. Se eliminó por completo el uso del NIT comodín `000000000` y `0` (55 registros que compartían `000000000` pero correspondían a personas o comercios distintos conservaron su identidad individual sin fusionarse erróneamente bajo un mismo NIT falso).
2. Los terceros que compartían un NIT real válido (≥ 6 dígitos) o el mismo nombre normalizado fueron consolidados en un único registro en `third_parties`, preservando todos los IDs originales en `merged_supplier_ids`.
3. Todas las compras (`purchases`) y movimientos de caja menor (`petty_cash_entries`) quedaron enlazados mediante `third_party_id`.
