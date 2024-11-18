package com.proyecto.banco.controllers;

import com.proyecto.banco.model.domain.Cliente;
import com.proyecto.banco.model.domain.Sucursal;
import com.proyecto.banco.repository.SucursalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sucursal")
public class SucursalController {


    @Autowired
    private SucursalRepository sucursalRepository;

    @GetMapping
    public ResponseEntity<List<Sucursal>> obtenerTodosLosClientes() {
        List<Sucursal> sucursales = sucursalRepository.findAll();
        return ResponseEntity.ok(sucursales);
    }
}
