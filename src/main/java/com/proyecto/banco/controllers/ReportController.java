package com.proyecto.banco.controllers;

import com.proyecto.banco.services.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;
@RestController
@RequestMapping("/api/reportes")
public class ReportController {

    @Autowired
    private ReportService reportService;

    /**
     * Endpoint para obtener un reporte específico en formato CSV.
     *
     * @param reporteId El número del reporte a solicitar.
     * @return El archivo CSV generado.
     */
    @GetMapping("/reporte/csv/{reporteId}")
    public ResponseEntity<byte[]> obtenerReporteCsv(@PathVariable("reporteId") Integer reporteId) {
        List<Object[]> resultado;
        String[] columnas = null;

        switch (reporteId) {
            case 1:
                resultado = reportService.getReporteTotalClientesPorTipo();
                columnas = new String[]{"Tipo Cliente", "Total Clientes"};
                break;
            case 2:
                resultado = reportService.getReporteEmpleadosPorSucursal();
                columnas = new String[]{"Sucursal", "Total Empleados"};
                break;
            case 3:
                resultado = reportService.getReporteProductosPorTipo();
                columnas = new String[]{"Tipo Producto", "Total Productos"};
                break;
            case 4:
                resultado = reportService.getReporteTransaccionesUltimoMes();
                columnas = new String[]{"ID", "Valor", "Fecha Transacción", "Tipo Transacción"};
                break;
            case 5:
                resultado = reportService.getReporteSaldoTotalPorCliente();
                columnas = new String[]{"Cliente", "Saldo Total"};
                break;
            case 6:
                resultado = reportService.getReporteSolicitudesPorEstado();
                columnas = new String[]{"Solicitud", "Total Solicitudes", "Estado Cliente"};
                break;
            case 7:
                resultado = reportService.getReporteVentanillasAbiertasPorSucursal();
                columnas = new String[]{"Sucursal", "Ventanillas Abiertas"};
                break;
            case 8:
                resultado = reportService.getReporteHistoricoTransacciones();
                columnas = new String[]{"Cédula", "Cliente", "Sucursal", "Valor", "Fecha Transacción", "Tipo Transacción"};
                break;
            case 9:
                resultado = reportService.getReporteIngresosPorSucursal();
                columnas = new String[]{"Sucursal", "Total Ingresos"};
                break;
            case 10:
                resultado = reportService.getReporteRentabilidadMensualPorTipo();
                columnas = new String[]{"Mes", "Tipo Transacción", "Total Rentabilidad"};
                break;
            default:
                return ResponseEntity.badRequest().body("Reporte no válido. El número de reporte debe estar entre 1 y 10.".getBytes());
        }

        try {
            byte[] csv = reportService.generarCsvReporte(resultado, columnas);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=reporte.csv")
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .body(csv);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al generar el reporte CSV.".getBytes());
        }
    }
}
