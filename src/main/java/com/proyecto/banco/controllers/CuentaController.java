package com.proyecto.banco.controllers;

import com.proyecto.banco.model.DTO.CuentaDTO;
import com.proyecto.banco.model.domain.Cliente;
import com.proyecto.banco.model.domain.Cuenta;
import com.proyecto.banco.model.domain.Producto;
import com.proyecto.banco.repository.ClienteRepository;
import com.proyecto.banco.repository.CuentaRepository;
import com.proyecto.banco.repository.ProductoRepository;
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

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@Slf4j
@RequestMapping("/api/cuenta")
public class CuentaController {

    @Autowired
    private CuentaRepository cuentaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @PostMapping
    public ResponseEntity<Object> crearCuenta(@RequestBody CuentaDTO cuenta) {

        if (cuenta.getNumeroCuenta() == null || cuenta.getProductoId() == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","error");
            response.put("message", "Verifique los campos");
            return ResponseEntity.ok(response);
        }
        cuentaRepository.insertarCuenta(
                cuenta.getNumeroCuenta(),
                new Date(),
                cuenta.getClientId(),
                cuenta.getProductoId()
        );

        Map<String, Object> response = new HashMap<>();
        response.put("type_message","success");
        response.put("message", "Operación realizada con exito");

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<Cuenta>> obtenerTodasLasCuentas() {
        List<Cuenta> clientes = cuentaRepository.findAll();
        return ResponseEntity.ok(clientes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Cuenta> obtenerCuentaPorId(@PathVariable Integer id) {
        Cuenta cuenta = cuentaRepository.getCuentaById(id);
        if (cuenta != null) {
            return ResponseEntity.ok(cuenta);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/numero/{numeroCuenta}")
    public ResponseEntity<?> obtenerCuentaPorNumero(@PathVariable Integer numeroCuenta) {
        Cuenta cuenta = cuentaRepository.obtenerCuentaPorNumeroCuenta(numeroCuenta);
        if (cuenta != null) {
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","success");
            response.put("message", "Se obtuvieron los datos con éxito");
            response.put("data", cuenta);

            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","warning");
            response.put("message", "No se encontraron datos");
            response.put("data", null);
            return ResponseEntity.ok(response);
        }
    }

    @GetMapping("/productos")
    public ResponseEntity<List<Producto>> obtenerProductos() {
        List<Producto> lista = productoRepository.findAll();
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/clientes")
    public ResponseEntity<List<Cliente>> obtenerClientes() {
        List<Cliente> lista = clienteRepository.findAll();
        return ResponseEntity.ok(lista);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> actualizarCuenta( @RequestBody CuentaDTO cuenta) {
        if (cuentaRepository.existsById(cuenta.getId())) {
            cuenta.setId(cuenta.getId());
            cuentaRepository.actualizarCuenta(
                    cuenta.getId(),
                    cuenta.getNumeroCuenta(),
                    new Date(),
                    cuenta.getClientId(),
                    cuenta.getProductoId()

            );
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","success");
            response.put("message", "Operación realizada con exito");
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Eliminar Cuenta (DELETE)
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Object> eliminarCuenta(@PathVariable Integer id) {
        if (cuentaRepository.existsById(id)) {

            try {
                Cuenta cuenta = cuentaRepository.getCuentaById(id);
                cuenta.setCliente(null);
                cuentaRepository.saveAndFlush(cuenta);
                cuentaRepository.eliminarCuentaPorId(id);
                Map<String, Object> response = new HashMap<>();
                response.put("type_message","success");
                response.put("message", "Operación realizada con exito");
                return ResponseEntity.ok(response);

            } catch (Exception e) {
                log.info("Tiene datos asociados.");
            }
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","error");
            response.put("message", "No se pudo eliminar, tiene datos asociados");
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.notFound().build();
        }
    }


}
