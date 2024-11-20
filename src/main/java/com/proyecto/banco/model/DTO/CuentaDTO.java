package com.proyecto.banco.model.DTO;

import lombok.Data;

import java.util.Date;

@Data
public class CuentaDTO {

    private Integer id;
    private Integer numeroCuenta;
    private Date fechaCreacion;
    private Integer clientId;
    private Integer productoId;
}
