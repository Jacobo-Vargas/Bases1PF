package com.proyecto.banco.model.domain;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.math.BigDecimal;

@Data
@Entity(name = "empleado")
public class Empleado implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "nombre")
    private String nombre;

    @Column(name = "cargo")
    private String cargo;

    @Column(name = "fecha_contratacion")
    private String fechaContratacion;

    @Column(name = "salario")
    private BigDecimal salario;

    @Column(name = "apellido_uno")
    private String apellidoUno;

    @Column(name = "apellido_dos")
    private String apellidoDos;

    @ManyToOne
    @JsonBackReference
    @JoinColumn(name = "sucursal_id", referencedColumnName = "id")
    private Sucursal sucursal;

    @ManyToOne
    @JoinColumn(name = "estado_id", referencedColumnName = "id")
    private Estado estado;

}
