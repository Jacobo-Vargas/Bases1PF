package com.proyecto.banco.repository;

import com.proyecto.banco.model.domain.Estado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EstadosRepository extends JpaRepository<Estado, Integer> {
}
