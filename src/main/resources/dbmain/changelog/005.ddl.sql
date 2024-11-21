-- Insertar más datos en tipo_cliente
INSERT INTO public.tipo_cliente (nombre) VALUES
                                             ('Minorista'),
                                             ('Mayorista'),
                                             ('Público'),
                                             ('Privado'),
                                             ('Corporativo'),
                                             ('Educacional'),
                                             ('Comercial'),
                                             ('Industria'),
                                             ('Turismo'),
                                             ('Bancario');

-- Insertar más datos en sucursal
INSERT INTO public.sucursal (ciudad, nombre, direccion, telefono) VALUES
                                                                      ('Bilbao', 'Sucursal Oeste', 'Calle de Gran Bilbao, 12', '944876543'),
                                                                      ('Alicante', 'Sucursal Playa Sur', 'Avenida de la Costa, 3', '965123456'),
                                                                      ('Murcia', 'Sucursal Centro Norte', 'Calle Mayor, 8', '968987654'),
                                                                      ('Castellón', 'Sucursal Sur', 'Carrer de les Dones, 22', '964123456'),
                                                                      ('Madrid', 'Sucursal Sur', 'Avenida de Vallecas, 15', '913456789');

-- Insertar más datos en cliente
INSERT INTO public.cliente (cedula, nombre, apellido_uno, apellido_dos, fecha_nacimiento, tipo_cliente_id, sucursal_id) VALUES
                                                                                                                            ('34567890', 'Ricardo', 'Álvarez', 'Fernández', '1982-10-25', 1, 1),
                                                                                                                            ('45678901', 'Lucía', 'Pérez', 'Ramírez', '1990-12-12', 3, 2),
                                                                                                                            ('56789012', 'Javier', 'Gómez', 'Sánchez', '1986-01-09', 2, 3),
                                                                                                                            ('67890123', 'Raquel', 'Martínez', 'López', '1994-05-30', 4, 4),
                                                                                                                            ('78901234', 'Fernando', 'Díaz', 'González', '1988-03-14', 5, 5),
                                                                                                                            ('89012345', 'María', 'González', 'Pérez', '1991-07-22', 6, 6),
                                                                                                                            ('90123456', 'Carlos', 'Fernández', 'Méndez', '1983-09-01', 2, 1),
                                                                                                                            ('10234567', 'Elena', 'Sánchez', 'Ruiz', '1995-11-11', 3, 2),
                                                                                                                            ('11345678', 'David', 'Ramírez', 'Hernández', '1981-06-21', 4, 3),
                                                                                                                            ('12456789', 'Andrea', 'López', 'Vidal', '1989-03-25', 5, 4);

-- Insertar más datos en ventanilla
INSERT INTO public.ventanilla (valor_base, fecha_apertura, fecha_cierre, sucursal_id) VALUES
                                                                                          (2500.00, '2024-07-01', '2024-12-31', 1),
                                                                                          (3000.00, '2024-08-01', '2024-12-31', 2),
                                                                                          (2000.00, '2024-09-01', '2024-12-31', 3),
                                                                                          (3500.00, '2024-10-01', '2024-12-31', 4),
                                                                                          (4000.00, '2024-11-01', '2024-12-31', 5);

-- Insertar más datos en producto
INSERT INTO public.producto (cedula, nombre, tipo_producto) VALUES
                                                                ('7890123456', 'Cuenta Ahorro Plus', 'AHORROS'),
                                                                ('8901234567', 'Préstamo Hipotecario Plus', 'CREDITO'),
                                                                ('9012345678', 'Cuenta Sueldo', 'CORRIENTE'),
                                                                ('1234567890', 'Cuenta Empresa', 'CORRIENTE'),
                                                                ('2345678901', 'Seguro Vehicular', 'CREDITO');

-- Insertar más datos en cuenta
INSERT INTO public.cuenta (numero_cuenta, fecha_creacion, cliente_id, producto_id) VALUES
                                                                                       (1000020, '2024-07-15', 1, 1),
                                                                                       (1000021, '2024-08-15', 2, 2),
                                                                                       (1000022, '2024-09-05', 3, 3),
                                                                                       (1000023, '2024-10-20', 4, 4),
                                                                                       (1000024, '2024-11-10', 5, 5),
                                                                                       (1000025, '2024-12-15', 6, 6),
                                                                                       (1000026, '2024-12-20', 7, 1),
                                                                                       (1000027, '2024-12-25', 8, 2),
                                                                                       (1000028, '2024-12-30', 9, 3),
                                                                                       (1000029, '2025-01-01', 10, 4);

-- Insertar más datos en solicitud
INSERT INTO public.solicitud (fecha_solicitud, valor, moneda, cliente_id, producto_id) VALUES
                                                                                           ('2024-07-05', 7000.00, 'USD', 1, 1),
                                                                                           ('2024-08-10', 2000.00, 'EUR', 2, 2),
                                                                                           ('2024-09-20', 4000.00, 'USD', 3, 3),
                                                                                           ('2024-10-12', 5000.00, 'EUR', 4, 4),
                                                                                           ('2024-11-25', 3500.00, 'USD', 5, 5),
                                                                                           ('2024-12-05', 1500.00, 'EUR', 6, 6),
                                                                                           ('2024-12-10', 6000.00, 'USD', 7, 1),
                                                                                           ('2024-12-18', 3200.00, 'EUR', 8, 2),
                                                                                           ('2024-12-22', 2800.00, 'USD', 9, 3),
                                                                                           ('2025-01-01', 1800.00, 'EUR', 10, 4);

-- Insertar más datos en transaccion
INSERT INTO public.transaccion (valor, fecha_transaccion, tipo_transaccion_id, estado_id, cuenta_id) VALUES
                                                                                                         (900.00, '2024-12-05', 1, 1, 1),
                                                                                                         (400.00, '2024-12-15', 2, 1, 2),
                                                                                                         (1100.00, '2024-12-10', 3, 2, 3),
                                                                                                         (500.00, '2024-12-18', 4, 1, 4),
                                                                                                         (300.00, '2024-12-22', 5, 2, 5),
                                                                                                         (450.00, '2024-12-25', 1, 1, 6),
                                                                                                         (1300.00, '2024-12-28', 2, 2, 7),
                                                                                                         (800.00, '2025-01-01', 3, 3, 8),
                                                                                                         (200.00, '2025-01-05', 4, 1, 9),
                                                                                                         (700.00, '2025-01-10', 5, 2, 10);

-- Insertar más datos en factura
INSERT INTO public.factura (formato, fecha, valor, transaccion_id) VALUES
                                                                       ('FISICA', '2024-10-15', 700.00, 1),
                                                                       ('DIGITAL', '2024-11-10', 2000.00, 2),
                                                                       ('FISICA', '2024-10-25', 4000.00, 3),
                                                                       ('DIGITAL', '2024-10-12', 500.00, 4),
                                                                       ('FISICA', '2024-10-25', 3500.00, 5),
                                                                       ('DIGITAL', '2024-10-05', 1500.00, 6),
                                                                       ('FISICA', '2024-11-10', 6000.00, 7),
                                                                       ('DIGITAL', '2024-11-15', 3200.00, 8),
                                                                       ('FISICA', '2024-10-18', 2800.00, 9),
                                                                       ('DIGITAL', '2024-10-22', 1800.00, 10);
