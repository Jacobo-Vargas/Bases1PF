-- Insertar datos en tipo_cliente
INSERT INTO public.tipo_cliente (nombre) VALUES
                                             ('Individual'),
                                             ('Empresa'),
                                             ('Corporación'),
                                             ('Freelancer'),
                                             ('Organización'),
                                             ('Gobierno');

-- Insertar datos en sucursal
INSERT INTO public.sucursal (ciudad, nombre, direccion, telefono) VALUES
                                                                      ('Madrid', 'Sucursal Centro', 'Calle Mayor, 1', '912345678'),
                                                                      ('Barcelona', 'Sucursal Eixample', 'Carrer de València, 34', '932345678'),
                                                                      ('Valencia', 'Sucursal Norte', 'Carrer de la Pau, 56', '963456789'),
                                                                      ('Sevilla', 'Sucursal Sur', 'Avenida de la Constitución, 78', '954567890'),
                                                                      ('Zaragoza', 'Sucursal Aragón', 'Calle de la Independencia, 90', '976678901'),
                                                                      ('Bilbao', 'Sucursal Norte', 'Gran Vía, 12', '944789012');


-- Insertar datos en cliente
INSERT INTO public.cliente (cedula, nombre, apellido_uno, apellido_dos, fecha_nacimiento, tipo_cliente_id, sucursal_id) VALUES
                                                                                                                            ('12345678', 'Juan', 'Pérez', 'García', '1985-07-15', 1, 1),
                                                                                                                            ('23456789', 'Ana', 'Gómez', 'Rodríguez', '1992-02-20', 2, 2),
                                                                                                                            ('3456789', 'Carlos', 'López', 'Martínez', '1980-11-30', 3, 3),
                                                                                                                            ('456123', 'Laura', 'Sánchez', 'Morales', '1995-05-10', 1, 4),
                                                                                                                            ('5234', 'Pedro', 'Ramírez', 'González', '1988-09-25', 2, 5),
                                                                                                                            ('89045', 'María', 'Fernández', 'Paredes', '2000-01-18', 4, 6),
                                                                                                                            ('70456', 'Luis', 'Díaz', 'Torres', '1990-12-22', 5, 1),
                                                                                                                            ('89467', 'Sara', 'Vargas', 'Jiménez', '1983-04-10', 6, 2);


-- Insertar datos en ventanilla
INSERT INTO public.ventanilla (valor_base, fecha_apertura, fecha_cierre, sucursal_id) VALUES
                                                                                          (1000.00, '2024-01-01', '2024-12-31', 1),
                                                                                          (2000.00, '2024-02-01', '2024-12-31', 2),
                                                                                          (1500.00, '2024-03-01', '2024-12-31', 3),
                                                                                          (1200.00, '2024-04-01', '2024-12-31', 4),
                                                                                          (1800.00, '2024-05-01', '2024-12-31', 5),
                                                                                          (1700.00, '2024-06-01', '2024-12-31', 6);

-- Insertar datos en producto
INSERT INTO public.producto (cedula, nombre, tipo_producto) VALUES
                                                                ('1234567890', 'Cuenta de Ahorros', 'AHORROS'),
                                                                ('2345678901', 'Cuenta Corriente', 'CORRIENTE'),
                                                                ('3456789012', 'Cuenta Empresarial', 'CREDITO'),
                                                                ('4567890123', 'Cuenta Estudiantil', 'AHORROS'),
                                                                ('5678901234', 'Tarjeta de Crédito', 'CORRIENTE'),
                                                                ('6789012345', 'Cuenta Nómina', 'CREDITO');

-- Insertar datos en cuenta
INSERT INTO public.cuenta (numero_cuenta, fecha_creacion, cliente_id, producto_id) VALUES
                                                                                       (1000001, '2024-01-15', 1, 1),
                                                                                       (1000002, '2024-02-10', 2, 2),
                                                                                       (1000003, '2024-03-20', 3, 3),
                                                                                       (1000004, '2024-04-25', 4, 4),
                                                                                       (1000005, '2024-05-30', 5, 5),
                                                                                       (1000006, '2024-06-15', 6, 6);

-- Insertar datos en estado
INSERT INTO public.estado (nombre, fecha_estado) VALUES
                                                     ('Activo', '2024-01-01'),
                                                     ('Inactivo', '2024-01-01'),
                                                     ('Suspendido', '2024-01-01'),
                                                     ('Cerrado', '2024-01-01');

-- Insertar datos en solicitud
INSERT INTO public.solicitud (fecha_solicitud, valor, moneda, cliente_id, producto_id) VALUES
                                                                                           ('2024-01-10', 5000.00, 'USD', 1, 1),
                                                                                           ('2024-02-15', 2000.00, 'EUR', 2, 2),
                                                                                           ('2024-03-10', 3000.00, 'USD', 3, 3),
                                                                                           ('2024-04-20', 1500.00, 'EUR', 4, 4),
                                                                                           ('2024-05-25', 2500.00, 'USD', 5, 5),
                                                                                           ('2024-06-10', 1000.00, 'EUR', 6, 6);

-- Insertar datos en empleado
INSERT INTO public.empleado (nombre, apellido_uno, apellido_dos, salario, fecha_contratacion, cargo, sucursal_id, estado_id) VALUES
                                                                                                                                 ('José', 'Martínez', 'González', 30000.00, '2024-01-01', 'Gerente', 1, 1),
                                                                                                                                 ('María', 'López', 'Fernández', 25000.00, '2024-02-01', 'Cajero', 2, 2),
                                                                                                                                 ('Carlos', 'Sánchez', 'Pérez', 35000.00, '2024-03-01', 'Supervisor', 3, 3),
                                                                                                                                 ('Ana', 'Ramírez', 'Torres', 22000.00, '2024-04-01', 'Asistente', 4, 4),
                                                                                                                                 ('Luis', 'Gómez', 'Morales', 28000.00, '2024-05-01', 'Director', 5, 1),
                                                                                                                                 ('Paula', 'Vargas', 'Jiménez', 21000.00, '2024-06-01', 'Cajero', 6, 1);

-- Insertar datos en tipo_transaccion
INSERT INTO public.tipo_transaccion (nombre) VALUES
                                                 ('Depósito'),
                                                 ('Retiro'),
                                                 ('Transferencia'),
                                                 ('Pago'),
                                                 ('Consultas');

-- Insertar datos en transaccion
INSERT INTO public.transaccion (valor, fecha_transaccion, tipo_transaccion_id, estado_id, cuenta_id) VALUES
                                                                                                         (500.00, '2024-11-10', 1, 1, 1),
                                                                                                         (200.00, '2024-11-15', 2, 1, 2),
                                                                                                         (1000.00, '2024-11-10', 3, 2, 3),
                                                                                                         (150.00, '2024-11-20', 4, 1, 4),
                                                                                                         (300.00, '2024-11-25', 5, 2, 5),
                                                                                                         (250.00, '2024-11-10', 1, 1, 6);

-- Insertar datos en factura
INSERT INTO public.factura (formato, fecha, valor, transaccion_id) VALUES
                                                                       ('FISICA', '2024-01-15', 500.00, 1),
                                                                       ('DIGITAL', '2024-02-20', 200.00, 2),
                                                                       ('FISICA', '2024-03-15', 1000.00, 3),
                                                                       ('FISICA', '2024-04-25', 150.00, 4),
                                                                       ('DIGITAL', '2024-05-30', 300.00, 5),
                                                                       ('DIGITAL', '2024-06-15', 250.00, 6);
