package com.gymholic.whitelist;

import com.gymholic.whitelist.entity.WhitelistEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WhitelistRepository extends JpaRepository<WhitelistEntry, Long> {

    Optional<WhitelistEntry> findByEmailAndSourceIgnoreCase(String email, String source);

    List<WhitelistEntry> findAllByOrderByCreatedAtDesc();
}
