package com.proyecto.banco.model.domain;

import com.proyecto.banco.model.domain.enums.FormatoFactura;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

@Data
@Entity(name = "factura")
public class Factura implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Date fecha;

    @Enumerated(EnumType.STRING)
    @Column(name = "formato")
    private FormatoFactura formato;

    @Column(name = "valor")
    private BigDecimal valor;

    @OneToOne
    @JoinColumn(name = "transaccion_id", referencedColumnName = "id")
    private Transaccion transaccion;
}
