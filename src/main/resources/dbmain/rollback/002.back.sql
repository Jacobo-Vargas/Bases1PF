--Autores: Jacobo Vargas, Kevin Payanene, Steven Morales
---------------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.cuenta
DROP CONSTRAINT IF EXISTS producto_id_fk,
    DROP CONSTRAINT IF EXISTS cliente_id_fk;

ALTER TABLE IF EXISTS public.ventanilla
DROP CONSTRAINT IF EXISTS sucursal_id_fk;

ALTER TABLE IF EXISTS public.cliente
DROP CONSTRAINT IF EXISTS sucursal_id_fk;

DROP TABLE IF EXISTS public.cuenta CASCADE;
DROP TABLE IF EXISTS public.producto CASCADE;
DROP TABLE IF EXISTS public.ventanilla CASCADE;
DROP TABLE IF EXISTS public.sucursal CASCADE;
DROP TABLE IF EXISTS public.estado CASCADE;
