## Plantilla CARE

## Contexto
<!-- Quién sos, qué proyecto es, cuál es el escenario actual -->
Soy desarrollador de [PROYECTO]. El sistema es [DESCRIPCIÓN BREVE].
Situación actual: [QUÉ EXISTE HOY / PUNTO DE PARTIDA]

## Acción
<!-- La instrucción específica y concreta -->
[VERBO] + [QUÉ] + [DÓNDE/EN QUÉ ARCHIVO O MÓDULO]

## Resultado
<!-- El objetivo final, para qué lo vas a usar -->
El objetivo es [PARA QUÉ SIRVE ESTO UNA VEZ IMPLEMENTADO]

## Ejemplo
<!-- Muestra de lo que esperás — esto es lo más importante -->
Espero algo como:
[CÓDIGO / ESTRUCTURA / COMPORTAMIENTO ESPERADO]

---

## Restricciones
<!-- Qué NO debe tocar o cambiar -->
- No modificar: [ARCHIVOS / MÓDULOS / PATRONES INTOCABLES]
- No usar: [LIBRERÍAS / ENFOQUES A EVITAR]

## Formato de respuesta
<!-- Cómo querés recibir la respuesta -->
[ ] Solo el código / archivo completo
[ ] Explicación breve + código
[ ] Plan primero, luego implementación
[ ] Lista de pasos sin código

## Autonomía
<!-- Qué nivel de independencia tiene para tomar decisiones -->
[ ] Implementar directo sin consultar
[ ] Planear en todo.md y esperar mi confirmación antes de tocar código
[ ] Solo para cambios arquitectónicos: planear primero

## Preguntas de clarificación
<!-- Si algo es ambiguo, cuánto puede preguntar antes de arrancar -->
Si algo es ambiguo o hay más de una forma válida, 
haceme máximo 3 preguntas antes de implementar.

## Listo cuando
<!-- Definición de done para esta tarea -->
- [ ] [CONDICIÓN 1 — ej: tests pasan]
- [ ] [CONDICIÓN 2 — ej: endpoint responde con la estructura correcta]
- [ ] [CONDICIÓN 3 — ej: no hay console.error en runtime]

----------------------------------------------------------------------------------

## Version Pre-Llenada

## Contexto
Soy el desarrollador de Huevos Point, un POS multi-tenant para 
distribuidoras de huevos. Stack: React 19 + MUI v6 / Node.js + 
Express + Sequelize / PostgreSQL (Supabase) / Vercel.
Arquitectura: Controller → Service → Repository. Multi-tenant 
con filtro obligatorio por tenantId.
Situación actual: [COMPLETAR]

## Acción
[COMPLETAR — ej: "Agregar endpoint GET /api/public/v1/clientes en el módulo public"]

## Resultado
[COMPLETAR — ej: "Exponer los clientes activos para integración con sistema contable externo"]

## Ejemplo
[COMPLETAR — ej: estructura de respuesta esperada, o snippet similar ya existente en el proyecto]

---

## Restricciones
- No modificar: authMiddleware, apiKeyMiddleware, modelos existentes sin migración
- No saltear capas: todo pasa por Controller → Service → Repository
- Todo query debe filtrar por tenantId
- La API pública es solo lectura — sin endpoints de escritura
- [AGREGAR restricciones específicas de esta tarea]

## Formato de respuesta
[ ] Solo el código / archivo completo
[ ] Explicación breve + código
[ ] Plan primero, luego implementación
[ ] Lista de pasos sin código

## Autonomía
[ ] Implementar directo sin consultar
[ ] Planear en todo.md y esperar mi confirmación antes de tocar código
[ ] Solo para cambios arquitectónicos: planear primero

## Preguntas de clarificación
Si algo es ambiguo o hay más de una forma válida,
haceme máximo 3 preguntas antes de implementar.

## Listo cuando
- [ ] Tests unitarios pasan (`cd server && npm test`)
- [ ] Endpoint responde con estructura `{ success, data, meta }`
- [ ] tenantId está siendo filtrado correctamente
- [ ] [CONDICIÓN ESPECÍFICA DE ESTA TAREA]