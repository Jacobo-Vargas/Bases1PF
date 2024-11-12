package com.proyecto.banco.controllers;

import com.proyecto.banco.model.domain.Cliente;
import com.proyecto.banco.repository.ClienteRepository;
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
@RequestMapping("/api/clientes")
public class ClienteController {

    @Autowired
    private ClienteRepository clienteRepository;

    // Crear Cliente (POST)
    @PostMapping
    public ResponseEntity<String> crearCliente(@RequestBody Cliente cliente) {
        clienteRepository.insertarCliente(
                cliente.getCedula(),
                cliente.getNombre(),
                cliente.getApellidoUno(),
                cliente.getApellidoDos(),
                cliente.getFechaNacimiento(),
                cliente.getTipoCliente() != null ? cliente.getTipoCliente().getId() : null,
                cliente.getSucursal() != null ? cliente.getSucursal().getId() : null
        );
        return ResponseEntity.ok("Cliente creado con éxito");
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

    // Actualizar Cliente (PUT)
    @PutMapping("/{id}")
    public ResponseEntity<String> actualizarCliente(@PathVariable Integer id, @RequestBody Cliente cliente) {
        if (clienteRepository.existsById(id)) {
            cliente.setId(id);
            Cliente existente = clienteRepository.obtenerClientePorId(id);
            clienteRepository.actualizarCliente(
                    cliente.getId(),
                    cliente.getCedula(),
                    cliente.getNombre(),
                    cliente.getApellidoUno(),
                    cliente.getApellidoDos(),
                    cliente.getFechaNacimiento(),
                    cliente.getTipoCliente() != null ? cliente.getTipoCliente().getId() : null,
                    cliente.getSucursal() != null ? cliente.getSucursal().getId() : null
            );
            return ResponseEntity.ok("Cliente actualizado con éxito");
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Eliminar Cliente (DELETE)
    @DeleteMapping("/{id}")
    public ResponseEntity<String> eliminarCliente(@PathVariable Integer id) {
        if (clienteRepository.existsById(id)) {
            clienteRepository.eliminarClientePorId(id);
            return ResponseEntity.ok("Cliente eliminado con éxito");
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
