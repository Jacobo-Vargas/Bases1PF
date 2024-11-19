package com.proyecto.banco.controllers;

import com.proyecto.banco.model.DTO.ClientDTO;
import com.proyecto.banco.model.domain.Cliente;
import com.proyecto.banco.model.domain.TipoCliente;
import com.proyecto.banco.repository.ClienteRepository;
import com.proyecto.banco.repository.TipoClienteRepository;
import lombok.extern.slf4j.Slf4j;
import org.postgresql.util.PSQLException;
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
import java.util.Objects;

@RestController
@Slf4j
@RequestMapping("/api/clientes")
public class ClienteController {

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private TipoClienteRepository tipoClienteRepository;

    // Crear Cliente (POST)
    @PostMapping
    public ResponseEntity<Object> crearCliente(@RequestBody ClientDTO cliente) {

        if (cliente.getNombre() == null || cliente.getCedula() == null || cliente.getTipoCliente() == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","error");
            response.put("message", "Verifique los campos");
            return ResponseEntity.ok(response);
        }

        clienteRepository.insertarCliente(
                cliente.getCedula(),
                cliente.getNombre(),
                cliente.getApellidoUno(),
                cliente.getApellidoDos(),
                cliente.getFechaNacimiento(),
                cliente.getTipoCliente(),
                cliente.getSucursal()
        );

        Map<String, Object> response = new HashMap<>();
        response.put("type_message","success");
        response.put("message", "Operación realizada con exito");

        return ResponseEntity.ok(response);
    }

    // Obtener todos los Clientes (GET)
    @GetMapping
    public ResponseEntity<List<Cliente>> obtenerTodosLosClientes() {
        List<Cliente> clientes = clienteRepository.findAll();
        return ResponseEntity.ok(clientes);
    }

    // Obtener Cliente por ID (GET)
    @GetMapping("/{id}")
    public ResponseEntity<Cliente> obtenerClientePorId(@PathVariable Integer id) {
        Cliente cliente = clienteRepository.obtenerClientePorId(id);
        if (cliente != null) {
            return ResponseEntity.ok(cliente);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/cedula")
    public ResponseEntity<?> obtenerClientePorCedula(@RequestParam String cedula) {
        Cliente cliente = clienteRepository.obtenerClientePorCedula(cedula);
        if (cliente != null) {
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","success");
            response.put("message", "Se obtuvieron los datos con éxito");
            response.put("data", cliente);

            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","warning");
            response.put("message", "No se encontraron datos");
            response.put("data", null);
            return ResponseEntity.ok(response);
        }
    }

    @GetMapping("/tipo-cliente")
    public ResponseEntity<List<TipoCliente>> obtenerTipoCliente() {
        List<TipoCliente> lista = tipoClienteRepository.findAll();
        return ResponseEntity.ok(lista);
    }

    // Actualizar Cliente (PUT)
    @PutMapping("/{id}")
    public ResponseEntity<Object> actualizarCliente( @RequestBody ClientDTO cliente) {
        if (clienteRepository.existsById(cliente.getId())) {
            cliente.setId(cliente.getId());
            clienteRepository.actualizarCliente(
                    cliente.getId(),
                    cliente.getCedula(),
                    cliente.getNombre(),
                    cliente.getApellidoUno(),
                    cliente.getApellidoDos(),
                    cliente.getFechaNacimiento(),
                    cliente.getTipoCliente(),
                    cliente.getSucursal()
            );
            Map<String, Object> response = new HashMap<>();
            response.put("type_message","success");
            response.put("message", "Operación realizada con exito");
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Eliminar Cliente (DELETE)
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Object> eliminarCliente(@PathVariable Integer id) {
        if (clienteRepository.existsById(id)) {

            try {
                clienteRepository.eliminarClientePorId(id);
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
}
