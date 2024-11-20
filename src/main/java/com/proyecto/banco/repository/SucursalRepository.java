package com.proyecto.banco.repository;

import com.proyecto.banco.model.domain.Cliente;
import com.proyecto.banco.model.domain.Sucursal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface SucursalRepository extends JpaRepository<Sucursal, Integer> {

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO public.sucursal (ciudad, nombre, direccion, telefono) " +
            "VALUES (:ciudad, :nombre, :direccion, :telefono)", nativeQuery = true)
    void insertarSucursal(@Param("ciudad") String ciudad,
                          @Param("nombre") String nombre,
                          @Param("direccion") String direccion,
                          @Param("telefono") String telefono);


    @Modifying
    @Transactional
    @Query(value = "UPDATE public.sucursal SET ciudad = :ciudad, nombre = :nombre, direccion = :direccion, telefono = :telefono " +
            "WHERE id = :id", nativeQuery = true)
    void actualizarSucursal(@Param("id") Integer id,
                            @Param("ciudad") String ciudad,
                            @Param("nombre") String nombre,
                            @Param("direccion") String direccion,
                            @Param("telefono") String telefono);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM public.sucursal WHERE id = :id", nativeQuery = true)
    void eliminarSucursalPorId(@Param("id") Integer id);


    @Query(value = "SELECT * FROM public.sucursal WHERE id = :id", nativeQuery = true)
    Sucursal getSucursalById(@Param("id") Integer id);

    @Query(value = "SELECT * FROM public.sucursal WHERE nombre = :nombre LIMIT 1", nativeQuery = true)
    Sucursal obtenerSucursalPorNombre(@Param("nombre") String nombre);

}
