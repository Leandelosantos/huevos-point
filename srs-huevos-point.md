# Documento de Especificación de Requerimientos de Software (SRS)
**Proyecto:** Huevos Point – Aplicación Web de Control de Ventas, Egresos y Stock
**Versión:** 1.0
**Fecha:** 03 de marzo de 2026
**Estado:** Borrador

---

## 1. Introducción

### 1.1 Propósito
Este documento describe los requerimientos funcionales y no funcionales para el desarrollo de la aplicación web **Huevos Point**, destinada al control y gestión de ventas, egresos de caja y stock de productos para un local de venta de huevos y productos relacionados.

### 1.2 Alcance
La aplicación permitirá a los usuarios autenticados registrar ventas y egresos de dinero, gestionar el inventario de productos y visualizar la actividad diaria de movimientos. La solución será una aplicación web responsiva, accesible desde dispositivos móviles, tablets y escritorio.

### 1.3 Definiciones y Acrónimos
| Término | Descripción |
|---|---|
| SRS | Software Requirements Specification |
| MERN | Stack tecnológico: MongoDB → reemplazado por SQL, Express, React, Node.js |
| MUI | Material UI – librería de componentes para React |
| RBAC | Role-Based Access Control – control de acceso por roles |
| Stock | Inventario de productos disponibles |
| Egreso | Salida de dinero de caja por un concepto definido |
| Venta | Transacción de uno o más productos con descuento de stock y registro de ingreso |

### 1.4 Stack Tecnológico
| Capa | Tecnología |
|---|---|
| Frontend | React.js + Material UI (MUI) |
| Backend | Node.js + Express.js |
| Base de Datos | SQL Relacional (PostgreSQL recomendado) |
| ORM | Sequelize |
| Autenticación | JWT (JSON Web Tokens) |
| Responsividad | MUI Breakpoints (xs, sm, md, lg) |

---

## 2. Descripción General del Sistema

### 2.1 Perspectiva del Producto
Huevos Point es una aplicación web standalone que centraliza las operaciones diarias del local: registro de ventas con descuento automático de stock, registro de egresos de caja y administración de inventario de productos. Adicionalmente, provee un log de auditoría completo de todas las acciones realizadas en el sistema.

### 2.2 Funciones Principales
- Autenticación de usuarios con control de roles (Administrador / Empleado)
- Dashboard diario con resumen de caja
- Registro de ventas con selección de productos y actualización automática de stock
- Registro de egresos de caja con concepto y monto
- Gestión completa de stock (ABM de productos)
- Registro de auditoría de todas las acciones del sistema

### 2.3 Tipos de Usuario
| Rol | Permisos |
|---|---|
| **Administrador** | Acceso completo: ventas, egresos, stock, historial, auditoría y gestión de usuarios |
| **Empleado** | Acceso restringido: solo puede registrar ventas y egresos de caja |

---

## 3. Requerimientos Funcionales

### RF-01: Autenticación y Sesión

**RF-01.1** El sistema debe proveer una pantalla de login con campos "Usuario" y "Contraseña".
**RF-01.2** El sistema debe validar las credenciales contra la base de datos y generar un token JWT al autenticarse correctamente.
**RF-01.3** El sistema debe mostrar un mensaje de error claro si las credenciales son incorrectas.
**RF-01.4** El sistema debe mantener la sesión activa mediante JWT con tiempo de expiración configurable.
**RF-01.5** El sistema debe proveer un botón de "Cerrar Sesión" visible en todas las pantallas autenticadas.
**RF-01.6** El sistema debe redirigir al usuario a la pantalla de login si el token ha expirado o es inválido.
**RF-01.7** Las rutas protegidas deben verificar el rol del usuario y denegar acceso si no tiene permisos suficientes.

---

### RF-02: Sección Inicio (Dashboard)

**RF-02.1** La pantalla de inicio debe mostrar un resumen del día actual con la siguiente información:
- Total de ingresos del día (suma de ventas)
- Total de egresos del día
- Saldo neto de caja del día (ingresos – egresos)

**RF-02.2** La pantalla debe contener dos botones principales:
- **"Registrar Venta"** – abre un modal o formulario para registrar una nueva venta
- **"Registrar Egreso"** – abre un modal o formulario para registrar un egreso

**RF-02.3** El resumen de caja debe actualizarse en tiempo real luego de cada registro exitoso.

**RF-02.4** (Solo Administrador) La sección de inicio puede mostrar un listado de los últimos movimientos del día ordenados por hora descendente.

---

### RF-03: Registro de Venta

**RF-03.1** El formulario de registro de venta debe permitir agregar uno o más productos a la venta.

**RF-03.2** Para cada producto agregado se debe poder:
- Seleccionar el producto desde un listado desplegable (nombre + precio actual)
- Ingresar la cantidad deseada mediante un campo numérico
- Ver el subtotal calculado automáticamente (cantidad × precio unitario)

**RF-03.3** El sistema debe permitir agregar múltiples ítems (líneas de producto) a una misma venta, incluyendo distintos productos o el mismo producto más de una vez.

**RF-03.4** El sistema debe mostrar el **total general de la venta** en tiempo real, sumando todos los subtotales.

**RF-03.5** El sistema debe validar que la cantidad ingresada no supere el stock disponible del producto. En caso de superarlo, debe mostrar un mensaje de advertencia e impedir confirmar la venta.

**RF-03.6** Al confirmar la venta:
- Se debe registrar la venta en la base de datos con fecha, hora y usuario que la realizó
- Se debe descontar del stock la cantidad de cada producto vendido
- Se debe registrar la acción en el log de auditoría

**RF-03.7** El formulario debe incluir un botón "Cancelar" para abortar la operación sin guardar cambios.

---

### RF-04: Registro de Egreso

**RF-04.1** El formulario de registro de egreso debe contener:
- Campo **"Concepto"** (tipo texto libre, string, obligatorio)
- Campo **"Monto de Egreso"** (tipo numérico, positivo, obligatorio)

**RF-04.2** Al confirmar el egreso:
- Se debe registrar en la base de datos con fecha, hora y usuario que lo realizó
- Se debe registrar la acción en el log de auditoría

**RF-04.3** El formulario debe incluir un botón "Cancelar" para abortar la operación.

---

### RF-05: Sección Stock (Gestión de Inventario)

> Esta sección es accesible **únicamente por el rol Administrador**.

**RF-05.1** La sección Stock debe mostrar una grilla (tabla) con todos los productos del sistema, con las siguientes columnas:
- Nombre del producto
- Cantidad disponible
- Precio actual (unitario)
- Acción: ícono de lápiz (✏️) para editar
- Acción: ícono de tacho de basura (🗑️) para eliminar

**RF-05.2** La grilla debe ser paginada o con scroll, y ordenable por columna.

**RF-05.3** Debe existir un botón **"Agregar Producto"** que abre un formulario/modal para crear un nuevo producto con los campos:
- Nombre del producto (texto, obligatorio, único)
- Cantidad inicial en stock (numérico, obligatorio)
- Precio unitario (numérico decimal, obligatorio)

**RF-05.4** El ícono de lápiz debe abrir un formulario de edición precargado con los datos actuales del producto, permitiendo modificar nombre, cantidad y precio.

**RF-05.5** El ícono de tacho de basura debe solicitar confirmación antes de eliminar el producto. Si el producto tiene ventas asociadas, no podrá eliminarse (eliminación lógica o restricción de integridad referencial).

**RF-05.6** Toda operación de alta, baja o modificación de productos debe quedar registrada en el log de auditoría.

---

### RF-06: Log de Auditoría

> Esta sección es accesible **únicamente por el rol Administrador**.

**RF-06.1** El sistema debe registrar automáticamente cada acción relevante realizada en el sistema, incluyendo:
- Login y logout de usuarios
- Registro de ventas
- Registro de egresos
- Alta, modificación y baja de productos
- Modificación de stock

**RF-06.2** Cada registro de auditoría debe contener:
- ID del registro
- Usuario que realizó la acción
- Tipo de acción (ej.: LOGIN, VENTA, EGRESO, PRODUCTO_CREADO, etc.)
- Descripción detallada de la acción
- Fecha y hora exacta (timestamp)
- Datos anteriores y nuevos (para modificaciones)

**RF-06.3** El administrador debe poder visualizar el log de auditoría filtrado por fecha, usuario y tipo de acción.

---

## 4. Requerimientos No Funcionales

### RNF-01: Responsividad
La aplicación debe ser completamente responsiva y funcionar correctamente en:
- **Mobile:** desde 320px de ancho
- **Tablet:** desde 768px de ancho
- **Desktop:** desde 1024px en adelante

Se utilizarán los breakpoints de MUI (`xs`, `sm`, `md`, `lg`) para adaptar los layouts.

### RNF-02: Seguridad
- Las contraseñas deben almacenarse hasheadas con **bcrypt** (mínimo 10 salt rounds)
- Todas las rutas de la API deben requerir token JWT válido
- Las rutas con permisos de Administrador deben verificar el rol en el backend (no solo en el frontend)
- Se deben sanitizar todos los inputs para prevenir inyección SQL y XSS

### RNF-03: Rendimiento
- El tiempo de respuesta de la API no debe superar 2 segundos para operaciones comunes
- La carga inicial de la aplicación no debe superar 3 segundos en conexión estándar

### RNF-04: Usabilidad
- La interfaz debe ser intuitiva, usando componentes estándar de Material UI
- Los mensajes de error y éxito deben mostrarse mediante snackbars/alerts de MUI
- Los formularios deben incluir validaciones en tiempo real

### RNF-05: Mantenibilidad
- El código debe seguir una estructura modular y escalable (separación de rutas, controladores, modelos y middlewares en el backend)
- El frontend debe usar componentes reutilizables de React

---

## 5. Modelo de Base de Datos Relacional (SQL)

### Tabla: `users`
```sql
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(50) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,         -- hash bcrypt
  full_name   VARCHAR(100) NOT NULL,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee')),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `products`
```sql
CREATE TABLE products (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL UNIQUE,
  stock_quantity  NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_price      NUMERIC(10,2) NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `sales`
```sql
CREATE TABLE sales (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id),
  total_amount NUMERIC(10,2) NOT NULL,
  sale_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `sale_items`
```sql
CREATE TABLE sale_items (
  id          SERIAL PRIMARY KEY,
  sale_id     INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id),
  quantity    NUMERIC(10,2) NOT NULL,
  unit_price  NUMERIC(10,2) NOT NULL,  -- precio al momento de la venta
  subtotal    NUMERIC(10,2) NOT NULL
);
```

### Tabla: `expenses` (Egresos)
```sql
CREATE TABLE expenses (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id),
  concept     VARCHAR(255) NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `audit_logs`
```sql
CREATE TABLE audit_logs (
  id              SERIAL PRIMARY KEY,
  user_id         INT REFERENCES users(id),
  username        VARCHAR(50),               -- copia del nombre por si se elimina el usuario
  action_type     VARCHAR(50) NOT NULL,      -- LOGIN, LOGOUT, VENTA, EGRESO, PRODUCTO_CREADO, etc.
  entity          VARCHAR(50),               -- tabla/entidad afectada
  entity_id       INT,                       -- ID del registro afectado
  description     TEXT,                      -- descripción legible de la acción
  previous_data   JSONB,                     -- datos antes del cambio (para modificaciones)
  new_data        JSONB,                     -- datos después del cambio
  ip_address      VARCHAR(45),               -- IP del cliente
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Estructura de Rutas de la API REST

| Método | Endpoint | Descripción | Rol requerido |
|---|---|---|---|
| POST | `/api/auth/login` | Iniciar sesión | Público |
| POST | `/api/auth/logout` | Cerrar sesión | Autenticado |
| GET | `/api/dashboard/summary` | Resumen del día | Autenticado |
| GET | `/api/products` | Listar productos activos | Autenticado |
| POST | `/api/products` | Crear producto | Admin |
| PUT | `/api/products/:id` | Editar producto | Admin |
| DELETE | `/api/products/:id` | Eliminar producto | Admin |
| POST | `/api/sales` | Registrar venta | Autenticado |
| GET | `/api/sales` | Listar ventas | Admin |
| POST | `/api/expenses` | Registrar egreso | Autenticado |
| GET | `/api/expenses` | Listar egresos | Admin |
| GET | `/api/audit-logs` | Ver log de auditoría | Admin |

---

## 7. Estructura de Navegación (Frontend)

```
/login                  → Pantalla de login (pública)
/                       → Inicio / Dashboard (autenticado)
/stock                  → Gestión de stock (solo Admin)
/audit                  → Log de auditoría (solo Admin)
```

La navegación se implementará con **React Router v6**. La barra de navegación lateral (Drawer de MUI) mostrará solo las opciones permitidas según el rol del usuario.

---

## 8. Casos de Uso Principales

### CU-01: Registrar Venta
- **Actor:** Empleado / Administrador
- **Precondición:** Usuario autenticado; al menos un producto con stock > 0
- **Flujo:** Hacer clic en "Registrar Venta" → Seleccionar producto(s) → Ingresar cantidades → Verificar total → Confirmar
- **Postcondición:** Venta registrada, stock descontado, auditoría registrada

### CU-02: Registrar Egreso
- **Actor:** Empleado / Administrador
- **Precondición:** Usuario autenticado
- **Flujo:** Hacer clic en "Registrar Egreso" → Ingresar concepto y monto → Confirmar
- **Postcondición:** Egreso registrado, auditoría registrada

### CU-03: Gestionar Stock
- **Actor:** Administrador
- **Precondición:** Usuario autenticado con rol Admin
- **Flujo:** Ir a sección Stock → Agregar / Editar / Eliminar producto
- **Postcondición:** Producto actualizado en BD, auditoría registrada

### CU-04: Ver Auditoría
- **Actor:** Administrador
- **Precondición:** Usuario autenticado con rol Admin
- **Flujo:** Ir a sección Auditoría → Aplicar filtros → Revisar registros
- **Postcondición:** Ninguna (solo lectura)

---

## 9. Restricciones y Supuestos

- La aplicación no requiere procesamiento de pagos electrónicos en esta versión.
- Los precios de los productos se expresan en moneda local (ARS).
- Un producto eliminado no puede ser borrado físicamente si tiene ventas asociadas; se marcará como inactivo (`is_active = false`).
- El sistema contempla un único local (no multi-sucursal en esta versión).
- El precio guardado en `sale_items.unit_price` es el precio vigente al momento de la venta, garantizando la integridad histórica.

---

## 10. Criterios de Aceptación

| # | Criterio |
|---|---|
| CA-01 | Un empleado puede iniciar sesión y registrar ventas y egresos sin acceder a stock ni auditoría |
| CA-02 | Un administrador tiene acceso completo a todas las secciones |
| CA-03 | Al registrar una venta, el stock se descuenta correctamente en la misma transacción |
| CA-04 | No es posible registrar una venta con cantidad mayor al stock disponible |
| CA-05 | Cada acción deja trazabilidad en la tabla `audit_logs` con usuario, fecha y hora |
| CA-06 | La aplicación es completamente funcional en resoluciones desde 320px |
| CA-07 | Las contraseñas se almacenan como hash (nunca en texto plano) |
| CA-08 | El saldo de caja del día se calcula y muestra correctamente en el dashboard |

---

*Fin del documento – Versión 1.0*
