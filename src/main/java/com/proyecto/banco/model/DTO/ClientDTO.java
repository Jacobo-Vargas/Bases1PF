package com.proyecto.banco.model.DTO;

import lombok.Data;

import java.time.LocalDate;
import java.util.Date;

@Data
public class ClientDTO {
    private Integer id;
    private String cedula;
    private String nombre;
    private String apellidoUno;
    private String apellidoDos;
    private Date fechaNacimiento;
    private Integer tipoCliente;
    private Integer sucursal;
}
