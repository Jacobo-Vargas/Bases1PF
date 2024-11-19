package com.proyecto.banco.repository;

import com.proyecto.banco.model.domain.Cliente;
import com.proyecto.banco.model.domain.Empleado;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Date;

@Repository
public interface EmpleadoRepository extends JpaRepository<Empleado, Integer> {

    @Query(value = "SELECT * FROM public.empleado WHERE salario = :salario order by fecha_contratacion Desc LIMIT 1", nativeQuery = true)
    Empleado obtenerEmpleadoPorSalario(@Param("salario") BigDecimal salario);


    @Query(value = "SELECT * FROM public.empleado WHERE id = :id", nativeQuery = true)
    Empleado getEmpleadoById(@Param("id") Integer id);

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO public.empleado (nombre, cargo, fecha_contratacion, salario, apellido_uno, apellido_dos, sucursal_id, estado_id) " +
            "VALUES (:nombre, :cargo, :fechaContratacion, :salario, :apellidoUno, :apellidoDos, :sucursalId, :estadoId)", nativeQuery = true)
    void insertarEmpleado(@Param("nombre") String nombre,
                          @Param("cargo") String cargo,
                          @Param("fechaContratacion") Date fechaContratacion,
                          @Param("salario") BigDecimal salario,
                          @Param("apellidoUno") String apellidoUno,
                          @Param("apellidoDos") String apellidoDos,
                          @Param("sucursalId") Integer sucursalId,
                          @Param("estadoId") Integer estadoId);

    @Modifying
    @Transactional
    @Query(value = "UPDATE public.empleado SET nombre = :nombre, cargo = :cargo, fecha_contratacion = :fechaContratacion, " +
            "salario = :salario, apellido_uno = :apellidoUno, apellido_dos = :apellidoDos, " +
            "sucursal_id = :sucursalId, estado_id = :estadoId WHERE id = :id", nativeQuery = true)
    void actualizarEmpleado(@Param("id") Integer id,
                            @Param("nombre") String nombre,
                            @Param("cargo") String cargo,
                            @Param("fechaContratacion") Date fechaContratacion,
                            @Param("salario") BigDecimal salario,
                            @Param("apellidoUno") String apellidoUno,
                            @Param("apellidoDos") String apellidoDos,
                            @Param("sucursalId") Integer sucursalId,
                            @Param("estadoId") Integer estadoId);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM public.empleado WHERE id = :id", nativeQuery = true)
    void eliminarEmpleadoPorId(@Param("id") Integer id);

}
