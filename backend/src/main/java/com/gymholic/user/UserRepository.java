package com.gymholic.user;

import com.gymholic.common.enums.Role;
import com.gymholic.user.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByGoogleId(String googleId);

    boolean existsByEmail(String email);

    /** Phone numbers are shared keys (SMS targets) — one account each. */
    boolean existsByPhoneAndIdNot(String phone, Long id);

    List<User> findByRole(Role role);

    Optional<User> findFirstByRoleOrderByCreatedAtAsc(Role role);

    Optional<User> findFirstByRoleInOrderByIdAsc(Collection<Role> roles);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);
}
