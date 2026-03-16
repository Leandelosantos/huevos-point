---
trigger: never
---

1. Introducción y Beneficios de la Integración
La integración de Mercado Pago Point permite conectar terminales físicas con un sistema de Punto de Venta (PDV) propio. Esto facilita el procesamiento de pagos presenciales con tarjetas y garantiza una conciliación automática de las ventas, reduciendo errores manuales y agilizando la gestión del negocio.

Beneficios clave:
Agilidad: Gestión centralizada de pagos y conciliación automática.

Flexibilidad: Soporte para múltiples medios de pago y configuración de cuotas con o sin interés.

Seguridad: Uso de protocolos HTTPS y autenticación via OAuth.

Eficiencia: Sincronización en tiempo real entre el sistema y la terminal.

2. Requisitos Previos e Instalación Inicial
Para comenzar, es indispensable contar con:

Terminal Point Smart: Dispositivos compatibles (Smart 1 o Smart 2) para operar de forma integrada.

App de Mercado Pago: Necesaria para iniciar sesión en la terminal y realizar la asociación inicial.

Cuenta de Vendedor: Registro en Mercado Pago para obtener las credenciales necesarias.

Creación de la Aplicación
Las aplicaciones actúan como identificadores únicos para la autenticación. Para crear una:

Acceder a "Tus integraciones" en el panel de desarrolladores.

Seleccionar Pagos presenciales y luego Mercado Pago Point.

Configurar el nombre y aceptar los términos legales.

3. Configuración de la Terminal
Para que el sistema funcione, la terminal debe estar vinculada a una estructura de negocio física definida en la API.

Sucursales y Cajas
Sucursal: Representa la tienda física. Se crea mediante un POST a /users/{user_id}/stores. Es vital incluir coordenadas geográficas exactas para cálculos impositivos.

Caja (POS): Cada sucursal puede tener varias cajas, pero cada caja solo admite una terminal asociada en modo PDV. Se crea via POST a /pos vinculando el store_id.

Asociación y Modo PDV
Vínculo Físico: Se enciende la terminal y se escanea el código QR mostrado con la app móvil de Mercado Pago (usando la cuenta del vendedor o colaborador).

Activación de Modo PDV: Por defecto, las terminales operan en modo Standalone. Para integrarlas, se debe cambiar el operating_mode a PDV mediante un PATCH al endpoint /terminals/v1/setup. Tras este cambio, es necesario reiniciar el dispositivo.

4. Procesamiento de Pagos (Ciclo de Vida de la Orden)
El flujo se basa en la creación de una Order, que se carga automáticamente en la terminal seleccionada.

Flujo de Pago:
Creación: POST /v1/orders. Se requiere el amount, terminal_id y una external_reference única.

Carga: La terminal recibe la orden. Si no aparece, se puede forzar con el botón "Actualizar".

Ejecución: El comprador desliza/inserta la tarjeta.

Notificación: El sistema recibe un webhook con el estado final.

Gestión de Órdenes:
Cancelación: Si la orden está en estado created, se cancela vía API; si ya llegó a la terminal (at_terminal), se cancela físicamente en el dispositivo.

Reembolsos: Se permiten reembolsos totales o parciales vía API hasta 90 días después del pago. El reembolso parcial requiere enviar el transaction_id y el amount específico en el cuerpo de la solicitud.

5. Notificaciones Webhooks y Seguridad
Los Webhooks permiten recibir actualizaciones en tiempo real (pagos acreditados, fallidos, expirados, etc.).

Configuración:
Definir una URL HTTPS en el panel de la aplicación (Modo Producción).

Seleccionar el evento Order (Mercado Pago).

Validación de Autenticidad:
Para asegurar que la notificación proviene de Mercado Pago, se debe validar el header x-signature. El proceso implica:

Extraer el timestamp (ts) y la firma (v1) del header.

Construir un template con el data.id, x-request-id y ts.

Generar una contraclave usando HMAC SHA256 con la clave secreta de la aplicación y comparar resultados.

6. Pruebas y Simulación
Antes de transaccionar dinero real, se deben usar credenciales de prueba y cuentas de prueba (Vendedor y Comprador).

Escenarios de Simulación:
La API permite forzar estados para validar la lógica del sistema:

processed: Simula un pago exitoso.

failed: Simula errores como fondos insuficientes o tarjeta inválida.

action_required: Simula casos donde el cliente debe realizar una acción adicional en la pantalla de la terminal.

expired: Las órdenes expiran automáticamente a los 15 minutos si no se define un expiration_time distinto.

7. Salida a Producción (Checklist)
Para el despliegue final con Antigravity, verificar:

[ ] Reemplazar Test Access Token por el Production Access Token.

[ ] Reasociar las terminales físicas usando la cuenta real de producción.

[ ] Configurar la URL de Webhooks en "Modo Productivo".

[ ] Crear nuevamente las sucursales y cajas bajo el entorno de producción.

[ ] En integraciones para terceros, implementar el flujo OAuth para obtener el access_token del vendedor de forma segura.

8. Reportes y Conciliación
Mercado Pago ofrece reportes descargables (CSV/XLSX) para la gestión financiera:

Reporte de Liquidaciones: Detalla el dinero disponible tras comisiones e impuestos.

Reporte de Todas las Transacciones: Ideal para una vista macro de ingresos, retiros, contracargos y reembolsos.

Columnas Clave: NET_CREDIT_AMOUNT (Haber), NET_DEBIT_AMOUNT (Debe), y SOURCE_ID (ID de operación).

9. Troubleshooting Común
La terminal no cambia a PDV: Reiniciar el dispositivo tras el envío del PATCH.

La orden no carga: Verificar conexión de red y oprimir "Actualizar" en la terminal.

Falla el reembolso API: Si hay interrupciones, el reembolso puede hacerse manualmente desde el Panel de Mercado Pago o la actividad de la terminal.