package com.proyecto.banco.controllers;

import com.proyecto.banco.model.DTO.EmpleadoDTO;
import com.proyecto.banco.model.domain.Empleado;
import com.proyecto.banco.model.domain.Estado;
import com.proyecto.banco.model.domain.TipoCliente;
import com.proyecto.banco.repository.EmpleadoRepository;
import com.proyecto.banco.repository.EstadosRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/empleados")
public class EmpleadoController {

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private EstadosRepository estadosRepository;


    @PostMapping
    public ResponseEntity<?> crearEmpleado(@RequestBody EmpleadoDTO empleado) {

        if (empleado.getNombre() == null || empleado.getSucursal() == null || empleado.getSalario() == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","error");
            response.put("message", "Verifique los campos");
            return ResponseEntity.ok(response);
        }
        empleadoRepository.insertarEmpleado(
                empleado.getNombre(),
                empleado.getCargo(),
                empleado.getFechaContratacion() == null ? new Date() : empleado.getFechaContratacion(),
                empleado.getSalario(),
                empleado.getApellidoUno(),
                empleado.getApellidoDos(),
                empleado.getSucursal(),
                empleado.getEstado()
        );
        Map<String, Object> response = new HashMap<>();
        response.put("type_message","success");
        response.put("message", "Operación realizada con exito");

        return ResponseEntity.ok(response);
    }


    @GetMapping
    public ResponseEntity<List<Empleado>> obtenerTodosLosEmpleados() {
        List<Empleado> empleados = empleadoRepository.findAll();
        return ResponseEntity.ok(empleados);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Empleado> obtenerEmpleadoPorId(@PathVariable Integer id) {
        Empleado empleado = empleadoRepository.getEmpleadoById(id);
        if (empleado != null) {
            return ResponseEntity.ok(empleado);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/salario")
    public ResponseEntity<?> obtenerEmpleadoPorSalario(@RequestParam String salario) {
        Empleado empleado = empleadoRepository.obtenerEmpleadoPorSalario(BigDecimal.valueOf(Double.parseDouble(salario)));
        if (empleado != null) {
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","success");
            response.put("message", "Se obtuvieron los datos con éxito");
            response.put("data", empleado);

            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","warning");
            response.put("message", "No se encontraron datos");
            response.put("data", null);
            return ResponseEntity.ok(response);
        }
    }

    @PutMapping(value = "/{id}")
    public ResponseEntity<?> actualizarEmpleado(@RequestBody EmpleadoDTO empleado) {
        if (empleadoRepository.existsById(empleado.getId())) {
            empleado.setId(empleado.getId());
            empleadoRepository.actualizarEmpleado(
                    empleado.getId(),
                    empleado.getNombre(),
                    empleado.getCargo(),
                    empleado.getFechaContratacion(),
                    empleado.getSalario(),
                    empleado.getApellidoUno(),
                    empleado.getApellidoDos(),
                    empleado.getSucursal(),
                    empleado.getEstado()
                    );
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","success");
            response.put("message", "Operación realizada con exito");
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Eliminar un empleado
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> eliminarEmpleado(@PathVariable Integer id) {
        if (empleadoRepository.existsById(id)) {

            try {
                empleadoRepository.eliminarEmpleadoPorId(id);
                Map<String, Object> response = new HashMap<>();
                response.put("type_message","success");
                response.put("message", "Operación realizada con exito");
                return ResponseEntity.ok(response);
            } catch (Exception e) {
                log.info("Tiene datos asociados.");
            }
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","error");
            response.put("message", "No se pudo eliminar, tiene cuentas asociadas");
            return ResponseEntity.ok(response);

        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/estados")
    public ResponseEntity<List<Estado>> obtenerTipoCliente() {
        List<Estado> lista = estadosRepository.findAll();
        return ResponseEntity.ok(lista);
    }
}

