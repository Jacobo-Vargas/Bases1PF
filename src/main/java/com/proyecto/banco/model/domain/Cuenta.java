package com.proyecto.banco.model.domain;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.Date;

@Data
@Entity(name = "cuenta")
public class Cuenta implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "numero_cuenta")
    private Integer numeroCuenta;

    @Column(name = "fecha_creacion")
    private Date fechaCreacion;

    @ManyToOne
    @JoinColumn(name = "cliente_id", referencedColumnName = "id")
    private Cliente cliente;


    @OneToOne
    @JoinColumn(name = "producto_id", referencedColumnName = "id")
    private Producto producto;
}
