package com.proyecto.banco.repository;

import com.proyecto.banco.model.domain.Cliente;
import com.proyecto.banco.model.domain.Cuenta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;

@Repository
public interface CuentaRepository extends JpaRepository<Cuenta, Integer> {

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO public.cuenta (numero_cuenta, fecha_creacion, cliente_id, producto_id) " +
            "VALUES (:numeroCuenta, :fechaCreacion, :clienteId, :productoId)", nativeQuery = true)
    void insertarCuenta(@Param("numeroCuenta") Integer numeroCuenta,
                        @Param("fechaCreacion") Date fechaCreacion,
                        @Param("clienteId") Integer clienteId,
                        @Param("productoId") Integer productoId);

    @Modifying
    @Transactional
    @Query(value = "UPDATE public.cuenta SET numero_cuenta = :numeroCuenta, fecha_creacion = :fechaCreacion, " +
            "cliente_id = :clienteId, producto_id = :productoId WHERE id = :id", nativeQuery = true)
    void actualizarCuenta(@Param("id") Integer id,
                          @Param("numeroCuenta") Integer numeroCuenta,
                          @Param("fechaCreacion") Date fechaCreacion,
                          @Param("clienteId") Integer clienteId,
                          @Param("productoId") Integer productoId);

    // Método para eliminar una Cuenta
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM public.cuenta WHERE id = :id", nativeQuery = true)
    void eliminarCuentaPorId(@Param("id") Integer id);

    @Query(value = "SELECT * FROM public.cuenta WHERE id = :id", nativeQuery = true)
    Cuenta getCuentaById(@Param("id") Integer id);

    @Query(value = "SELECT * FROM public.cuenta WHERE numero_cuenta = :cuenta LIMIT 1", nativeQuery = true)
    Cuenta obtenerCuentaPorNumeroCuenta(@Param("cuenta") Integer cuenta);

}
