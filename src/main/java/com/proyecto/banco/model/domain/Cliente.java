package com.proyecto.banco.model.domain;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.Date;
import java.util.List;

@Entity(name = "cliente")
@Data
public class Cliente implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "cedula")
    private String cedula;

    @Column(name = "nombre")
    private String nombre;

    @Column(name = "apellido_uno")
    private String apellidoUno;

    @Column(name = "apellido_dos")
    private String apellidoDos;

    @Column(name = "fecha_nacimiento")
    private Date fechaNacimiento;

    @JoinColumn(name = "tipo_cliente_id", referencedColumnName = "id")
    @OneToOne
    private TipoCliente tipoCliente;

    @ManyToOne
    @JsonBackReference
    @JoinColumn(name = "sucursal_id", referencedColumnName = "id")
    private Sucursal sucursal;

    @OneToMany(mappedBy = "cliente")
    @JsonManagedReference
    private List<Cuenta> cuentas;

    @OneToMany(mappedBy = "cliente")
    @JsonManagedReference
    private List<Solicitud> solicitudes;
}
