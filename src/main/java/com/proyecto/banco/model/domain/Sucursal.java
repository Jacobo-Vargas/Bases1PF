package com.proyecto.banco.model.domain;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

@Entity(name = "sucursal")
@Data
public class Sucursal implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "ciudad")
    private String ciudad;

    @Column(name = "nombre")
    private String nombre;

    @Column(name = "direccion")
    private String direccion;

    @Column(name = "telefono")
    private String telefono;

    @OneToMany
    @JsonManagedReference
    @JoinColumn(name = "sucursal_id")
    private List<Cliente> clientes;

    @OneToMany
    @JsonManagedReference
    @JoinColumn(name = "sucursal_id")
    private List<Ventanilla> ventanillas;

    @OneToMany
    @JsonManagedReference
    @JoinColumn(name = "sucursal_id")
    private List<Empleado> empleados;
}
