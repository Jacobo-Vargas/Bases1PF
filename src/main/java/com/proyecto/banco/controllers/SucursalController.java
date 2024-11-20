package com.proyecto.banco.controllers;

import com.proyecto.banco.model.DTO.ClientDTO;
import com.proyecto.banco.model.DTO.SucursalDTO;
import com.proyecto.banco.model.domain.Cliente;
import com.proyecto.banco.model.domain.Sucursal;
import com.proyecto.banco.repository.SucursalRepository;
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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/sucursal")
public class SucursalController {


    @Autowired
    private SucursalRepository sucursalRepository;

    @PostMapping
    public ResponseEntity<?> crearSucursal(@RequestBody SucursalDTO sucursal) {

        if (sucursal.getNombre() == null || sucursal.getCiudad() == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","error");
            response.put("message", "Verifique los campos");
            return ResponseEntity.ok(response);
        }
        sucursalRepository.insertarSucursal(
                sucursal.getCiudad(),
                sucursal.getNombre(),
                sucursal.getDireccion(),
                sucursal.getTelefono()
        );
        Map<String, Object> response = new HashMap<>();
        response.put("type_message","success");
        response.put("message", "Operación realizada con exito");

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<Sucursal>> obtenerTodosLasSucursales() {
        List<Sucursal> sucursales = sucursalRepository.findAll();
        return ResponseEntity.ok(sucursales);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sucursal> obtenerSucursalPorId(@PathVariable Integer id) {
        Sucursal sucursal = sucursalRepository.getSucursalById(id);
        if (sucursal != null) {
            return ResponseEntity.ok(sucursal);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/nombre")
    public ResponseEntity<?> obtenerSucursalPorNombre(@RequestParam String nombre) {
        Sucursal sucursal = sucursalRepository.obtenerSucursalPorNombre(nombre);
        if (sucursal != null) {
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","success");
            response.put("message", "Se obtuvieron los datos con éxito");
            response.put("data", sucursal);

            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","warning");
            response.put("message", "No se encontraron datos");
            response.put("data", null);
            return ResponseEntity.ok(response);
        }
    }

    // Eliminar Sucursal (DELETE)
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Object> eliminarSucursal(@PathVariable Integer id) {
        if (sucursalRepository.existsById(id)) {

            try {
                sucursalRepository.eliminarSucursalPorId(id);
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

    // Actualizar Sucursal (PUT)
    @PutMapping("/{id}")
    public ResponseEntity<Object> actualizarSucursal( @RequestBody SucursalDTO sucursal) {
        if (sucursalRepository.existsById(sucursal.getId())) {
            sucursal.setId(sucursal.getId());
            sucursalRepository.actualizarSucursal(
                    sucursal.getId(),
                    sucursal.getCiudad(),
                    sucursal.getNombre(),
                    sucursal.getDireccion(),
                    sucursal.getTelefono()
            );
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","success");
            response.put("message", "Operación realizada con exito");
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
