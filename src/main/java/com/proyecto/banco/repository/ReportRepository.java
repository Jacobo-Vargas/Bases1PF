package com.proyecto.banco.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ReportRepository {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Consulta 1: Total de clientes agrupados por tipo de cliente.
     */

    public List<Object[]> getReporteTotalClientesPorTipo() {
        String query = """
        SELECT tc.nombre AS tipo_cliente, COUNT(c.id) AS total_clientes
        FROM public.tipo_cliente tc
        LEFT JOIN public.cliente c ON tc.id = c.tipo_cliente_id
        GROUP BY tc.nombre
        """;
        return entityManager.createNativeQuery(query).getResultList();
    }

    /**
     * Consulta 2: Total de empleados agrupados por sucursal.
     */

    public List<Object[]> getReporteEmpleadosPorSucursal() {
        String query = """
        SELECT s.nombre AS sucursal, COUNT(e.id) AS total_empleados
        FROM public.sucursal s
        LEFT JOIN public.empleado e ON s.id = e.sucursal_id
        GROUP BY s.nombre
        """;
        return entityManager.createNativeQuery(query).getResultList();
    }
    /**
     * Consulta 3: Total de productos agrupados por tipo de producto.
     */
     public List<Object[]> getReporteProductosPorTipo() {
        String query = """
        SELECT tipo_producto, COUNT(id) AS total_productos
        FROM public.producto
        GROUP BY tipo_producto
        """;
        return entityManager.createNativeQuery(query).getResultList();
    }

    /**
     * Consulta 4: Transacciones realizadas en el último mes.
     */

    public List<Object[]> getReporteTransaccionesUltimoMes() {
        String query = """
        SELECT t.id, t.valor, t.fecha_transaccion, tt.nombre AS tipo_transaccion
        FROM public.transaccion t
        JOIN public.tipo_transaccion tt ON t.tipo_transaccion_id = tt.id
        WHERE t.fecha_transaccion >= CURRENT_DATE - INTERVAL '1 month'
        """;
        return entityManager.createNativeQuery(query).getResultList();
    }

    /**
     * Consulta 5: Clientes y su saldo total (sumatoria de cuentas asociadas).
     */

    public List<Object[]> getReporteSaldoTotalPorCliente() {
        String query = """
        SELECT c.nombre || ' ' || c.apellido_uno AS cliente, SUM(ct.valor) AS saldo_total
        FROM public.cliente c
        JOIN public.cuenta cu ON c.id = cu.cliente_id
        JOIN public.transaccion ct ON cu.id = ct.cuenta_id
        GROUP BY c.id, c.nombre, c.apellido_uno
        """;
        return entityManager.createNativeQuery(query).getResultList();
    }

    /**
     * Consulta 6: Solicitudes agrupadas por estado de los clientes.
     */

    public List<Object[]> getReporteSolicitudesPorEstado() {
        String query = """
        SELECT c.nombre AS solicitud, COUNT(sl.id) AS total_solicitudes, e.nombre AS estado_cliente
        FROM public.solicitud sl
        JOIN public.cliente c ON sl.cliente_id = c.id
        JOIN public.estado e ON c.tipo_cliente_id = e.id
        GROUP BY c.nombre, e.nombre
        """;
        return entityManager.createNativeQuery(query).getResultList();
    }

    /**
     * Consulta 7: Ventanillas abiertas actualmente por sucursal.
     */
    public List<Object[]> getReporteVentanillasAbiertasPorSucursal() {
        String query = """
        SELECT s.nombre AS sucursal, COUNT(v.id) AS ventanillas_abiertas
        FROM public.sucursal s
        JOIN public.ventanilla v ON s.id = v.sucursal_id
        WHERE v.fecha_cierre > CURRENT_DATE
        GROUP BY s.nombre
        """;
        return entityManager.createNativeQuery(query).getResultList();
    }

    /**
     * Consulta 8: Histórico de transacciones por cliente y sucursal.
     */
    public List<Object[]> getReporteHistoricoTransacciones() {
        String query = """
        SELECT c.cedula, c.nombre || ' ' || c.apellido_uno AS cliente, s.nombre AS sucursal,
               t.valor, t.fecha_transaccion, tt.nombre AS tipo_transaccion
        FROM public.transaccion t
        JOIN public.cuenta cu ON t.cuenta_id = cu.id
        JOIN public.cliente c ON cu.cliente_id = c.id
        JOIN public.sucursal s ON c.sucursal_id = s.id
        JOIN public.tipo_transaccion tt ON t.tipo_transaccion_id = tt.id
        ORDER BY c.cedula, t.fecha_transaccion DESC
        """;
        return entityManager.createNativeQuery(query).getResultList();
    }

    /**
     * Consulta 9: Ingresos totales por sucursal en los últimos 6 meses.
     */

    public List<Object[]> getReporteIngresosPorSucursal() {
        String query = """
        SELECT s.nombre AS sucursal, SUM(t.valor) AS total_ingresos
        FROM public.sucursal s
        JOIN public.ventanilla v ON s.id = v.sucursal_id
        JOIN public.transaccion t ON v.id = t.cuenta_id
        WHERE t.fecha_transaccion >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY s.nombre
        """;
        return entityManager.createNativeQuery(query).getResultList();
    }

    /**
     * Consulta 10: Rentabilidad mensual agrupada por tipo de transacción.
     */

    public List<Object[]> getReporteRentabilidadMensualPorTipo() {
        String query = """
        SELECT DATE_TRUNC('month', t.fecha_transaccion) AS mes, tt.nombre AS tipo_transaccion, SUM(t.valor) AS total_rentabilidad
        FROM public.transaccion t
        JOIN public.tipo_transaccion tt ON t.tipo_transaccion_id = tt.id
        GROUP BY DATE_TRUNC('month', t.fecha_transaccion), tt.nombre
        ORDER BY mes, tt.nombre
        """;
        return entityManager.createNativeQuery(query).getResultList();
    }


}

