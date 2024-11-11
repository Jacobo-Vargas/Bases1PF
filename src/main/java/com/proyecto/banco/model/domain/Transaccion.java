package com.proyecto.banco.model.domain;

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
import java.math.BigDecimal;
import java.util.Date;

@Data
@Entity(name = "transaccion")
public class Transaccion implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "valor")
    private BigDecimal valor;

    @Column(name = "fecha_transaccion")
    private Date fechaTransaccion;

    @OneToOne
    @JoinColumn(name = "tipo_transaccion_id", referencedColumnName = "id")
    private TipoTransaccion tipoTransaccion;

    @ManyToOne
    @JoinColumn(name = "estado_id", referencedColumnName = "id")
    private Estado estado;

    @ManyToOne
    @JoinColumn(name = "cuenta_id", referencedColumnName = "id")
    private Cuenta cuenta;

}
