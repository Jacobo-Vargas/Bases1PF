package com.proyecto.banco.controllers;

import com.proyecto.banco.model.domain.Empleado;
import com.proyecto.banco.repository.EmpleadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/empleados")
public class EmpleadoController {

    @Autowired
    private EmpleadoRepository empleadoRepository;


    @PostMapping
    public ResponseEntity<String> crearEmpleado(@RequestBody Empleado empleado) {
        empleadoRepository.insertarEmpleado(empleado.getNombre(),empleado.getCargo(),empleado.getFechaContratacion(),empleado.getSalario(),
                empleado.getApellidoUno(), empleado.getApellidoDos(), empleado.getSucursal() != null ? empleado.getSucursal().getId() : null, empleado.getEstado() != null ? empleado.getEstado().getId(): null);
        return ResponseEntity.ok("Empleado creado con éxito");
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

    @PutMapping(value = "/{id}")
    public ResponseEntity<String> actualizarEmpleado(@PathVariable Integer id, @RequestBody Empleado empleado) {
        if (empleadoRepository.existsById(id)) {
            empleado.setId(id);
            empleadoRepository.actualizarEmpleado(empleado.getId(), empleado.getNombre(), empleado.getCargo(),
                    empleado.getFechaContratacion(), empleado.getSalario(), empleado.getApellidoUno(),empleado.getApellidoDos(),
                    empleado.getSucursal() != null ? empleado.getSucursal().getId() : null, empleado.getEstado() != null ? empleado.getEstado().getId(): null);
            return ResponseEntity.ok("Empleado actualizado con éxito");
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Eliminar un empleado
    @DeleteMapping("/{id}")
    public ResponseEntity<String> eliminarEmpleado(@PathVariable Integer id) {
        if (empleadoRepository.existsById(id)) {
            empleadoRepository.eliminarEmpleadoPorId(id);
            return ResponseEntity.ok("Empleado eliminado con éxito");
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}

