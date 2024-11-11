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
import java.util.Date;

@Entity(name = "solicitud")
@Data
public class Solicitud implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "fecha_solicitud")
    private Date fechaSolicitud;

    @Column(name = "valor")
    private BigDecimal valor;

    @Column(name = "moneda")
    private String moneda;

    @ManyToOne
    @JsonBackReference
    @JoinColumn(name = "cliente_id", referencedColumnName = "id")
    private Cliente cliente;

    @ManyToOne
    @JsonBackReference
    @JoinColumn(name = "producto_id", referencedColumnName = "id")
    private Producto producto;
}
