package com.proyecto.banco.repository;

import com.proyecto.banco.model.domain.Cliente;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Date;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Integer> {

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO public.cliente (cedula, nombre, apellido_uno, apellido_dos, fecha_nacimiento, tipo_cliente_id, sucursal_id) " +
            "VALUES (:cedula, :nombre, :apellidoUno, :apellidoDos, :fechaNacimiento, :tipoClienteId, :sucursalId)", nativeQuery = true)
    void insertarCliente(@Param("cedula") String cedula,
                         @Param("nombre") String nombre,
                         @Param("apellidoUno") String apellidoUno,
                         @Param("apellidoDos") String apellidoDos,
                         @Param("fechaNacimiento") Date fechaNacimiento,
                         @Param("tipoClienteId") Integer tipoClienteId,
                         @Param("sucursalId") Integer sucursalId);


    @Modifying
    @Transactional
    @Query(value = "UPDATE public.cliente SET cedula = :cedula, nombre = :nombre, apellido_uno = :apellidoUno, " +
            "apellido_dos = :apellidoDos, fecha_nacimiento = :fechaNacimiento, " +
            "tipo_cliente_id = :tipoClienteId, sucursal_id = :sucursalId WHERE id = :id", nativeQuery = true)
    void actualizarCliente(@Param("id") Integer id,
                           @Param("cedula") String cedula,
                           @Param("nombre") String nombre,
                           @Param("apellidoUno") String apellidoUno,
                           @Param("apellidoDos") String apellidoDos,
                           @Param("fechaNacimiento") Date fechaNacimiento,
                           @Param("tipoClienteId") Integer tipoClienteId,
                           @Param("sucursalId") Integer sucursalId);


    @Modifying
    @Transactional
    @Query(value = "DELETE FROM public.cliente WHERE id = :id", nativeQuery = true)
    void eliminarClientePorId(@Param("id") Integer id);

    @Query(value = "SELECT * FROM public.cliente WHERE id = :id", nativeQuery = true)
    Cliente obtenerClientePorId(@Param("id") Integer id);
}
