package com.proyecto.banco.repository;

import com.proyecto.banco.model.domain.TipoCliente;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TipoClienteRepository extends JpaRepository<TipoCliente, Integer> {
}
