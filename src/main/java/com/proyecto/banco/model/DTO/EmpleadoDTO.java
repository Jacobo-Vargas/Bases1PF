package com.proyecto.banco.model.DTO;

import com.proyecto.banco.model.domain.Estado;
import com.proyecto.banco.model.domain.Sucursal;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;

@Data
public class EmpleadoDTO {

    private Integer id;
    private String nombre;
    private String cargo;
    private Date fechaContratacion;
    private BigDecimal salario;
    private String apellidoUno;
    private String apellidoDos;
    private Integer sucursal;
    private Integer estado;
}
