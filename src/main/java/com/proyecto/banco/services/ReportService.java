package com.proyecto.banco.services;

import com.proyecto.banco.repository.ReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class ReportService {

    @Autowired
    private ReportRepository reportRepository;

    /**
     * Obtener el total de clientes agrupados por tipo de cliente.
     */
    public List<Object[]> getReporteTotalClientesPorTipo() {
        return reportRepository.getReporteTotalClientesPorTipo();
    }

    /**
     * Obtener el total de empleados agrupados por sucursal.
     */
    public List<Object[]> getReporteEmpleadosPorSucursal() {
        return reportRepository.getReporteEmpleadosPorSucursal();
    }

    /**
     * Obtener el total de productos agrupados por tipo de producto.
     */
    public List<Object[]> getReporteProductosPorTipo() {
        return reportRepository.getReporteProductosPorTipo();
    }

    /**
     * Obtener las transacciones realizadas en el último mes.
     */
    public List<Object[]> getReporteTransaccionesUltimoMes() {
        return reportRepository.getReporteTransaccionesUltimoMes();
    }

    /**
     * Obtener los clientes y su saldo total (sumatoria de cuentas asociadas).
     */
    public List<Object[]> getReporteSaldoTotalPorCliente() {
        return reportRepository.getReporteSaldoTotalPorCliente();
    }

    /**
     * Obtener las solicitudes agrupadas por estado de los clientes.
     */
    public List<Object[]> getReporteSolicitudesPorEstado() {
        return reportRepository.getReporteSolicitudesPorEstado();
    }

    /**
     * Obtener las ventanillas abiertas actualmente por sucursal.
     */
    public List<Object[]> getReporteVentanillasAbiertasPorSucursal() {
        return reportRepository.getReporteVentanillasAbiertasPorSucursal();
    }

    /**
     * Obtener el histórico de transacciones por cliente y sucursal.
     */
    public List<Object[]> getReporteHistoricoTransacciones() {
        return reportRepository.getReporteHistoricoTransacciones();
    }

    /**
     * Obtener los ingresos totales por sucursal en los últimos 6 meses.
     */
    public List<Object[]> getReporteIngresosPorSucursal() {
        return reportRepository.getReporteIngresosPorSucursal();
    }

    /**
     * Obtener la rentabilidad mensual agrupada por tipo de transacción.
     */
    public List<Object[]> getReporteRentabilidadMensualPorTipo() {
        return reportRepository.getReporteRentabilidadMensualPorTipo();
    }


    // Metodo para convertir los datos en un archivo CSV
    public byte[] generarCsvReporte(List<Object[]> datos, String[] columnas) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        OutputStreamWriter writer = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8);

        // Escribir el encabezado
        for (String columna : columnas) {
            writer.append(columna).append(",");
        }
        writer.append("\n");

        // Escribir los datos
        for (Object[] row : datos) {
            for (Object value : row) {
                writer.append(value.toString()).append(",");
            }
            writer.append("\n");
        }

        writer.flush();
        return outputStream.toByteArray();
    }
}
