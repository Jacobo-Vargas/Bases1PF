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

@Data
@Entity(name = "ventanilla")
public class Ventanilla implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "valor_base")
    private BigDecimal valorBase;

    @Column(name = "fecha_apertura")
    private Date fechaApertura;

    @Column(name = "fecha_cierre")
    private Date fechaCierre;

    @ManyToOne
    @JsonBackReference
    @JoinColumn(name = "sucursal_id", referencedColumnName = "id")
    private Sucursal sucursal;
}
