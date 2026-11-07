--
-- PostgreSQL database dump
--

\restrict bpp5c1w0ySqWiZXkIW0qOgSTgM9057sSjcNs5FUanjd873fZaeDb7ed3iri3z3e

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: vida_salud; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA vida_salud;


ALTER SCHEMA vida_salud OWNER TO postgres;

--
-- Name: estado_cita; Type: TYPE; Schema: vida_salud; Owner: postgres
--

CREATE TYPE vida_salud.estado_cita AS ENUM (
    'PROGRAMADA',
    'CONFIRMADA',
    'ATENDIDA',
    'CANCELADA',
    'INASISTENCIA'
);


ALTER TYPE vida_salud.estado_cita OWNER TO postgres;

--
-- Name: estado_notificacion; Type: TYPE; Schema: vida_salud; Owner: postgres
--

CREATE TYPE vida_salud.estado_notificacion AS ENUM (
    'PENDIENTE',
    'ENVIADA',
    'FALLIDA'
);


ALTER TYPE vida_salud.estado_notificacion OWNER TO postgres;

--
-- Name: estado_usuario; Type: TYPE; Schema: vida_salud; Owner: postgres
--

CREATE TYPE vida_salud.estado_usuario AS ENUM (
    'ACTIVO',
    'INACTIVO',
    'BLOQUEADO'
);


ALTER TYPE vida_salud.estado_usuario OWNER TO postgres;

--
-- Name: tipo_accion; Type: TYPE; Schema: vida_salud; Owner: postgres
--

CREATE TYPE vida_salud.tipo_accion AS ENUM (
    'CREAR',
    'MODIFICAR',
    'ELIMINAR',
    'LOGIN',
    'LOGOUT',
    'BLOQUEO',
    'INACTIVAR',
    'REGISTRAR',
    'RENOVAR',
    'REACTIVAR'
);


ALTER TYPE vida_salud.tipo_accion OWNER TO postgres;

--
-- Name: tipo_bloqueo; Type: TYPE; Schema: vida_salud; Owner: postgres
--

CREATE TYPE vida_salud.tipo_bloqueo AS ENUM (
    'FERIADO',
    'LICENCIA',
    'OTRO'
);


ALTER TYPE vida_salud.tipo_bloqueo OWNER TO postgres;

--
-- Name: tipo_reporte; Type: TYPE; Schema: vida_salud; Owner: postgres
--

CREATE TYPE vida_salud.tipo_reporte AS ENUM (
    'CITAS_PERIODO',
    'ATENCIONES_MEDICO_ESPECIALIDAD',
    'CONTROL_ASISTENCIA',
    'PACIENTES_REGISTRADOS'
);


ALTER TYPE vida_salud.tipo_reporte OWNER TO postgres;

--
-- Name: fn_bitacora_cita(); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.fn_bitacora_cita() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE v_id bigint; v_accion tipo_accion;
BEGIN
  v_accion := CASE TG_OP WHEN 'INSERT' THEN 'CREAR' WHEN 'UPDATE' THEN 'MODIFICAR'
                         ELSE 'ELIMINAR' END;
  v_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id_cita ELSE NEW.id_cita END;
  INSERT INTO bitacora (id_usuario, modulo, tipo_accion, tabla_afectada, id_registro_afectado, detalle)
  VALUES (NULLIF(current_setting('app.id_usuario', true), '')::bigint, 'P6 Gestión de Citas',
          v_accion, 'cita', v_id, TG_OP || ' cita ' ||
          CASE WHEN TG_OP = 'DELETE' THEN OLD.codigo ELSE NEW.codigo END);
  RETURN NULL;
END $$;


ALTER FUNCTION vida_salud.fn_bitacora_cita() OWNER TO postgres;

--
-- Name: fn_cita_atendida_inmutable(); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.fn_cita_atendida_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.estado = 'ATENDIDA' THEN
    RAISE EXCEPTION 'La cita % ya fue ATENDIDA y no puede modificarse', OLD.codigo;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;


ALTER FUNCTION vida_salud.fn_cita_atendida_inmutable() OWNER TO postgres;

--
-- Name: fn_cita_bloqueo_agenda(); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.fn_cita_bloqueo_agenda() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.estado <> 'CANCELADA' AND EXISTS (
       SELECT 1 FROM bloqueo_agenda b
       WHERE NEW.fecha BETWEEN b.fecha_inicio AND b.fecha_fin
         AND (b.aplica_a_todos OR b.id_medico = NEW.id_medico)) THEN
    RAISE EXCEPTION 'No se puede agendar el %: la agenda está bloqueada', NEW.fecha;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION vida_salud.fn_cita_bloqueo_agenda() OWNER TO postgres;

--
-- Name: fn_cita_crear_notificacion(); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.fn_cita_crear_notificacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO notificacion (id_cita, mensaje, fecha_programada)
  VALUES (NEW.id_cita,
          'Recordatorio: cita ' || NEW.codigo || ' el ' || to_char(NEW.fecha, 'DD/MM/YYYY')
          || ' a las ' || to_char(NEW.hora_inicio, 'HH24:MI'),
          (NEW.fecha - 1) + TIME '09:00');
  RETURN NULL;
END $$;


ALTER FUNCTION vida_salud.fn_cita_crear_notificacion() OWNER TO postgres;

--
-- Name: fn_cita_dentro_horario(); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.fn_cita_dentro_horario() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM horario h
                 WHERE h.id_medico = NEW.id_medico AND h.activo
                   AND h.dia_semana = EXTRACT(ISODOW FROM NEW.fecha)
                   AND NEW.hora_inicio >= h.hora_inicio AND NEW.hora_fin <= h.hora_fin) THEN
    RAISE EXCEPTION 'La cita (% %) está fuera del horario del médico %',
      NEW.fecha, NEW.hora_inicio, NEW.id_medico;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION vida_salud.fn_cita_dentro_horario() OWNER TO postgres;

--
-- Name: fn_cita_historial_estado(); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.fn_cita_historial_estado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO historial_estado_cita (id_cita, id_usuario, estado_anterior, estado_nuevo,
                                     fecha_anterior, hora_anterior, motivo)
  VALUES (NEW.id_cita,
          COALESCE(NULLIF(current_setting('app.id_usuario', true), '')::bigint, NEW.id_usuario_registro),
          OLD.estado, NEW.estado, OLD.fecha, OLD.hora_inicio,
          COALESCE(NEW.motivo_cancelacion, 'Cambio de ' || OLD.estado || ' a ' || NEW.estado));
  RETURN NEW;
END $$;


ALTER FUNCTION vida_salud.fn_cita_historial_estado() OWNER TO postgres;

--
-- Name: fn_cita_persona_activa(); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.fn_cita_persona_activa() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM persona WHERE id_persona IN (NEW.id_medico, NEW.id_paciente)
             AND NOT activo) THEN
    RAISE EXCEPTION 'El médico o el paciente de la cita está inactivo';
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION vida_salud.fn_cita_persona_activa() OWNER TO postgres;

--
-- Name: fn_cita_sin_solapamiento(); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.fn_cita_sin_solapamiento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.estado <> 'CANCELADA' AND EXISTS (
       SELECT 1 FROM cita c
       WHERE c.id_cita <> NEW.id_cita AND c.estado <> 'CANCELADA' AND c.fecha = NEW.fecha
         AND (c.id_medico = NEW.id_medico OR c.id_paciente = NEW.id_paciente)
         AND c.hora_inicio < NEW.hora_fin AND c.hora_fin > NEW.hora_inicio) THEN
    RAISE EXCEPTION 'La cita se cruza con otra del mismo médico o paciente el %', NEW.fecha;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION vida_salud.fn_cita_sin_solapamiento() OWNER TO postgres;

--
-- Name: fn_info_medica_fecha_actualizacion(); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.fn_info_medica_fecha_actualizacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.fecha_actualizacion := now();
  RETURN NEW;
END $$;


ALTER FUNCTION vida_salud.fn_info_medica_fecha_actualizacion() OWNER TO postgres;

--
-- Name: fn_paciente_no_eliminar(); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.fn_paciente_no_eliminar() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM cita WHERE id_paciente = OLD.id_persona) THEN
    RAISE EXCEPTION 'El paciente % tiene citas registradas: use sp_desactivar_paciente', OLD.codigo;
  END IF;
  RETURN OLD;
END $$;


ALTER FUNCTION vida_salud.fn_paciente_no_eliminar() OWNER TO postgres;

--
-- Name: sp_asignar_permiso_rol(bigint, bigint, bigint); Type: PROCEDURE; Schema: vida_salud; Owner: postgres
--

CREATE PROCEDURE vida_salud.sp_asignar_permiso_rol(IN p_rol bigint, IN p_permiso bigint, IN p_usuario bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO rol_permiso (id_rol, id_permiso) VALUES (p_rol, p_permiso)
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    INSERT INTO bitacora (id_usuario, modulo, tipo_accion, tabla_afectada, id_registro_afectado, detalle)
    VALUES (p_usuario, 'P2 Administración de Usuarios RBAC', 'CREAR', 'rol_permiso', p_rol,
            'Permiso ' || p_permiso || ' asignado al rol ' || p_rol);
  ELSE
    RAISE NOTICE 'El rol % ya tenía el permiso %', p_rol, p_permiso;
  END IF;
END $$;


ALTER PROCEDURE vida_salud.sp_asignar_permiso_rol(IN p_rol bigint, IN p_permiso bigint, IN p_usuario bigint) OWNER TO postgres;

--
-- Name: sp_cancelar_cita(bigint, bigint, character varying); Type: PROCEDURE; Schema: vida_salud; Owner: postgres
--

CREATE PROCEDURE vida_salud.sp_cancelar_cita(IN p_cita bigint, IN p_usuario bigint, IN p_motivo character varying)
    LANGUAGE plpgsql
    SET search_path TO 'vida_salud'
    AS $$
DECLARE
  v_estado_anterior estado_cita;
  v_codigo varchar(12);
BEGIN
  -- 1. Validar que el motivo no sea nulo ni vacío (CU24)
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'El motivo de cancelación es obligatorio';
  END IF;

  -- Guardar variable de sesión (por si tienes triggers de auditoría adicionales)
  PERFORM set_config('app.id_usuario', p_usuario::text, true);

  -- 2. Obtener estado actual y bloquear la fila para evitar concurrencia
  SELECT estado, codigo
    INTO v_estado_anterior, v_codigo
    FROM cita
   WHERE id_cita = p_cita
     AND estado IN ('PROGRAMADA', 'CONFIRMADA')
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La cita % no existe o no puede cancelarse (solo citas PROGRAMADAS o CONFIRMADAS)', p_cita;
  END IF;

  -- 3. Actualizar la cita a CANCELADA (libera el cupo automáticamente gracias al índice parcial)
  UPDATE cita
     SET estado = 'CANCELADA',
         motivo_cancelacion = btrim(p_motivo)
   WHERE id_cita = p_cita;

  -- 4. Registrar el cambio en el historial de estados (CU24, CU25)
  INSERT INTO historial_estado_cita (
    id_cita, id_usuario, estado_anterior, estado_nuevo, motivo
  )
  VALUES (
    p_cita, p_usuario, v_estado_anterior, 'CANCELADA', btrim(p_motivo)
  );

  -- 5. Si tenía recordatorios telefónicos PENDIENTES, eliminarlos para que recepción no llame (CU34)
  DELETE FROM notificacion
   WHERE id_cita = p_cita
     AND estado = 'PENDIENTE';

  -- 6. Registrar en bitácora (CU10)
  INSERT INTO bitacora (
    id_usuario, modulo, tipo_accion, tabla_afectada, id_registro_afectado, detalle
  )
  VALUES (
    p_usuario, 'P6 Gestión de Citas', 'MODIFICAR', 'cita', p_cita,
    'Cancelación de cita ' || v_codigo || '. Motivo: ' || btrim(p_motivo)
  );
END $$;


ALTER PROCEDURE vida_salud.sp_cancelar_cita(IN p_cita bigint, IN p_usuario bigint, IN p_motivo character varying) OWNER TO postgres;

--
-- Name: sp_confirmar_por_llamada(bigint, bigint, boolean); Type: PROCEDURE; Schema: vida_salud; Owner: postgres
--

CREATE PROCEDURE vida_salud.sp_confirmar_por_llamada(IN p_notificacion bigint, IN p_usuario bigint, IN p_exito boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE v_cita bigint;
BEGIN
  UPDATE notificacion
     SET estado = CASE WHEN p_exito THEN 'ENVIADA' ELSE 'FALLIDA' END::estado_notificacion,
         id_usuario_gestion = p_usuario, fecha_envio = now(), intentos = intentos + 1
   WHERE id_notificacion = p_notificacion
  RETURNING id_cita INTO v_cita;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notificación % inexistente', p_notificacion;
  END IF;
  IF p_exito THEN
    PERFORM set_config('app.id_usuario', p_usuario::text, true);
    UPDATE cita SET estado = 'CONFIRMADA' WHERE id_cita = v_cita AND estado = 'PROGRAMADA';
  END IF;
END $$;


ALTER PROCEDURE vida_salud.sp_confirmar_por_llamada(IN p_notificacion bigint, IN p_usuario bigint, IN p_exito boolean) OWNER TO postgres;

--
-- Name: sp_desactivar_paciente(bigint, bigint); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.sp_desactivar_paciente(p_paciente bigint, p_usuario bigint) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE v_n integer;
BEGIN
  PERFORM set_config('app.id_usuario', p_usuario::text, true);
  UPDATE persona SET activo = false WHERE id_persona = p_paciente;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paciente % inexistente', p_paciente;
  END IF;
  UPDATE cita SET estado = 'CANCELADA', motivo_cancelacion = 'Paciente dado de baja'
   WHERE id_paciente = p_paciente AND fecha >= CURRENT_DATE
     AND estado IN ('PROGRAMADA', 'CONFIRMADA');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  INSERT INTO bitacora (id_usuario, modulo, tipo_accion, tabla_afectada, id_registro_afectado, detalle)
  VALUES (p_usuario, 'P4 Gestión de Pacientes', 'MODIFICAR', 'persona', p_paciente,
          'Paciente desactivado; citas canceladas: ' || v_n);
  RETURN v_n;
END $$;


ALTER FUNCTION vida_salud.sp_desactivar_paciente(p_paciente bigint, p_usuario bigint) OWNER TO postgres;

--
-- Name: sp_disponibilidad_medico(bigint, date); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.sp_disponibilidad_medico(p_medico bigint, p_fecha date) RETURNS TABLE(hora_inicio time without time zone, hora_fin time without time zone)
    LANGUAGE sql
    AS $$
  SELECT s::time, (s + make_interval(mins => h.duracion_bloque_min))::time
  FROM horario h
  CROSS JOIN LATERAL generate_series(p_fecha + h.hora_inicio,
        p_fecha + h.hora_fin - make_interval(mins => h.duracion_bloque_min),
        make_interval(mins => h.duracion_bloque_min)) AS s
  WHERE h.id_medico = p_medico AND h.activo
    AND h.dia_semana = EXTRACT(ISODOW FROM p_fecha)
    AND NOT EXISTS (SELECT 1 FROM bloqueo_agenda b
                    WHERE p_fecha BETWEEN b.fecha_inicio AND b.fecha_fin
                      AND (b.aplica_a_todos OR b.id_medico = p_medico))
    AND NOT EXISTS (SELECT 1 FROM cita c
                    WHERE c.id_medico = p_medico AND c.fecha = p_fecha
                      AND c.estado <> 'CANCELADA' AND c.hora_inicio = s::time)
  ORDER BY 1;
$$;


ALTER FUNCTION vida_salud.sp_disponibilidad_medico(p_medico bigint, p_fecha date) OWNER TO postgres;

--
-- Name: sp_generar_lista_llamadas(date); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.sp_generar_lista_llamadas(p_fecha date) RETURNS TABLE(codigo character varying, paciente text, telefono character varying, medico text, hora time without time zone)
    LANGUAGE sql
    AS $$
  SELECT c.codigo, pp.nombres || ' ' || pp.apellidos, pp.telefono,
         pm.nombres || ' ' || pm.apellidos, c.hora_inicio
  FROM cita c
  JOIN persona pp ON pp.id_persona = c.id_paciente
  JOIN persona pm ON pm.id_persona = c.id_medico
  WHERE c.fecha = p_fecha AND c.estado = 'PROGRAMADA'
  ORDER BY c.hora_inicio;
$$;


ALTER FUNCTION vida_salud.sp_generar_lista_llamadas(p_fecha date) OWNER TO postgres;

--
-- Name: sp_programar_cita(bigint, bigint, bigint, bigint, date, time without time zone, character varying); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.sp_programar_cita(p_paciente bigint, p_medico bigint, p_especialidad bigint, p_usuario bigint, p_fecha date, p_hora time without time zone, p_motivo character varying) RETURNS character varying
    LANGUAGE plpgsql
    SET search_path TO 'vida_salud'
    AS $$
DECLARE
  v_dur smallint;
  v_fin time;
  v_codigo varchar(12);
  v_id bigint;
BEGIN
  -- 1. Validar que el paciente exista y esté activo (CU15)
  IF NOT EXISTS (
    SELECT 1 FROM paciente pac
    JOIN persona per ON per.id_persona = pac.id_persona
    WHERE pac.id_persona = p_paciente AND per.activo = true
  ) THEN
    RAISE EXCEPTION 'El paciente % no existe o se encuentra inactivo', p_paciente;
  END IF;

  -- 2. Validar que el médico esté activo (CU19) y atienda la especialidad (CU17)
  IF NOT EXISTS (
    SELECT 1 FROM medico_especialidad me
    JOIN persona per ON per.id_persona = me.id_medico
    WHERE me.id_medico = p_medico
      AND me.id_especialidad = p_especialidad
      AND per.activo = true
  ) THEN
    RAISE EXCEPTION 'El médico % no está activo o no atiende la especialidad %', p_medico, p_especialidad;
  END IF;

  -- 3. Validar horario del médico y que la cita entera quepa dentro del turno (CU18, CU20)
  SELECT duracion_bloque_min, p_hora + make_interval(mins => duracion_bloque_min)
    INTO v_dur, v_fin
    FROM horario
   WHERE id_medico = p_medico
     AND activo = true
     AND dia_semana = EXTRACT(ISODOW FROM p_fecha)
     AND p_hora >= hora_inicio
     AND (p_hora + make_interval(mins => duracion_bloque_min)) <= hora_fin
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La hora % del % está fuera del horario de atención del médico', p_hora, p_fecha;
  END IF;

  -- 4. Validar bloqueos de agenda por feriados o licencias (CU33)
  IF EXISTS (
    SELECT 1 FROM bloqueo_agenda
     WHERE p_fecha BETWEEN fecha_inicio AND fecha_fin
       AND (aplica_a_todos = true OR id_medico = p_medico)
  ) THEN
    RAISE EXCEPTION 'La agenda está bloqueada en la fecha %', p_fecha;
  END IF;

  -- 5. Validar superposición de citas para el médico o el paciente (CU22)
  IF EXISTS (
    SELECT 1 FROM cita
     WHERE estado <> 'CANCELADA'
       AND fecha = p_fecha
       AND (id_medico = p_medico OR id_paciente = p_paciente)
       AND hora_inicio < v_fin
       AND hora_fin > p_hora
  ) THEN
    RAISE EXCEPTION 'Cita duplicada: el médico o el paciente ya tiene una cita en ese horario';
  END IF;

  -- 6. Generar código correlativo CM-XXXX evitando condiciones de carrera
  LOCK TABLE cita IN SHARE ROW EXCLUSIVE MODE;
  SELECT 'CM-' || lpad((COALESCE(MAX(substr(codigo, 4)::int), 0) + 1)::text, 4, '0')
    INTO v_codigo
    FROM cita;

  -- 7. Insertar la cita (CU21)
  INSERT INTO cita (
    codigo, id_paciente, id_medico, id_especialidad, id_usuario_registro,
    fecha, hora_inicio, hora_fin, motivo_consulta
  )
  VALUES (
    v_codigo, p_paciente, p_medico, p_especialidad, p_usuario,
    p_fecha, p_hora, v_fin, p_motivo
  )
  RETURNING id_cita INTO v_id;

  -- 8. Registrar estado inicial en el historial (CU25)
  INSERT INTO historial_estado_cita (
    id_cita, id_usuario, estado_anterior, estado_nuevo, motivo
  )
  VALUES (
    v_id, p_usuario, NULL, 'PROGRAMADA', 'Registro de la cita (CU21)'
  );

  -- 9. Registrar acción en bitácora (CU10)
  INSERT INTO bitacora (
    id_usuario, modulo, tipo_accion, tabla_afectada, id_registro_afectado, detalle
  )
  VALUES (
    p_usuario, 'P6 Gestión de Citas', 'CREAR', 'cita', v_id,
    'Programación de cita ' || v_codigo || ' para fecha ' || p_fecha || ' ' || p_hora
  );

  RETURN v_codigo;
END $$;


ALTER FUNCTION vida_salud.sp_programar_cita(p_paciente bigint, p_medico bigint, p_especialidad bigint, p_usuario bigint, p_fecha date, p_hora time without time zone, p_motivo character varying) OWNER TO postgres;

--
-- Name: sp_registrar_atencion(bigint, bigint, text); Type: PROCEDURE; Schema: vida_salud; Owner: postgres
--

CREATE PROCEDURE vida_salud.sp_registrar_atencion(IN p_cita bigint, IN p_usuario bigint, IN p_observacion text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM set_config('app.id_usuario', p_usuario::text, true);
  UPDATE cita SET estado = 'ATENDIDA', observacion_atencion = p_observacion,
                  fecha_hora_atencion = now()
   WHERE id_cita = p_cita AND estado IN ('PROGRAMADA', 'CONFIRMADA');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La cita % no está pendiente de atención', p_cita;
  END IF;
END $$;


ALTER PROCEDURE vida_salud.sp_registrar_atencion(IN p_cita bigint, IN p_usuario bigint, IN p_observacion text) OWNER TO postgres;

--
-- Name: sp_reporte_citas_por_estado(date, date, bigint); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.sp_reporte_citas_por_estado(p_desde date, p_hasta date, p_usuario bigint) RETURNS TABLE(estado vida_salud.estado_cita, total bigint, porcentaje numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO reporte (id_usuario, tipo, fecha_desde, fecha_hasta, formato)
  VALUES (p_usuario, 'CITAS_PERIODO', p_desde, p_hasta, 'PDF');
  RETURN QUERY
  SELECT c.estado, COUNT(*), ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2)
  FROM cita c WHERE c.fecha BETWEEN p_desde AND p_hasta
  GROUP BY c.estado ORDER BY 2 DESC;
END $$;


ALTER FUNCTION vida_salud.sp_reporte_citas_por_estado(p_desde date, p_hasta date, p_usuario bigint) OWNER TO postgres;

--
-- Name: sp_reprogramar_cita(bigint, bigint, date, time without time zone); Type: FUNCTION; Schema: vida_salud; Owner: postgres
--

CREATE FUNCTION vida_salud.sp_reprogramar_cita(p_cita bigint, p_usuario bigint, p_fecha date, p_hora time without time zone) RETURNS character varying
    LANGUAGE plpgsql
    SET search_path TO 'vida_salud'
    AS $$
DECLARE
  r cita%ROWTYPE;
  v_codigo varchar(12);
  v_id_nueva bigint;
BEGIN
  -- 1. Obtener la cita original y bloquear la fila (solo PROGRAMADA o CONFIRMADA)
  SELECT * INTO r
    FROM cita
   WHERE id_cita = p_cita
     AND estado IN ('PROGRAMADA', 'CONFIRMADA')
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La cita % no existe o no puede reprogramarse en su estado actual', p_cita;
  END IF;

  -- 2. Evitar reprogramar a la misma fecha y hora que ya tenía
  IF r.fecha = p_fecha AND r.hora_inicio = p_hora THEN
    RAISE EXCEPTION 'La nueva fecha y hora deben ser distintas a las de la cita actual (% %)', r.fecha, r.hora_inicio;
  END IF;

  -- 3. Cancelar la cita original (libera el bloque y registra en historial/bitácora)
  CALL vida_salud.sp_cancelar_cita(
    p_cita,
    p_usuario,
    'Reprogramada al ' || p_fecha || ' a las ' || p_hora
  );

  -- 4. Guardar fecha_anterior y hora_anterior en el historial de la cita original (CU23)
  UPDATE historial_estado_cita
     SET fecha_anterior = r.fecha,
         hora_anterior  = r.hora_inicio
   WHERE id_cita = p_cita
     AND estado_nuevo = 'CANCELADA';

  -- 5. Programar la nueva cita (valida horario, bloqueos y colisiones; si falla, hace rollback de todo)
  v_codigo := vida_salud.sp_programar_cita(
    r.id_paciente,
    r.id_medico,
    r.id_especialidad,
    p_usuario,
    p_fecha,
    p_hora,
    r.motivo_consulta
  );

  -- 6. Enlazar la nueva cita con la cita origen (autoasociación reprogramadaDe - CU23)
  UPDATE cita
     SET id_cita_origen = p_cita
   WHERE codigo = v_codigo
   RETURNING id_cita INTO v_id_nueva;

  -- 7. Dejar constancia de la fecha/hora original también en el historial inicial de la nueva cita
  UPDATE historial_estado_cita
     SET fecha_anterior = r.fecha,
         hora_anterior  = r.hora_inicio,
         motivo         = 'Reprogramada desde cita ' || r.codigo || ' (CU23)'
   WHERE id_cita = v_id_nueva
     AND estado_anterior IS NULL;

  RETURN v_codigo;
END $$;


ALTER FUNCTION vida_salud.sp_reprogramar_cita(p_cita bigint, p_usuario bigint, p_fecha date, p_hora time without time zone) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bitacora; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.bitacora (
    id_bitacora bigint NOT NULL,
    id_usuario bigint,
    fecha_hora timestamp with time zone DEFAULT now() NOT NULL,
    modulo character varying(60) NOT NULL,
    tipo_accion vida_salud.tipo_accion NOT NULL,
    tabla_afectada character varying(60),
    id_registro_afectado bigint,
    detalle text,
    ip character varying(45),
    descripcion character varying(255) DEFAULT ''::character varying NOT NULL,
    navegador character varying(255) DEFAULT 'Chrome / Mozilla'::character varying NOT NULL
);


ALTER TABLE vida_salud.bitacora OWNER TO postgres;

--
-- Name: bitacora_id_bitacora_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.bitacora ALTER COLUMN id_bitacora ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.bitacora_id_bitacora_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bloqueo_agenda; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.bloqueo_agenda (
    id_bloqueo bigint NOT NULL,
    id_medico bigint,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    motivo character varying(200) NOT NULL,
    tipo vida_salud.tipo_bloqueo NOT NULL,
    aplica_a_todos boolean DEFAULT false NOT NULL,
    CONSTRAINT bloqueo_agenda_alcance_coherente CHECK (((aplica_a_todos AND (id_medico IS NULL)) OR ((NOT aplica_a_todos) AND (id_medico IS NOT NULL)))),
    CONSTRAINT bloqueo_agenda_rango_valido CHECK ((fecha_fin >= fecha_inicio))
);


ALTER TABLE vida_salud.bloqueo_agenda OWNER TO postgres;

--
-- Name: bloqueo_agenda_id_bloqueo_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.bloqueo_agenda ALTER COLUMN id_bloqueo ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.bloqueo_agenda_id_bloqueo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cache; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration bigint NOT NULL
);


ALTER TABLE vida_salud.cache OWNER TO postgres;

--
-- Name: cache_locks; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration bigint NOT NULL
);


ALTER TABLE vida_salud.cache_locks OWNER TO postgres;

--
-- Name: cita; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.cita (
    id_cita bigint NOT NULL,
    codigo character varying(12) NOT NULL,
    id_paciente bigint NOT NULL,
    id_medico bigint NOT NULL,
    id_especialidad bigint NOT NULL,
    id_usuario_registro bigint NOT NULL,
    id_cita_origen bigint,
    fecha date NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    motivo_consulta character varying(200) NOT NULL,
    estado vida_salud.estado_cita DEFAULT 'PROGRAMADA'::vida_salud.estado_cita NOT NULL,
    motivo_cancelacion character varying(200),
    observacion_atencion text,
    fecha_hora_atencion timestamp with time zone,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    origen character varying(20) DEFAULT 'WEB'::character varying NOT NULL,
    expira_en timestamp(0) without time zone,
    CONSTRAINT cita_atendida_con_fecha CHECK (((estado <> 'ATENDIDA'::vida_salud.estado_cita) OR (fecha_hora_atencion IS NOT NULL))),
    CONSTRAINT cita_cancelada_con_motivo CHECK (((estado <> 'CANCELADA'::vida_salud.estado_cita) OR ((motivo_cancelacion IS NOT NULL) AND (btrim((motivo_cancelacion)::text) <> ''::text)))),
    CONSTRAINT cita_codigo_formato CHECK (((codigo)::text ~ '^CM-[0-9]{4,}$'::text)),
    CONSTRAINT cita_no_es_su_propio_origen CHECK (((id_cita_origen IS NULL) OR (id_cita_origen <> id_cita))),
    CONSTRAINT cita_rango_valido CHECK ((hora_fin > hora_inicio))
);


ALTER TABLE vida_salud.cita OWNER TO postgres;

--
-- Name: cita_id_cita_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.cita ALTER COLUMN id_cita ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.cita_id_cita_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: comprobante_pago; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.comprobante_pago (
    id_comprobante bigint NOT NULL,
    id_pago bigint NOT NULL,
    numero character varying(50) NOT NULL,
    fecha_emision timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    monto_total numeric(10,2) NOT NULL,
    ruta_archivo character varying(255) NOT NULL
);


ALTER TABLE vida_salud.comprobante_pago OWNER TO postgres;

--
-- Name: comprobante_pago_id_comprobante_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

CREATE SEQUENCE vida_salud.comprobante_pago_id_comprobante_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE vida_salud.comprobante_pago_id_comprobante_seq OWNER TO postgres;

--
-- Name: comprobante_pago_id_comprobante_seq; Type: SEQUENCE OWNED BY; Schema: vida_salud; Owner: postgres
--

ALTER SEQUENCE vida_salud.comprobante_pago_id_comprobante_seq OWNED BY vida_salud.comprobante_pago.id_comprobante;


--
-- Name: contacto_emergencia; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.contacto_emergencia (
    id_contacto bigint NOT NULL,
    id_paciente bigint NOT NULL,
    nombre_completo character varying(150) NOT NULL,
    parentesco character varying(40) NOT NULL,
    telefono character varying(20) NOT NULL
);


ALTER TABLE vida_salud.contacto_emergencia OWNER TO postgres;

--
-- Name: contacto_emergencia_id_contacto_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.contacto_emergencia ALTER COLUMN id_contacto ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.contacto_emergencia_id_contacto_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: especialidad; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.especialidad (
    id_especialidad bigint NOT NULL,
    nombre character varying(80) NOT NULL,
    descripcion character varying(200),
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE vida_salud.especialidad OWNER TO postgres;

--
-- Name: especialidad_id_especialidad_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.especialidad ALTER COLUMN id_especialidad ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.especialidad_id_especialidad_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: failed_jobs; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection character varying(255) NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE vida_salud.failed_jobs OWNER TO postgres;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

CREATE SEQUENCE vida_salud.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE vida_salud.failed_jobs_id_seq OWNER TO postgres;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: vida_salud; Owner: postgres
--

ALTER SEQUENCE vida_salud.failed_jobs_id_seq OWNED BY vida_salud.failed_jobs.id;


--
-- Name: historial_estado_cita; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.historial_estado_cita (
    id_historial bigint NOT NULL,
    id_cita bigint NOT NULL,
    id_usuario bigint NOT NULL,
    estado_anterior vida_salud.estado_cita,
    estado_nuevo vida_salud.estado_cita NOT NULL,
    fecha_anterior date,
    hora_anterior time without time zone,
    motivo character varying(200),
    fecha_cambio timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE vida_salud.historial_estado_cita OWNER TO postgres;

--
-- Name: historial_estado_cita_id_historial_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.historial_estado_cita ALTER COLUMN id_historial ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.historial_estado_cita_id_historial_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: horario; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.horario (
    id_horario bigint NOT NULL,
    id_medico bigint NOT NULL,
    dia_semana smallint NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    duracion_bloque_min smallint DEFAULT 30 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT horario_dia_semana_valido CHECK (((dia_semana >= 1) AND (dia_semana <= 7))),
    CONSTRAINT horario_duracion_bloque_positiva CHECK ((duracion_bloque_min > 0)),
    CONSTRAINT horario_rango_valido CHECK ((hora_fin > hora_inicio))
);


ALTER TABLE vida_salud.horario OWNER TO postgres;

--
-- Name: horario_id_horario_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.horario ALTER COLUMN id_horario ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.horario_id_horario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: informacion_medica; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.informacion_medica (
    id_informacion bigint NOT NULL,
    id_paciente bigint NOT NULL,
    tipo_sangre character varying(3),
    alergias text,
    enfermedades_cronicas text,
    medicamentos_habituales text,
    antecedentes_relevantes text,
    observaciones text,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT informacion_medica_tipo_sangre_valido CHECK (((tipo_sangre)::text = ANY ((ARRAY['A+'::character varying, 'A-'::character varying, 'B+'::character varying, 'B-'::character varying, 'AB+'::character varying, 'AB-'::character varying, 'O+'::character varying, 'O-'::character varying])::text[])))
);


ALTER TABLE vida_salud.informacion_medica OWNER TO postgres;

--
-- Name: informacion_medica_id_informacion_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.informacion_medica ALTER COLUMN id_informacion ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.informacion_medica_id_informacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: job_batches; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


ALTER TABLE vida_salud.job_batches OWNER TO postgres;

--
-- Name: jobs; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


ALTER TABLE vida_salud.jobs OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

CREATE SEQUENCE vida_salud.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE vida_salud.jobs_id_seq OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: vida_salud; Owner: postgres
--

ALTER SEQUENCE vida_salud.jobs_id_seq OWNED BY vida_salud.jobs.id;


--
-- Name: medico; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.medico (
    id_persona bigint NOT NULL,
    codigo character varying(15) NOT NULL,
    matricula character varying(30) NOT NULL
);


ALTER TABLE vida_salud.medico OWNER TO postgres;

--
-- Name: medico_especialidad; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.medico_especialidad (
    id_medico bigint NOT NULL,
    id_especialidad bigint NOT NULL,
    fecha_asignacion timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE vida_salud.medico_especialidad OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


ALTER TABLE vida_salud.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

CREATE SEQUENCE vida_salud.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE vida_salud.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: vida_salud; Owner: postgres
--

ALTER SEQUENCE vida_salud.migrations_id_seq OWNED BY vida_salud.migrations.id;


--
-- Name: notificacion; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.notificacion (
    id_notificacion bigint NOT NULL,
    id_cita bigint NOT NULL,
    id_usuario_gestion bigint,
    mensaje text NOT NULL,
    fecha_programada timestamp with time zone NOT NULL,
    fecha_envio timestamp with time zone,
    estado vida_salud.estado_notificacion DEFAULT 'PENDIENTE'::vida_salud.estado_notificacion NOT NULL,
    intentos smallint DEFAULT 0 NOT NULL,
    CONSTRAINT notificacion_enviada_con_fecha CHECK (((estado <> 'ENVIADA'::vida_salud.estado_notificacion) OR (fecha_envio IS NOT NULL))),
    CONSTRAINT notificacion_gestionada_con_usuario CHECK (((estado = 'PENDIENTE'::vida_salud.estado_notificacion) OR ((id_usuario_gestion IS NOT NULL) AND (fecha_envio IS NOT NULL) AND (intentos >= 1)))),
    CONSTRAINT notificacion_intentos_no_negativos CHECK ((intentos >= 0))
);


ALTER TABLE vida_salud.notificacion OWNER TO postgres;

--
-- Name: notificacion_id_notificacion_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.notificacion ALTER COLUMN id_notificacion ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.notificacion_id_notificacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: paciente; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.paciente (
    id_persona bigint NOT NULL,
    codigo character varying(15) NOT NULL,
    sexo character(1) NOT NULL,
    fecha_nacimiento date NOT NULL,
    direccion character varying(200),
    fecha_registro timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT paciente_fecha_nacimiento_pasada CHECK ((fecha_nacimiento <= CURRENT_DATE)),
    CONSTRAINT paciente_sexo_valido CHECK ((sexo = ANY (ARRAY['M'::bpchar, 'F'::bpchar])))
);


ALTER TABLE vida_salud.paciente OWNER TO postgres;

--
-- Name: pago; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.pago (
    id_pago bigint NOT NULL,
    id_cita bigint NOT NULL,
    id_usuario_registro bigint NOT NULL,
    monto numeric(10,2) NOT NULL,
    moneda character varying(5) DEFAULT 'BOB'::character varying NOT NULL,
    metodo character varying(30) NOT NULL,
    estado character varying(20) NOT NULL,
    referencia_externa character varying(100),
    fecha_hora timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE vida_salud.pago OWNER TO postgres;

--
-- Name: pago_id_pago_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

CREATE SEQUENCE vida_salud.pago_id_pago_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE vida_salud.pago_id_pago_seq OWNER TO postgres;

--
-- Name: pago_id_pago_seq; Type: SEQUENCE OWNED BY; Schema: vida_salud; Owner: postgres
--

ALTER SEQUENCE vida_salud.pago_id_pago_seq OWNED BY vida_salud.pago.id_pago;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


ALTER TABLE vida_salud.password_reset_tokens OWNER TO postgres;

--
-- Name: permiso; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.permiso (
    id_permiso bigint NOT NULL,
    nombre character varying(80) NOT NULL,
    modulo character varying(60) NOT NULL,
    ruta_menu character varying(150)
);


ALTER TABLE vida_salud.permiso OWNER TO postgres;

--
-- Name: permiso_id_permiso_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.permiso ALTER COLUMN id_permiso ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.permiso_id_permiso_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: persona; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.persona (
    id_persona bigint NOT NULL,
    ci character varying(20) NOT NULL,
    nombres character varying(80) NOT NULL,
    apellidos character varying(80) NOT NULL,
    telefono character varying(20),
    email character varying(150),
    activo boolean DEFAULT true NOT NULL,
    fecha_registro timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE vida_salud.persona OWNER TO postgres;

--
-- Name: persona_id_persona_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.persona ALTER COLUMN id_persona ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.persona_id_persona_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: personal_administrativo; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.personal_administrativo (
    id_persona bigint NOT NULL,
    cargo character varying(60) NOT NULL
);


ALTER TABLE vida_salud.personal_administrativo OWNER TO postgres;

--
-- Name: recuperacion_contrasena; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.recuperacion_contrasena (
    id_recuperacion bigint NOT NULL,
    id_usuario bigint NOT NULL,
    token_hash character varying(255) NOT NULL,
    fecha_generacion timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_expiracion timestamp(0) without time zone NOT NULL,
    usado boolean DEFAULT false NOT NULL
);


ALTER TABLE vida_salud.recuperacion_contrasena OWNER TO postgres;

--
-- Name: recuperacion_contrasena_id_recuperacion_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

CREATE SEQUENCE vida_salud.recuperacion_contrasena_id_recuperacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE vida_salud.recuperacion_contrasena_id_recuperacion_seq OWNER TO postgres;

--
-- Name: recuperacion_contrasena_id_recuperacion_seq; Type: SEQUENCE OWNED BY; Schema: vida_salud; Owner: postgres
--

ALTER SEQUENCE vida_salud.recuperacion_contrasena_id_recuperacion_seq OWNED BY vida_salud.recuperacion_contrasena.id_recuperacion;


--
-- Name: reembolso; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.reembolso (
    id_reembolso bigint NOT NULL,
    id_pago bigint NOT NULL,
    id_usuario_autoriza bigint NOT NULL,
    monto numeric(10,2) NOT NULL,
    motivo character varying(255) NOT NULL,
    estado character varying(20) DEFAULT 'SOLICITADO'::character varying NOT NULL,
    fecha_solicitud timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_procesado timestamp(0) without time zone,
    referencia_externa character varying(100)
);


ALTER TABLE vida_salud.reembolso OWNER TO postgres;

--
-- Name: reembolso_id_reembolso_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

CREATE SEQUENCE vida_salud.reembolso_id_reembolso_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE vida_salud.reembolso_id_reembolso_seq OWNER TO postgres;

--
-- Name: reembolso_id_reembolso_seq; Type: SEQUENCE OWNED BY; Schema: vida_salud; Owner: postgres
--

ALTER SEQUENCE vida_salud.reembolso_id_reembolso_seq OWNED BY vida_salud.reembolso.id_reembolso;


--
-- Name: reporte; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.reporte (
    id_reporte bigint NOT NULL,
    id_usuario bigint NOT NULL,
    tipo vida_salud.tipo_reporte NOT NULL,
    fecha_desde date,
    fecha_hasta date,
    filtros jsonb,
    formato character varying(4),
    fecha_generacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reporte_formato_valido CHECK (((formato)::text = ANY ((ARRAY['PDF'::character varying, 'CSV'::character varying])::text[]))),
    CONSTRAINT reporte_rango_valido CHECK (((fecha_desde IS NULL) OR (fecha_hasta IS NULL) OR (fecha_hasta >= fecha_desde)))
);


ALTER TABLE vida_salud.reporte OWNER TO postgres;

--
-- Name: reporte_id_reporte_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.reporte ALTER COLUMN id_reporte ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.reporte_id_reporte_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rol; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.rol (
    id_rol bigint NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text
);


ALTER TABLE vida_salud.rol OWNER TO postgres;

--
-- Name: rol_id_rol_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.rol ALTER COLUMN id_rol ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.rol_id_rol_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rol_permiso; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.rol_permiso (
    id_rol bigint NOT NULL,
    id_permiso bigint NOT NULL,
    fecha_asignacion timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE vida_salud.rol_permiso OWNER TO postgres;

--
-- Name: sesion; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.sesion (
    id_sesion character varying(128) NOT NULL,
    id_usuario bigint NOT NULL,
    fecha_inicio timestamp with time zone DEFAULT now() NOT NULL,
    ultima_actividad timestamp with time zone DEFAULT now() NOT NULL,
    fecha_cierre timestamp with time zone,
    activa boolean DEFAULT true NOT NULL,
    ip character varying(45),
    CONSTRAINT sesion_cierre_coherente CHECK (((fecha_cierre IS NULL) OR (fecha_cierre >= fecha_inicio)))
);


ALTER TABLE vida_salud.sesion OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


ALTER TABLE vida_salud.sessions OWNER TO postgres;

--
-- Name: token_recuperacion; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.token_recuperacion (
    id_token bigint NOT NULL,
    id_usuario bigint NOT NULL,
    token_hash character varying(64) NOT NULL,
    fecha_generacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_expiracion timestamp with time zone NOT NULL,
    usado boolean DEFAULT false NOT NULL,
    CONSTRAINT token_recuperacion_expiracion_positiva CHECK ((fecha_expiracion > fecha_generacion))
);


ALTER TABLE vida_salud.token_recuperacion OWNER TO postgres;

--
-- Name: token_recuperacion_id_token_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.token_recuperacion ALTER COLUMN id_token ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.token_recuperacion_id_token_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE vida_salud.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

CREATE SEQUENCE vida_salud.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE vida_salud.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: vida_salud; Owner: postgres
--

ALTER SEQUENCE vida_salud.users_id_seq OWNED BY vida_salud.users.id;


--
-- Name: usuario; Type: TABLE; Schema: vida_salud; Owner: postgres
--

CREATE TABLE vida_salud.usuario (
    id_usuario bigint NOT NULL,
    id_persona bigint NOT NULL,
    id_rol bigint NOT NULL,
    nombre_usuario character varying(50) NOT NULL,
    hash_contrasena character varying(255) NOT NULL,
    estado vida_salud.estado_usuario DEFAULT 'ACTIVO'::vida_salud.estado_usuario NOT NULL,
    intentos_fallidos smallint DEFAULT 0 NOT NULL,
    bloqueado_hasta timestamp with time zone,
    ultimo_acceso timestamp with time zone,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    remember_token character varying(100),
    CONSTRAINT usuario_intentos_fallidos_no_negativo CHECK ((intentos_fallidos >= 0))
);


ALTER TABLE vida_salud.usuario OWNER TO postgres;

--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE; Schema: vida_salud; Owner: postgres
--

ALTER TABLE vida_salud.usuario ALTER COLUMN id_usuario ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME vida_salud.usuario_id_usuario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: comprobante_pago id_comprobante; Type: DEFAULT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.comprobante_pago ALTER COLUMN id_comprobante SET DEFAULT nextval('vida_salud.comprobante_pago_id_comprobante_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.failed_jobs ALTER COLUMN id SET DEFAULT nextval('vida_salud.failed_jobs_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.jobs ALTER COLUMN id SET DEFAULT nextval('vida_salud.jobs_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.migrations ALTER COLUMN id SET DEFAULT nextval('vida_salud.migrations_id_seq'::regclass);


--
-- Name: pago id_pago; Type: DEFAULT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.pago ALTER COLUMN id_pago SET DEFAULT nextval('vida_salud.pago_id_pago_seq'::regclass);


--
-- Name: recuperacion_contrasena id_recuperacion; Type: DEFAULT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.recuperacion_contrasena ALTER COLUMN id_recuperacion SET DEFAULT nextval('vida_salud.recuperacion_contrasena_id_recuperacion_seq'::regclass);


--
-- Name: reembolso id_reembolso; Type: DEFAULT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.reembolso ALTER COLUMN id_reembolso SET DEFAULT nextval('vida_salud.reembolso_id_reembolso_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.users ALTER COLUMN id SET DEFAULT nextval('vida_salud.users_id_seq'::regclass);


--
-- Data for Name: bitacora; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.bitacora (id_bitacora, id_usuario, fecha_hora, modulo, tipo_accion, tabla_afectada, id_registro_afectado, detalle, ip, descripcion, navegador) FROM stdin;
79	1	2026-11-07 17:18:36+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1		Chrome / Mozilla
80	1	2026-11-07 17:18:38+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1		Chrome / Mozilla
1	1	2026-08-01 11:40:00+00	P5 Gestión Médica y Horarios	CREAR	especialidad	\N	Registro del catálogo inicial de 7 especialidades (CU16)	192.168.1.23	Evento CREAR registrado en el módulo P5 Gestión Médica y Horarios	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
2	1	2026-08-01 12:03:00+00	P2 Administración de Usuarios RBAC	CREAR	usuario	1	Alta de usuario Silvia Irene Colque López con rol Administrador (CU05)	192.168.1.23	Evento CREAR registrado en el módulo P2 Administración de Usuarios RBAC	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
3	1	2026-08-01 12:06:00+00	P2 Administración de Usuarios RBAC	CREAR	usuario	2	Alta de usuario Rosa María Vaca Cuéllar con rol Recepcionista (CU05)	192.168.1.23	Evento CREAR registrado en el módulo P2 Administración de Usuarios RBAC	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
4	\N	2026-10-26 18:28:19+00	P1 SEGURIDAD	LOGIN	\N	\N	[POST] api/auth/login (HTTP 422) por Sistema	::1	Evento LOGIN registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
5	1	2026-10-26 18:28:40+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	::1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
6	1	2026-10-26 19:17:11+00	P2_RBAC	INACTIVAR	usuario	5	Inactivación de cuenta: Usuario [mjustiniano] dado de baja lógica (estado = INACTIVO). Sesiones revocadas.	::1	Evento INACTIVAR registrado en el módulo P2_RBAC	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
7	1	2026-10-26 19:19:16+00	P2_RBAC	RENOVAR	usuario	5	Renovación de cuenta: Usuario [mjustiniano] renovado y reactivado a estado ACTIVO.	::1	Evento RENOVAR registrado en el módulo P2_RBAC	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
8	1	2026-10-26 19:51:00+00	P2_RBAC	REGISTRAR	usuario	10	Registro de usuario [cpereda36] con CI [8899571], correo [cpereda38@vidasalud.com.bo] y rol [Recepcionista].	::1	Evento REGISTRAR registrado en el módulo P2_RBAC	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
9	1	2026-10-26 19:51:00+00	P2_RBAC	INACTIVAR	usuario	10	Inactivación de cuenta: Usuario [cpereda36] dado de baja lógica (estado = INACTIVO). Sesiones revocadas.	::1	Evento INACTIVAR registrado en el módulo P2_RBAC	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
10	1	2026-10-26 19:51:01+00	P2_RBAC	RENOVAR	usuario	10	Renovación de cuenta: Usuario [cpereda36] renovado y reactivado a estado ACTIVO.	::1	Evento RENOVAR registrado en el módulo P2_RBAC	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
11	1	2026-10-26 21:11:48+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	::1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
12	1	2026-10-26 22:03:40+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación de sesión exitosa del usuario [scolque].	::1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
13	1	2026-10-26 22:03:40+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación de sesión exitosa del usuario [scolque].	::1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
14	1	2026-10-26 22:04:04+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	::1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
15	1	2026-10-26 22:07:39+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación de sesión exitosa del usuario [scolque].	::1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
16	1	2026-11-05 19:19:43+00	P1 SEGURIDAD	LOGIN	\N	\N	[POST] api/auth/login (HTTP 401) por scolque | Parámetros: {"identificador":"scolque","remember":true}	127.0.0.1	Evento LOGIN registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
17	1	2026-11-05 19:19:53+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
18	1	2026-11-05 19:21:00+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 05/11/2026 19:19:53, cierre: 05/11/2026 19:21:00).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
19	\N	2026-11-05 19:21:01+00	P1 SEGURIDAD	LOGOUT	\N	\N	[POST] api/auth/logout (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
20	1	2026-11-05 19:21:03+00	P1 SEGURIDAD	LOGOUT	\N	\N	[GET] api/auth/logout-summary (HTTP 200) por scolque	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
21	\N	2026-11-06 16:00:33+00	P1 SEGURIDAD	LOGOUT	\N	\N	[GET] api/auth/logout-summary (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
22	\N	2026-11-06 16:00:34+00	P1 SEGURIDAD	LOGOUT	\N	\N	[GET] api/auth/logout-summary (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
23	1	2026-11-06 16:00:43+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
24	1	2026-11-06 16:00:54+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
25	1	2026-11-06 16:43:51+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 06/11/2026 16:00:54, cierre: 06/11/2026 16:43:51).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
26	\N	2026-11-06 16:43:52+00	P1 SEGURIDAD	LOGOUT	\N	\N	[POST] api/auth/logout (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
27	\N	2026-11-06 16:43:53+00	P1 SEGURIDAD	LOGOUT	\N	\N	[GET] api/auth/logout-summary (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
28	1	2026-11-06 19:53:45+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
29	1	2026-11-06 19:53:46+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
30	1	2026-11-06 19:53:47+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
31	1	2026-11-06 19:53:48+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
32	1	2026-11-06 21:04:13+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 06/11/2026 19:53:48, cierre: 06/11/2026 21:04:13).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
33	\N	2026-11-06 21:04:14+00	P1 SEGURIDAD	LOGOUT	\N	\N	[POST] api/auth/logout (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
34	\N	2026-11-06 21:04:15+00	P1 SEGURIDAD	LOGOUT	\N	\N	[GET] api/auth/logout-summary (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
35	1	2026-11-06 21:27:05+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
36	1	2026-11-06 21:37:38+00	P7_REPORTES	CREAR	reporte	4	Reporte emitido de tipo [CITAS_PERIODO] en formato [CSV].	127.0.0.1	Evento CREAR registrado en el módulo P7_REPORTES	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
37	1	2026-11-06 21:37:39+00	P7_REPORTES	CREAR	reporte	5	Reporte emitido de tipo [CITAS_PERIODO] en formato [CSV].	127.0.0.1	Evento CREAR registrado en el módulo P7_REPORTES	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
38	1	2026-11-06 21:42:16+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 06/11/2026 21:27:05, cierre: 06/11/2026 21:42:16).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
39	\N	2026-11-06 21:42:17+00	P1 SEGURIDAD	LOGOUT	\N	\N	[POST] api/auth/logout (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
40	\N	2026-11-06 21:42:18+00	P1 SEGURIDAD	LOGOUT	\N	\N	[GET] api/auth/logout-summary (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
41	1	2026-11-06 21:42:32+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
42	1	2026-11-06 21:54:43+00	P7_REPORTES	CREAR	reporte	6	Reporte emitido de tipo [CITAS_PERIODO] en formato [CSV].	127.0.0.1	Evento CREAR registrado en el módulo P7_REPORTES	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
43	1	2026-11-06 21:54:44+00	P7_REPORTES	CREAR	reporte	7	Reporte emitido de tipo [CITAS_PERIODO] en formato [CSV].	127.0.0.1	Evento CREAR registrado en el módulo P7_REPORTES	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
44	1	2026-11-06 21:54:48+00	P7_REPORTES	CREAR	reporte	8	Reporte emitido de tipo [CITAS_PERIODO] en formato [CSV].	127.0.0.1	Evento CREAR registrado en el módulo P7_REPORTES	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
45	1	2026-11-06 21:54:49+00	P7_REPORTES	CREAR	reporte	9	Reporte emitido de tipo [CITAS_PERIODO] en formato [CSV].	127.0.0.1	Evento CREAR registrado en el módulo P7_REPORTES	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
46	1	2026-11-07 02:01:48+00	P2_RBAC	INACTIVAR	usuario	4	Inactivación de cuenta: Usuario [lortiz] dado de baja lógica (estado = INACTIVO). Sesiones revocadas.	127.0.0.1	Evento INACTIVAR registrado en el módulo P2_RBAC	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
47	1	2026-11-07 02:01:49+00	P2_RBAC	INACTIVAR	usuario	4	Inactivación de cuenta: Usuario [lortiz] dado de baja lógica (estado = INACTIVO). Sesiones revocadas.	127.0.0.1	Evento INACTIVAR registrado en el módulo P2_RBAC	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
48	1	2026-11-07 02:02:05+00	P2_RBAC	RENOVAR	usuario	4	Renovación de cuenta: Usuario [lortiz] renovado y reactivado a estado ACTIVO.	127.0.0.1	Evento RENOVAR registrado en el módulo P2_RBAC	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
49	1	2026-11-07 02:02:05+00	P2_RBAC	RENOVAR	usuario	4	Renovación de cuenta: Usuario [lortiz] renovado y reactivado a estado ACTIVO.	127.0.0.1	Evento RENOVAR registrado en el módulo P2_RBAC	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
50	1	2026-11-07 02:08:42+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 06/11/2026 21:42:32, cierre: 07/11/2026 02:08:42).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
51	\N	2026-11-07 02:08:43+00	P1 SEGURIDAD	LOGOUT	\N	\N	[POST] api/auth/logout (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
52	\N	2026-11-07 02:08:44+00	P1 SEGURIDAD	LOGOUT	\N	\N	[GET] api/auth/logout-summary (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
53	1	2026-11-07 02:22:31+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
54	1	2026-11-07 02:23:15+00	P7_REPORTES	CREAR	reporte	10	Reporte emitido de tipo [PACIENTES_REGISTRADOS] en formato [PDF].	127.0.0.1	Evento CREAR registrado en el módulo P7_REPORTES	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
55	1	2026-11-07 02:23:17+00	P7_REPORTES	CREAR	reporte	11	Reporte emitido de tipo [PACIENTES_REGISTRADOS] en formato [PDF].	127.0.0.1	Evento CREAR registrado en el módulo P7_REPORTES	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
56	1	2026-11-07 02:32:09+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 07/11/2026 02:22:31, cierre: 07/11/2026 02:32:09).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
57	1	2026-11-07 02:32:25+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
58	1	2026-11-07 02:33:10+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 07/11/2026 02:32:25, cierre: 07/11/2026 02:33:10).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
59	1	2026-11-07 02:35:47+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
60	11	2026-11-07 18:56:49+00	P1_SEGURIDAD	REGISTRAR	paciente	74	Auto-registro web de paciente [Carlos Daniel Mendoza Roca] (CI 7891234, código PAC-0073, usuario cmendoza).	127.0.0.1	Evento REGISTRAR registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
61	11	2026-11-07 18:57:03+00	P1_SEGURIDAD	LOGIN	usuario	11	Inicio de sesión exitoso. Usuario: [cmendoza], Rol: [PACIENTE].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
62	1	2026-11-07 19:49:59+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 07/11/2026 02:35:47, cierre: 07/11/2026 19:49:59).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
63	\N	2026-11-07 19:50:00+00	P1 SEGURIDAD	LOGOUT	\N	\N	[POST] api/auth/logout (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
64	1	2026-11-07 19:50:47+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
65	1	2026-11-07 19:51:13+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 07/11/2026 19:50:47, cierre: 07/11/2026 19:51:13).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
66	\N	2026-11-07 19:51:14+00	P1 SEGURIDAD	LOGOUT	\N	\N	[POST] api/auth/logout (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
67	1	2026-11-07 19:51:30+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 26/10/2026 18:28:40, cierre: 07/11/2026 19:51:30).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
68	\N	2026-11-07 19:51:31+00	P1 SEGURIDAD	LOGOUT	\N	\N	[POST] api/auth/logout (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
69	\N	2026-11-07 19:51:32+00	P1 SEGURIDAD	LOGOUT	\N	\N	[POST] api/auth/logout (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
70	\N	2026-11-07 19:56:50+00	P1 SEGURIDAD	LOGOUT	\N	\N	[POST] api/auth/logout (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
71	\N	2026-11-07 19:56:51+00	P1 SEGURIDAD	LOGOUT	\N	\N	[POST] api/auth/logout (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
72	1	2026-11-07 16:01:50+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
73	1	2026-11-07 16:02:13+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 07/11/2026 16:01:50, cierre: 07/11/2026 16:02:13).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
74	\N	2026-11-07 16:02:14+00	P1 SEGURIDAD	LOGOUT	\N	\N	[POST] api/auth/logout (HTTP 200) por Sistema	127.0.0.1	Evento LOGOUT registrado en el módulo P1 SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
75	1	2026-11-07 16:17:34+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
76	1	2026-11-07 16:17:47+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 07/11/2026 12:17:34, cierre: 07/11/2026 16:17:47).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
77	1	2026-11-07 16:25:38+00	P1_SEGURIDAD	LOGIN	usuario	1	Inicio de sesión exitoso. Usuario: [scolque], Rol: [ADMINISTRADOR].	127.0.0.1	Evento LOGIN registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
78	1	2026-11-07 16:25:43+00	P1_SEGURIDAD	LOGOUT	usuario	1	Cierre de sesión y revocación exitosa del usuario [scolque] (inicio: 07/11/2026 12:25:38, cierre: 07/11/2026 16:25:43).	127.0.0.1	Evento LOGOUT registrado en el módulo P1_SEGURIDAD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
\.


--
-- Data for Name: bloqueo_agenda; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.bloqueo_agenda (id_bloqueo, id_medico, fecha_inicio, fecha_fin, motivo, tipo, aplica_a_todos) FROM stdin;
1	\N	2026-09-24	2026-09-24	Feriado departamental: Aniversario de Santa Cruz	FERIADO	t
2	\N	2026-11-02	2026-11-02	Feriado nacional: Día de Todos los Difuntos	FERIADO	t
3	7	2026-09-14	2026-09-18	Licencia por capacitación en Pediatría (Cochabamba)	LICENCIA	f
\.


--
-- Data for Name: cache; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.cache (key, value, expiration) FROM stdin;
laravel-cache-roster:project:v3:b4b9c14176818a84bd185e505049c20d	TzoyNjoiTGFyYXZlbFxSb3N0ZXJcUHJvamVjdFNjYW4iOjg6e3M6ODoiYmFzZVBhdGgiO3M6Nzg6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXCI7czozOiJwaHAiO086MzU6IkxhcmF2ZWxcUm9zdGVyXEVjb3N5c3RlbXNcRWNvc3lzdGVtIjoyOntzOjk6IgAqAGJ5TmFtZSI7YToxNDE6e3M6MTA6ImJyaWNrL21hdGgiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMDoiYnJpY2svbWF0aCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjAuMCI7czo5OiIAKgBzb3VyY2UiO0U6NDM6IkxhcmF2ZWxcUm9zdGVyXEVudW1zXFBhY2thZ2VTb3VyY2U6Q29tcG9zZXIiO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk1OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcYnJpY2tcbWF0aCI7fXM6MzE6ImNhcmJvbnBocC9jYXJib24tZG9jdHJpbmUtdHlwZXMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMToiY2FyYm9ucGhwL2NhcmJvbi1kb2N0cmluZS10eXBlcyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIzLjIuMSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxjYXJib25waHBcY2FyYm9uLWRvY3RyaW5lLXR5cGVzIjt9czoyMzoiZGZseWRldi9kb3QtYWNjZXNzLWRhdGEiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMzoiZGZseWRldi9kb3QtYWNjZXNzLWRhdGEiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMy4wLjMiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA4OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcZGZseWRldlxkb3QtYWNjZXNzLWRhdGEiO31zOjE4OiJkb2N0cmluZS9pbmZsZWN0b3IiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxODoiZG9jdHJpbmUvaW5mbGVjdG9yIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMS4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGRvY3RyaW5lXGluZmxlY3RvciI7fXM6MTQ6ImRvY3RyaW5lL2xleGVyIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTQ6ImRvY3RyaW5lL2xleGVyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuMC4zIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcZG9jdHJpbmVcbGV4ZXIiO31zOjI5OiJkcmFnb25tYW50YW5rL2Nyb24tZXhwcmVzc2lvbiI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI5OiJkcmFnb25tYW50YW5rL2Nyb24tZXhwcmVzc2lvbiI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIzLjYuMSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxkcmFnb25tYW50YW5rXGNyb24tZXhwcmVzc2lvbiI7fXM6MjM6ImVndWxpYXMvZW1haWwtdmFsaWRhdG9yIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjM6ImVndWxpYXMvZW1haWwtdmFsaWRhdG9yIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMC40IjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGVndWxpYXNcZW1haWwtdmFsaWRhdG9yIjt9czoxODoiZnJ1aXRjYWtlL3BocC1jb3JzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTg6ImZydWl0Y2FrZS9waHAtY29ycyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjQuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDM6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxmcnVpdGNha2VccGhwLWNvcnMiO31zOjI3OiJncmFoYW0tY2FtcGJlbGwvcmVzdWx0LXR5cGUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNzoiZ3JhaGFtLWNhbXBiZWxsL3Jlc3VsdC10eXBlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMi4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGdyYWhhbS1jYW1wYmVsbFxyZXN1bHQtdHlwZSI7fXM6MTc6Imd1enpsZWh0dHAvZ3V6emxlIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTc6Imd1enpsZWh0dHAvZ3V6emxlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjguMy4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGd1enpsZWh0dHBcZ3V6emxlIjt9czoxOToiZ3V6emxlaHR0cC9wcm9taXNlcyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE5OiJndXp6bGVodHRwL3Byb21pc2VzIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuMS4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGd1enpsZWh0dHBccHJvbWlzZXMiO31zOjE1OiJndXp6bGVodHRwL3BzcjciO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNToiZ3V6emxlaHR0cC9wc3I3IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuMi4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGd1enpsZWh0dHBccHNyNyI7fXM6MjM6Imd1enpsZWh0dHAvdXJpLXRlbXBsYXRlIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjM6Imd1enpsZWh0dHAvdXJpLXRlbXBsYXRlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMC4xIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGd1enpsZWh0dHBcdXJpLXRlbXBsYXRlIjt9czoyNToiaW5lcnRpYWpzL2luZXJ0aWEtbGFyYXZlbCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI1OiJpbmVydGlhanMvaW5lcnRpYS1sYXJhdmVsIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuNS4yIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MTtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjQ6Il4zLjAiO3M6NzoiACoAcGF0aCI7czoxMTA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxpbmVydGlhanNcaW5lcnRpYS1sYXJhdmVsIjt9czoxNzoibGFyYXZlbC9mcmFtZXdvcmsiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNzoibGFyYXZlbC9mcmFtZXdvcmsiO3M6MTA6IgAqAHZlcnNpb24iO3M6NzoiMTMuMzguMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo2OiJeMTMuMTciO3M6NzoiACoAcGF0aCI7czoxMDI6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxsYXJhdmVsXGZyYW1ld29yayI7fXM6MTU6ImxhcmF2ZWwvcHJvbXB0cyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJsYXJhdmVsL3Byb21wdHMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC4zLjI2IjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGxhcmF2ZWxccHJvbXB0cyI7fXM6Mjg6ImxhcmF2ZWwvc2VyaWFsaXphYmxlLWNsb3N1cmUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyODoibGFyYXZlbC9zZXJpYWxpemFibGUtY2xvc3VyZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjEuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTM6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxsYXJhdmVsXHNlcmlhbGl6YWJsZS1jbG9zdXJlIjt9czoxNDoibGFyYXZlbC90aW5rZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNDoibGFyYXZlbC90aW5rZXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMy4wLjIiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NDoiXjMuMCI7czo3OiIAKgBwYXRoIjtzOjk5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcbGFyYXZlbFx0aW5rZXIiO31zOjE3OiJsYXJhdmVsL3dheWZpbmRlciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE3OiJsYXJhdmVsL3dheWZpbmRlciI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjEuMjMiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NzoiXjAuMS4xNCI7czo3OiIAKgBwYXRoIjtzOjEwMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGxhcmF2ZWxcd2F5ZmluZGVyIjt9czoxNzoibGVhZ3VlL2NvbW1vbm1hcmsiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNzoibGVhZ3VlL2NvbW1vbm1hcmsiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMi4xMC40IjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGxlYWd1ZVxjb21tb25tYXJrIjt9czoxMzoibGVhZ3VlL2NvbmZpZyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEzOiJsZWFndWUvY29uZmlnIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMi4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk4OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcbGVhZ3VlXGNvbmZpZyI7fXM6MTY6ImxlYWd1ZS9mbHlzeXN0ZW0iO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNjoibGVhZ3VlL2ZseXN5c3RlbSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIzLjM2LjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAxOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcbGVhZ3VlXGZseXN5c3RlbSI7fXM6MjI6ImxlYWd1ZS9mbHlzeXN0ZW0tbG9jYWwiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMjoibGVhZ3VlL2ZseXN5c3RlbS1sb2NhbCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIzLjM1LjMiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcbGVhZ3VlXGZseXN5c3RlbS1sb2NhbCI7fXM6MjY6ImxlYWd1ZS9taW1lLXR5cGUtZGV0ZWN0aW9uIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjY6ImxlYWd1ZS9taW1lLXR5cGUtZGV0ZWN0aW9uIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMTcuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxsZWFndWVcbWltZS10eXBlLWRldGVjdGlvbiI7fXM6MTA6ImxlYWd1ZS91cmkiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMDoibGVhZ3VlL3VyaSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI3LjkuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGxlYWd1ZVx1cmkiO31zOjIxOiJsZWFndWUvdXJpLWludGVyZmFjZXMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMToibGVhZ3VlL3VyaS1pbnRlcmZhY2VzIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjcuOS4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGxlYWd1ZVx1cmktaW50ZXJmYWNlcyI7fXM6MTU6Im1vbm9sb2cvbW9ub2xvZyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJtb25vbG9nL21vbm9sb2ciO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMy4xMi4xIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXG1vbm9sb2dcbW9ub2xvZyI7fXM6MTM6Im5lc2JvdC9jYXJib24iO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMzoibmVzYm90L2NhcmJvbiI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIzLjE1LjEiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTg6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxuZXNib3RcY2FyYm9uIjt9czoxMjoibmV0dGUvc2NoZW1hIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTI6Im5ldHRlL3NjaGVtYSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjQuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXG5ldHRlXHNjaGVtYSI7fXM6MTE6Im5ldHRlL3V0aWxzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTE6Im5ldHRlL3V0aWxzIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMS42IjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcbmV0dGVcdXRpbHMiO31zOjE2OiJuaWtpYy9waHAtcGFyc2VyIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTY6Im5pa2ljL3BocC1wYXJzZXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNS45LjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAxOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcbmlraWNccGhwLXBhcnNlciI7fXM6MTk6Im51bm9tYWR1cm8vdGVybXdpbmQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxOToibnVub21hZHVyby90ZXJtd2luZCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjQuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxudW5vbWFkdXJvXHRlcm13aW5kIjt9czoxOToicGhwb3B0aW9uL3BocG9wdGlvbiI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE5OiJwaHBvcHRpb24vcGhwb3B0aW9uIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMTAuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxwaHBvcHRpb25ccGhwb3B0aW9uIjt9czoyMToicGhwc3Rhbi9waHBkb2MtcGFyc2VyIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjE6InBocHN0YW4vcGhwZG9jLXBhcnNlciI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjMuNiI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxwaHBzdGFuXHBocGRvYy1wYXJzZXIiO31zOjk6InBzci9jbG9jayI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjk6InBzci9jbG9jayI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjAuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBzclxjbG9jayI7fXM6MTM6InBzci9jb250YWluZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMzoicHNyL2NvbnRhaW5lciI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjAuMiI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5ODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBzclxjb250YWluZXIiO31zOjIwOiJwc3IvZXZlbnQtZGlzcGF0Y2hlciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjIwOiJwc3IvZXZlbnQtZGlzcGF0Y2hlciI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjAuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDU6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxwc3JcZXZlbnQtZGlzcGF0Y2hlciI7fXM6MTU6InBzci9odHRwLWNsaWVudCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJwc3IvaHR0cC1jbGllbnQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMS4wLjMiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JccHNyXGh0dHAtY2xpZW50Ijt9czoxNjoicHNyL2h0dHAtZmFjdG9yeSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE2OiJwc3IvaHR0cC1mYWN0b3J5IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMS4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBzclxodHRwLWZhY3RvcnkiO31zOjE2OiJwc3IvaHR0cC1tZXNzYWdlIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTY6InBzci9odHRwLW1lc3NhZ2UiO3M6MTA6IgAqAHZlcnNpb24iO3M6MzoiMi4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBzclxodHRwLW1lc3NhZ2UiO31zOjc6InBzci9sb2ciO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo3OiJwc3IvbG9nIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuMC4yIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjkyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JccHNyXGxvZyI7fXM6MTY6InBzci9zaW1wbGUtY2FjaGUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNjoicHNyL3NpbXBsZS1jYWNoZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIzLjAuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxwc3Jcc2ltcGxlLWNhY2hlIjt9czo5OiJwc3kvcHN5c2giO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo5OiJwc3kvcHN5c2giO3M6MTA6IgAqAHZlcnNpb24iO3M6NzoiMC4xMi4yNCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBzeVxwc3lzaCI7fXM6MTc6InJhbXNleS9jb2xsZWN0aW9uIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTc6InJhbXNleS9jb2xsZWN0aW9uIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMS4xIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHJhbXNleVxjb2xsZWN0aW9uIjt9czoxMToicmFtc2V5L3V1aWQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMToicmFtc2V5L3V1aWQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNC45LjQiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxyYW1zZXlcdXVpZCI7fXM6MTM6InN5bWZvbnkvY2xvY2siO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMzoic3ltZm9ueS9jbG9jayI7czoxMDoiACoAdmVyc2lvbiI7czo2OiI3LjQuMjEiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTg6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxzeW1mb255XGNsb2NrIjt9czoxNToic3ltZm9ueS9jb25zb2xlIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTU6InN5bWZvbnkvY29uc29sZSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiI3LjQuMjEiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxjb25zb2xlIjt9czoyMDoic3ltZm9ueS9jc3Mtc2VsZWN0b3IiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMDoic3ltZm9ueS9jc3Mtc2VsZWN0b3IiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiNy40LjE4IjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHN5bWZvbnlcY3NzLXNlbGVjdG9yIjt9czoyOToic3ltZm9ueS9kZXByZWNhdGlvbi1jb250cmFjdHMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyOToic3ltZm9ueS9kZXByZWNhdGlvbi1jb250cmFjdHMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMy43LjEiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE0OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxkZXByZWNhdGlvbi1jb250cmFjdHMiO31zOjIxOiJzeW1mb255L2Vycm9yLWhhbmRsZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMToic3ltZm9ueS9lcnJvci1oYW5kbGVyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjcuNC4yMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxzeW1mb255XGVycm9yLWhhbmRsZXIiO31zOjI0OiJzeW1mb255L2V2ZW50LWRpc3BhdGNoZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNDoic3ltZm9ueS9ldmVudC1kaXNwYXRjaGVyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjcuNC4xNyI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDk6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxzeW1mb255XGV2ZW50LWRpc3BhdGNoZXIiO31zOjM0OiJzeW1mb255L2V2ZW50LWRpc3BhdGNoZXItY29udHJhY3RzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzQ6InN5bWZvbnkvZXZlbnQtZGlzcGF0Y2hlci1jb250cmFjdHMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMy43LjEiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxldmVudC1kaXNwYXRjaGVyLWNvbnRyYWN0cyI7fXM6MTQ6InN5bWZvbnkvZmluZGVyIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTQ6InN5bWZvbnkvZmluZGVyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjcuNC4yMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5OToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHN5bWZvbnlcZmluZGVyIjt9czoyMzoic3ltZm9ueS9odHRwLWZvdW5kYXRpb24iO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMzoic3ltZm9ueS9odHRwLWZvdW5kYXRpb24iO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiNy40LjIxIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHN5bWZvbnlcaHR0cC1mb3VuZGF0aW9uIjt9czoxOToic3ltZm9ueS9odHRwLWtlcm5lbCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE5OiJzeW1mb255L2h0dHAta2VybmVsIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjcuNC4yMSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxzeW1mb255XGh0dHAta2VybmVsIjt9czoxNDoic3ltZm9ueS9tYWlsZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNDoic3ltZm9ueS9tYWlsZXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiNy40LjE5IjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxtYWlsZXIiO31zOjEyOiJzeW1mb255L21pbWUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMjoic3ltZm9ueS9taW1lIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjcuNC4xOSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHN5bWZvbnlcbWltZSI7fXM6MjI6InN5bWZvbnkvcG9seWZpbGwtY3R5cGUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMjoic3ltZm9ueS9wb2x5ZmlsbC1jdHlwZSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjM3LjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxwb2x5ZmlsbC1jdHlwZSI7fXM6MzA6InN5bWZvbnkvcG9seWZpbGwtaW50bC1ncmFwaGVtZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMwOiJzeW1mb255L3BvbHlmaWxsLWludGwtZ3JhcGhlbWUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS40My4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHN5bWZvbnlccG9seWZpbGwtaW50bC1ncmFwaGVtZSI7fXM6MjU6InN5bWZvbnkvcG9seWZpbGwtaW50bC1pZG4iO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNToic3ltZm9ueS9wb2x5ZmlsbC1pbnRsLWlkbiI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjQzLjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTEwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxwb2x5ZmlsbC1pbnRsLWlkbiI7fXM6MzI6InN5bWZvbnkvcG9seWZpbGwtaW50bC1ub3JtYWxpemVyIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzI6InN5bWZvbnkvcG9seWZpbGwtaW50bC1ub3JtYWxpemVyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuNDMuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxzeW1mb255XHBvbHlmaWxsLWludGwtbm9ybWFsaXplciI7fXM6MjU6InN5bWZvbnkvcG9seWZpbGwtbWJzdHJpbmciO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNToic3ltZm9ueS9wb2x5ZmlsbC1tYnN0cmluZyI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjQzLjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTEwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxwb2x5ZmlsbC1tYnN0cmluZyI7fXM6MjI6InN5bWZvbnkvcG9seWZpbGwtcGhwODAiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMjoic3ltZm9ueS9wb2x5ZmlsbC1waHA4MCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjQzLjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxwb2x5ZmlsbC1waHA4MCI7fXM6MjI6InN5bWZvbnkvcG9seWZpbGwtcGhwODIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMjoic3ltZm9ueS9wb2x5ZmlsbC1waHA4MiI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjQzLjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxwb2x5ZmlsbC1waHA4MiI7fXM6MjI6InN5bWZvbnkvcG9seWZpbGwtcGhwODMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMjoic3ltZm9ueS9wb2x5ZmlsbC1waHA4MyI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjQzLjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxwb2x5ZmlsbC1waHA4MyI7fXM6MjI6InN5bWZvbnkvcG9seWZpbGwtcGhwODQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMjoic3ltZm9ueS9wb2x5ZmlsbC1waHA4NCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjQzLjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxwb2x5ZmlsbC1waHA4NCI7fXM6MjI6InN5bWZvbnkvcG9seWZpbGwtcGhwODUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMjoic3ltZm9ueS9wb2x5ZmlsbC1waHA4NSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjQzLjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxwb2x5ZmlsbC1waHA4NSI7fXM6MjI6InN5bWZvbnkvcG9seWZpbGwtcGhwODYiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMjoic3ltZm9ueS9wb2x5ZmlsbC1waHA4NiI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjQzLjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxwb2x5ZmlsbC1waHA4NiI7fXM6MjE6InN5bWZvbnkvcG9seWZpbGwtdGltZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjIxOiJzeW1mb255L3BvbHlmaWxsLXRpbWUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS40Mi4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHN5bWZvbnlccG9seWZpbGwtdGltZSI7fXM6MjE6InN5bWZvbnkvcG9seWZpbGwtdXVpZCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjIxOiJzeW1mb255L3BvbHlmaWxsLXV1aWQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS40My4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHN5bWZvbnlccG9seWZpbGwtdXVpZCI7fXM6MTU6InN5bWZvbnkvcHJvY2VzcyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJzeW1mb255L3Byb2Nlc3MiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiNy40LjIxIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHN5bWZvbnlccHJvY2VzcyI7fXM6MTU6InN5bWZvbnkvcm91dGluZyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJzeW1mb255L3JvdXRpbmciO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiNy40LjIxIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHN5bWZvbnlccm91dGluZyI7fXM6MjU6InN5bWZvbnkvc2VydmljZS1jb250cmFjdHMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNToic3ltZm9ueS9zZXJ2aWNlLWNvbnRyYWN0cyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIzLjcuMyI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxzeW1mb255XHNlcnZpY2UtY29udHJhY3RzIjt9czoxNDoic3ltZm9ueS9zdHJpbmciO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNDoic3ltZm9ueS9zdHJpbmciO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiNy40LjIxIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVxzdHJpbmciO31zOjE5OiJzeW1mb255L3RyYW5zbGF0aW9uIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTk6InN5bWZvbnkvdHJhbnNsYXRpb24iO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiNy40LjE3IjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHN5bWZvbnlcdHJhbnNsYXRpb24iO31zOjI5OiJzeW1mb255L3RyYW5zbGF0aW9uLWNvbnRyYWN0cyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI5OiJzeW1mb255L3RyYW5zbGF0aW9uLWNvbnRyYWN0cyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIzLjcuMSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxzeW1mb255XHRyYW5zbGF0aW9uLWNvbnRyYWN0cyI7fXM6MTE6InN5bWZvbnkvdWlkIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTE6InN5bWZvbnkvdWlkIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjcuNC4yMSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHN5bWZvbnlcdWlkIjt9czoxODoic3ltZm9ueS92YXItZHVtcGVyIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTg6InN5bWZvbnkvdmFyLWR1bXBlciI7czoxMDoiACoAdmVyc2lvbiI7czo2OiI3LjQuMjEiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVx2YXItZHVtcGVyIjt9czozMzoidGlqc3ZlcmtveWVuL2Nzcy10by1pbmxpbmUtc3R5bGVzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzM6InRpanN2ZXJrb3llbi9jc3MtdG8taW5saW5lLXN0eWxlcyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjQuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTg6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclx0aWpzdmVya295ZW5cY3NzLXRvLWlubGluZS1zdHlsZXMiO31zOjE2OiJ2bHVjYXMvcGhwZG90ZW52IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTY6InZsdWNhcy9waHBkb3RlbnYiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNS44LjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAxOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcdmx1Y2FzXHBocGRvdGVudiI7fXM6MTk6InZva3UvcG9ydGFibGUtYXNjaWkiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxOToidm9rdS9wb3J0YWJsZS1hc2NpaSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjEuMSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclx2b2t1XHBvcnRhYmxlLWFzY2lpIjt9czoxNzoiYnJpYW5pdW0vcGFyYXRlc3QiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNzoiYnJpYW5pdW0vcGFyYXRlc3QiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiNy4yMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGJyaWFuaXVtXHBhcmF0ZXN0Ijt9czoxMzoiY29tcG9zZXIvcGNyZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEzOiJjb21wb3Nlci9wY3JlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuNC4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk4OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcY29tcG9zZXJccGNyZSI7fXM6MTU6ImNvbXBvc2VyL3NlbXZlciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJjb21wb3Nlci9zZW12ZXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMy41LjIiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcY29tcG9zZXJcc2VtdmVyIjt9czoyMzoiY29tcG9zZXIveGRlYnVnLWhhbmRsZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMzoiY29tcG9zZXIveGRlYnVnLWhhbmRsZXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMy4wLjUiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA4OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcY29tcG9zZXJceGRlYnVnLWhhbmRsZXIiO31zOjIxOiJkb2N0cmluZS9kZXByZWNhdGlvbnMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMToiZG9jdHJpbmUvZGVwcmVjYXRpb25zIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMS42IjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGRvY3RyaW5lXGRlcHJlY2F0aW9ucyI7fXM6MTQ6ImZha2VycGhwL2Zha2VyIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTQ6ImZha2VycGhwL2Zha2VyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMjQuMSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo1OiJeMS4yNCI7czo3OiIAKgBwYXRoIjtzOjk5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcZmFrZXJwaHBcZmFrZXIiO31zOjIyOiJmaWRyeS9jcHUtY29yZS1jb3VudGVyIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjI6ImZpZHJ5L2NwdS1jb3JlLWNvdW50ZXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMS40LjEiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcZmlkcnlcY3B1LWNvcmUtY291bnRlciI7fXM6MTE6ImZpbHAvd2hvb3BzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTE6ImZpbHAvd2hvb3BzIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjIuMTguNyI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGZpbHBcd2hvb3BzIjt9czoyMToiaGFtY3Jlc3QvaGFtY3Jlc3QtcGhwIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjE6ImhhbWNyZXN0L2hhbWNyZXN0LXBocCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIzLjAuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxoYW1jcmVzdFxoYW1jcmVzdC1waHAiO31zOjE3OiJpYW1jYWwvc3FsLXBhcnNlciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE3OiJpYW1jYWwvc3FsLXBhcnNlciI7czoxMDoiACoAdmVyc2lvbiI7czozOiIwLjciO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcaWFtY2FsXHNxbC1wYXJzZXIiO31zOjMwOiJqZWFuODUvcHJldHR5LXBhY2thZ2UtdmVyc2lvbnMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMDoiamVhbjg1L3ByZXR0eS1wYWNrYWdlLXZlcnNpb25zIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMS4xIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGplYW44NVxwcmV0dHktcGFja2FnZS12ZXJzaW9ucyI7fXM6MTc6ImxhcmFzdGFuL2xhcmFzdGFuIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTc6ImxhcmFzdGFuL2xhcmFzdGFuIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjMuMTMuMiI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo0OiJeMy45IjtzOjc6IgAqAHBhdGgiO3M6MTAyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcbGFyYXN0YW5cbGFyYXN0YW4iO31zOjIyOiJsYXJhdmVsL2FnZW50LWRldGVjdG9yIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjI6ImxhcmF2ZWwvYWdlbnQtZGV0ZWN0b3IiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi4wLjUiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcbGFyYXZlbFxhZ2VudC1kZXRlY3RvciI7fXM6MTM6ImxhcmF2ZWwvYm9vc3QiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMzoibGFyYXZlbC9ib29zdCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIyLjEwLjMiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NDoiXjIuMiI7czo3OiIAKgBwYXRoIjtzOjk4OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcbGFyYXZlbFxib29zdCI7fXM6MTE6ImxhcmF2ZWwvbWNwIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTE6ImxhcmF2ZWwvbWNwIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMS4xIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcbGFyYXZlbFxtY3AiO31zOjEyOiJsYXJhdmVsL3BhaWwiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMjoibGFyYXZlbC9wYWlsIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMi43IjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MTtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjY6Il4xLjIuNSI7czo3OiIAKgBwYXRoIjtzOjk3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcbGFyYXZlbFxwYWlsIjt9czoxMToibGFyYXZlbC9wYW8iO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMToibGFyYXZlbC9wYW8iO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMS4xLjUiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NjoiXjEuMC42IjtzOjc6IgAqAHBhdGgiO3M6OTY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxsYXJhdmVsXHBhbyI7fXM6MTI6ImxhcmF2ZWwvcGludCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEyOiJsYXJhdmVsL3BpbnQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS4zMi4xIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MTtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjU6Il4xLjI3IjtzOjc6IgAqAHBhdGgiO3M6OTc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxsYXJhdmVsXHBpbnQiO31zOjE0OiJsYXJhdmVsL3Jvc3RlciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE0OiJsYXJhdmVsL3Jvc3RlciI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjAuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5OToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGxhcmF2ZWxccm9zdGVyIjt9czoxMjoibGFyYXZlbC9zYWlsIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTI6ImxhcmF2ZWwvc2FpbCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjY5LjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NToiXjEuNTMiO3M6NzoiACoAcGF0aCI7czo5NzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXGxhcmF2ZWxcc2FpbCI7fXM6MTU6Im1vY2tlcnkvbW9ja2VyeSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJtb2NrZXJ5L21vY2tlcnkiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS42LjE1IjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MTtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjQ6Il4xLjYiO3M6NzoiACoAcGF0aCI7czoxMDA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxtb2NrZXJ5XG1vY2tlcnkiO31zOjE3OiJteWNsYWJzL2RlZXAtY29weSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE3OiJteWNsYWJzL2RlZXAtY29weSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjE0LjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcbXljbGFic1xkZWVwLWNvcHkiO31zOjIwOiJudW5vbWFkdXJvL2NvbGxpc2lvbiI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjIwOiJudW5vbWFkdXJvL2NvbGxpc2lvbiI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI4LjkuNSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo2OiJeOC45LjMiO3M6NzoiACoAcGF0aCI7czoxMDU6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxudW5vbWFkdXJvXGNvbGxpc2lvbiI7fXM6MTI6InBlc3RwaHAvcGVzdCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEyOiJwZXN0cGhwL3Blc3QiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNC43LjgiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NDoiXjQuNyI7czo3OiIAKgBwYXRoIjtzOjk3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JccGVzdHBocFxwZXN0Ijt9czoxOToicGVzdHBocC9wZXN0LXBsdWdpbiI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE5OiJwZXN0cGhwL3Blc3QtcGx1Z2luIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBlc3RwaHBccGVzdC1wbHVnaW4iO31zOjI0OiJwZXN0cGhwL3Blc3QtcGx1Z2luLWFyY2giO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNDoicGVzdHBocC9wZXN0LXBsdWdpbi1hcmNoIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMC4yIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwOToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBlc3RwaHBccGVzdC1wbHVnaW4tYXJjaCI7fXM6MjU6InBlc3RwaHAvcGVzdC1wbHVnaW4tZHJpZnQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNToicGVzdHBocC9wZXN0LXBsdWdpbi1kcmlmdCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI0LjEuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo0OiJeNC4xIjtzOjc6IgAqAHBhdGgiO3M6MTEwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JccGVzdHBocFxwZXN0LXBsdWdpbi1kcmlmdCI7fXM6Mjc6InBlc3RwaHAvcGVzdC1wbHVnaW4tbGFyYXZlbCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI3OiJwZXN0cGhwL3Blc3QtcGx1Z2luLWxhcmF2ZWwiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNC4xLjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NDoiXjQuMSI7czo3OiIAKgBwYXRoIjtzOjExMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBlc3RwaHBccGVzdC1wbHVnaW4tbGFyYXZlbCI7fXM6MjY6InBlc3RwaHAvcGVzdC1wbHVnaW4tbXV0YXRlIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjY6InBlc3RwaHAvcGVzdC1wbHVnaW4tbXV0YXRlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMC4xIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBlc3RwaHBccGVzdC1wbHVnaW4tbXV0YXRlIjt9czoyOToicGVzdHBocC9wZXN0LXBsdWdpbi1wcm9mYW5pdHkiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyOToicGVzdHBocC9wZXN0LXBsdWdpbi1wcm9mYW5pdHkiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNC4yLjEiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE0OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JccGVzdHBocFxwZXN0LXBsdWdpbi1wcm9mYW5pdHkiO31zOjE2OiJwaGFyLWlvL21hbmlmZXN0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTY6InBoYXItaW8vbWFuaWZlc3QiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi4wLjQiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAxOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JccGhhci1pb1xtYW5pZmVzdCI7fXM6MTU6InBoYXItaW8vdmVyc2lvbiI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJwaGFyLWlvL3ZlcnNpb24iO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMy4yLjEiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JccGhhci1pb1x2ZXJzaW9uIjt9czozMToicGhwZG9jdW1lbnRvci9yZWZsZWN0aW9uLWNvbW1vbiI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMxOiJwaHBkb2N1bWVudG9yL3JlZmxlY3Rpb24tY29tbW9uIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMi4xIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBocGRvY3VtZW50b3JccmVmbGVjdGlvbi1jb21tb24iO31zOjMzOiJwaHBkb2N1bWVudG9yL3JlZmxlY3Rpb24tZG9jYmxvY2siO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMzoicGhwZG9jdW1lbnRvci9yZWZsZWN0aW9uLWRvY2Jsb2NrIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjYuMC4zIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBocGRvY3VtZW50b3JccmVmbGVjdGlvbi1kb2NibG9jayI7fXM6Mjc6InBocGRvY3VtZW50b3IvdHlwZS1yZXNvbHZlciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI3OiJwaHBkb2N1bWVudG9yL3R5cGUtcmVzb2x2ZXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi4xLjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTEyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JccGhwZG9jdW1lbnRvclx0eXBlLXJlc29sdmVyIjt9czoxNToicGhwc3Rhbi9waHBzdGFuIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTU6InBocHN0YW4vcGhwc3RhbiI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjMuMiI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxwaHBzdGFuXHBocHN0YW4iO31zOjI1OiJwaHB1bml0L3BocC1jb2RlLWNvdmVyYWdlIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjU6InBocHVuaXQvcGhwLWNvZGUtY292ZXJhZ2UiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMTIuNS44IjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBocHVuaXRccGhwLWNvZGUtY292ZXJhZ2UiO31zOjI1OiJwaHB1bml0L3BocC1maWxlLWl0ZXJhdG9yIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjU6InBocHVuaXQvcGhwLWZpbGUtaXRlcmF0b3IiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNi4wLjIiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTEwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JccGhwdW5pdFxwaHAtZmlsZS1pdGVyYXRvciI7fXM6MTk6InBocHVuaXQvcGhwLWludm9rZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxOToicGhwdW5pdC9waHAtaW52b2tlciI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI2LjAuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxwaHB1bml0XHBocC1pbnZva2VyIjt9czoyNToicGhwdW5pdC9waHAtdGV4dC10ZW1wbGF0ZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI1OiJwaHB1bml0L3BocC10ZXh0LXRlbXBsYXRlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjUuMC4xIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHBocHVuaXRccGhwLXRleHQtdGVtcGxhdGUiO31zOjE3OiJwaHB1bml0L3BocC10aW1lciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE3OiJwaHB1bml0L3BocC10aW1lciI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI4LjAuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDI6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxwaHB1bml0XHBocC10aW1lciI7fXM6MTU6InBocHVuaXQvcGhwdW5pdCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJwaHB1bml0L3BocHVuaXQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NzoiMTIuNS4zMyI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxwaHB1bml0XHBocHVuaXQiO31zOjIwOiJzZWJhc3RpYW4vY2xpLXBhcnNlciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjIwOiJzZWJhc3RpYW4vY2xpLXBhcnNlciI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI0LjIuMSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDU6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxzZWJhc3RpYW5cY2xpLXBhcnNlciI7fXM6MjA6InNlYmFzdGlhbi9jb21wYXJhdG9yIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjA6InNlYmFzdGlhbi9jb21wYXJhdG9yIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjcuMS44IjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHNlYmFzdGlhblxjb21wYXJhdG9yIjt9czoyMDoic2ViYXN0aWFuL2NvbXBsZXhpdHkiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMDoic2ViYXN0aWFuL2NvbXBsZXhpdHkiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNS4wLjAiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA1OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc2ViYXN0aWFuXGNvbXBsZXhpdHkiO31zOjE0OiJzZWJhc3RpYW4vZGlmZiI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE0OiJzZWJhc3RpYW4vZGlmZiI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI3LjAuMSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5OToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHNlYmFzdGlhblxkaWZmIjt9czoyMToic2ViYXN0aWFuL2Vudmlyb25tZW50IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjE6InNlYmFzdGlhbi9lbnZpcm9ubWVudCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI4LjEuMiI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxzZWJhc3RpYW5cZW52aXJvbm1lbnQiO31zOjE4OiJzZWJhc3RpYW4vZXhwb3J0ZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxODoic2ViYXN0aWFuL2V4cG9ydGVyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjcuMC4zIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHNlYmFzdGlhblxleHBvcnRlciI7fXM6MjI6InNlYmFzdGlhbi9nbG9iYWwtc3RhdGUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMjoic2ViYXN0aWFuL2dsb2JhbC1zdGF0ZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI4LjAuMyI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxzZWJhc3RpYW5cZ2xvYmFsLXN0YXRlIjt9czoyMzoic2ViYXN0aWFuL2xpbmVzLW9mLWNvZGUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMzoic2ViYXN0aWFuL2xpbmVzLW9mLWNvZGUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNC4wLjEiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA4OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc2ViYXN0aWFuXGxpbmVzLW9mLWNvZGUiO31zOjI3OiJzZWJhc3RpYW4vb2JqZWN0LWVudW1lcmF0b3IiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNzoic2ViYXN0aWFuL29iamVjdC1lbnVtZXJhdG9yIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjcuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHNlYmFzdGlhblxvYmplY3QtZW51bWVyYXRvciI7fXM6MjY6InNlYmFzdGlhbi9vYmplY3QtcmVmbGVjdG9yIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjY6InNlYmFzdGlhbi9vYmplY3QtcmVmbGVjdG9yIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjUuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHNlYmFzdGlhblxvYmplY3QtcmVmbGVjdG9yIjt9czoyNzoic2ViYXN0aWFuL3JlY3Vyc2lvbi1jb250ZXh0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjc6InNlYmFzdGlhbi9yZWN1cnNpb24tY29udGV4dCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI3LjAuMSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTI6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclxzZWJhc3RpYW5ccmVjdXJzaW9uLWNvbnRleHQiO31zOjE0OiJzZWJhc3RpYW4vdHlwZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE0OiJzZWJhc3RpYW4vdHlwZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI2LjAuNCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5OToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcdmVuZG9yXHNlYmFzdGlhblx0eXBlIjt9czoxNzoic2ViYXN0aWFuL3ZlcnNpb24iO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNzoic2ViYXN0aWFuL3ZlcnNpb24iO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNi4wLjEiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc2ViYXN0aWFuXHZlcnNpb24iO31zOjI4OiJzdGFhYm0vc2lkZS1lZmZlY3RzLWRldGVjdG9yIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjg6InN0YWFibS9zaWRlLWVmZmVjdHMtZGV0ZWN0b3IiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMS4wLjUiO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTEzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3RhYWJtXHNpZGUtZWZmZWN0cy1kZXRlY3RvciI7fXM6MTI6InN5bWZvbnkveWFtbCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEyOiJzeW1mb255L3lhbWwiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiNy40LjIxIjtzOjk6IgAqAHNvdXJjZSI7cjo4O3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3Jcc3ltZm9ueVx5YW1sIjt9czozNToidGEtdGlrb21hL3BocHVuaXQtYXJjaGl0ZWN0dXJlLXRlc3QiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozNToidGEtdGlrb21hL3BocHVuaXQtYXJjaGl0ZWN0dXJlLXRlc3QiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMC44LjciO3M6OToiACoAc291cmNlIjtyOjg7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFx2ZW5kb3JcdGEtdGlrb21hXHBocHVuaXQtYXJjaGl0ZWN0dXJlLXRlc3QiO31zOjE3OiJ0aGVzZWVyL3Rva2VuaXplciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE3OiJ0aGVzZWVyL3Rva2VuaXplciI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjAuMSI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDI6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclx0aGVzZWVyXHRva2VuaXplciI7fXM6MTY6IndlYm1vemFydC9hc3NlcnQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNjoid2VibW96YXJ0L2Fzc2VydCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjUuMCI7czo5OiIAKgBzb3VyY2UiO3I6ODtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXHZlbmRvclx3ZWJtb3phcnRcYXNzZXJ0Ijt9fXM6MTE6IgAqAHBhY2thZ2VzIjtPOjMyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlQ29sbGVjdGlvbiI6Mjp7czo4OiIAKgBpdGVtcyI7YToxNDE6e2k6MDtyOjU7aToxO3I6MTM7aToyO3I6MjE7aTozO3I6Mjk7aTo0O3I6Mzc7aTo1O3I6NDU7aTo2O3I6NTM7aTo3O3I6NjE7aTo4O3I6Njk7aTo5O3I6Nzc7aToxMDtyOjg1O2k6MTE7cjo5MztpOjEyO3I6MTAxO2k6MTM7cjoxMDk7aToxNDtyOjExNztpOjE1O3I6MTI1O2k6MTY7cjoxMzM7aToxNztyOjE0MTtpOjE4O3I6MTQ5O2k6MTk7cjoxNTc7aToyMDtyOjE2NTtpOjIxO3I6MTczO2k6MjI7cjoxODE7aToyMztyOjE4OTtpOjI0O3I6MTk3O2k6MjU7cjoyMDU7aToyNjtyOjIxMztpOjI3O3I6MjIxO2k6Mjg7cjoyMjk7aToyOTtyOjIzNztpOjMwO3I6MjQ1O2k6MzE7cjoyNTM7aTozMjtyOjI2MTtpOjMzO3I6MjY5O2k6MzQ7cjoyNzc7aTozNTtyOjI4NTtpOjM2O3I6MjkzO2k6Mzc7cjozMDE7aTozODtyOjMwOTtpOjM5O3I6MzE3O2k6NDA7cjozMjU7aTo0MTtyOjMzMztpOjQyO3I6MzQxO2k6NDM7cjozNDk7aTo0NDtyOjM1NztpOjQ1O3I6MzY1O2k6NDY7cjozNzM7aTo0NztyOjM4MTtpOjQ4O3I6Mzg5O2k6NDk7cjozOTc7aTo1MDtyOjQwNTtpOjUxO3I6NDEzO2k6NTI7cjo0MjE7aTo1MztyOjQyOTtpOjU0O3I6NDM3O2k6NTU7cjo0NDU7aTo1NjtyOjQ1MztpOjU3O3I6NDYxO2k6NTg7cjo0Njk7aTo1OTtyOjQ3NztpOjYwO3I6NDg1O2k6NjE7cjo0OTM7aTo2MjtyOjUwMTtpOjYzO3I6NTA5O2k6NjQ7cjo1MTc7aTo2NTtyOjUyNTtpOjY2O3I6NTMzO2k6Njc7cjo1NDE7aTo2ODtyOjU0OTtpOjY5O3I6NTU3O2k6NzA7cjo1NjU7aTo3MTtyOjU3MztpOjcyO3I6NTgxO2k6NzM7cjo1ODk7aTo3NDtyOjU5NztpOjc1O3I6NjA1O2k6NzY7cjo2MTM7aTo3NztyOjYyMTtpOjc4O3I6NjI5O2k6Nzk7cjo2Mzc7aTo4MDtyOjY0NTtpOjgxO3I6NjUzO2k6ODI7cjo2NjE7aTo4MztyOjY2OTtpOjg0O3I6Njc3O2k6ODU7cjo2ODU7aTo4NjtyOjY5MztpOjg3O3I6NzAxO2k6ODg7cjo3MDk7aTo4OTtyOjcxNztpOjkwO3I6NzI1O2k6OTE7cjo3MzM7aTo5MjtyOjc0MTtpOjkzO3I6NzQ5O2k6OTQ7cjo3NTc7aTo5NTtyOjc2NTtpOjk2O3I6NzczO2k6OTc7cjo3ODE7aTo5ODtyOjc4OTtpOjk5O3I6Nzk3O2k6MTAwO3I6ODA1O2k6MTAxO3I6ODEzO2k6MTAyO3I6ODIxO2k6MTAzO3I6ODI5O2k6MTA0O3I6ODM3O2k6MTA1O3I6ODQ1O2k6MTA2O3I6ODUzO2k6MTA3O3I6ODYxO2k6MTA4O3I6ODY5O2k6MTA5O3I6ODc3O2k6MTEwO3I6ODg1O2k6MTExO3I6ODkzO2k6MTEyO3I6OTAxO2k6MTEzO3I6OTA5O2k6MTE0O3I6OTE3O2k6MTE1O3I6OTI1O2k6MTE2O3I6OTMzO2k6MTE3O3I6OTQxO2k6MTE4O3I6OTQ5O2k6MTE5O3I6OTU3O2k6MTIwO3I6OTY1O2k6MTIxO3I6OTczO2k6MTIyO3I6OTgxO2k6MTIzO3I6OTg5O2k6MTI0O3I6OTk3O2k6MTI1O3I6MTAwNTtpOjEyNjtyOjEwMTM7aToxMjc7cjoxMDIxO2k6MTI4O3I6MTAyOTtpOjEyOTtyOjEwMzc7aToxMzA7cjoxMDQ1O2k6MTMxO3I6MTA1MztpOjEzMjtyOjEwNjE7aToxMzM7cjoxMDY5O2k6MTM0O3I6MTA3NztpOjEzNTtyOjEwODU7aToxMzY7cjoxMDkzO2k6MTM3O3I6MTEwMTtpOjEzODtyOjExMDk7aToxMzk7cjoxMTE3O2k6MTQwO3I6MTEyNTt9czoyODoiACoAZXNjYXBlV2hlbkNhc3RpbmdUb1N0cmluZyI7YjowO319czoyOiJqcyI7TzozNzoiTGFyYXZlbFxSb3N0ZXJcRWNvc3lzdGVtc1xKc0Vjb3N5c3RlbSI6Mzp7czo5OiIAKgBieU5hbWUiO2E6Mjg2OntzOjI0OiJAYWxjYWx6b25lL2Fuc2ktdG9rZW5pemUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNDoiQGFsY2Fsem9uZS9hbnNpLXRva2VuaXplIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjAuMy4xIjtzOjk6IgAqAHNvdXJjZSI7RTozODoiTGFyYXZlbFxSb3N0ZXJcRW51bXNcUGFja2FnZVNvdXJjZTpOcG0iO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBhbGNhbHpvbmVcYW5zaS10b2tlbml6ZSI7fXM6MTc6IkBiYWJlbC9jb2RlLWZyYW1lIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTc6IkBiYWJlbC9jb2RlLWZyYW1lIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjguMC42IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBiYWJlbFxjb2RlLWZyYW1lIjt9czoxODoiQGJhYmVsL2NvbXBhdC1kYXRhIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTg6IkBiYWJlbC9jb21wYXQtZGF0YSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI4LjAuNSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDk6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAYmFiZWxcY29tcGF0LWRhdGEiO31zOjExOiJAYmFiZWwvY29yZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjExOiJAYmFiZWwvY29yZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI4LjAuOSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDI6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAYmFiZWxcY29yZSI7fXM6MTY6IkBiYWJlbC9nZW5lcmF0b3IiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNjoiQGJhYmVsL2dlbmVyYXRvciI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI4LjAuNiI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAYmFiZWxcZ2VuZXJhdG9yIjt9czozMzoiQGJhYmVsL2hlbHBlci1jb21waWxhdGlvbi10YXJnZXRzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzM6IkBiYWJlbC9oZWxwZXItY29tcGlsYXRpb24tdGFyZ2V0cyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI4LjAuNyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAYmFiZWxcaGVscGVyLWNvbXBpbGF0aW9uLXRhcmdldHMiO31zOjIxOiJAYmFiZWwvaGVscGVyLWdsb2JhbHMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMToiQGJhYmVsL2hlbHBlci1nbG9iYWxzIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjguMC42IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBiYWJlbFxoZWxwZXItZ2xvYmFscyI7fXM6Mjc6IkBiYWJlbC9oZWxwZXItc3RyaW5nLXBhcnNlciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI3OiJAYmFiZWwvaGVscGVyLXN0cmluZy1wYXJzZXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiOC4wLjgiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE4OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQGJhYmVsXGhlbHBlci1zdHJpbmctcGFyc2VyIjt9czozNDoiQGJhYmVsL2hlbHBlci12YWxpZGF0b3ItaWRlbnRpZmllciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjM0OiJAYmFiZWwvaGVscGVyLXZhbGlkYXRvci1pZGVudGlmaWVyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjguMC42IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBiYWJlbFxoZWxwZXItdmFsaWRhdG9yLWlkZW50aWZpZXIiO31zOjMwOiJAYmFiZWwvaGVscGVyLXZhbGlkYXRvci1vcHRpb24iO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMDoiQGJhYmVsL2hlbHBlci12YWxpZGF0b3Itb3B0aW9uIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjguMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBiYWJlbFxoZWxwZXItdmFsaWRhdG9yLW9wdGlvbiI7fXM6MTQ6IkBiYWJlbC9oZWxwZXJzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTQ6IkBiYWJlbC9oZWxwZXJzIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjguMC44IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBiYWJlbFxoZWxwZXJzIjt9czoxMzoiQGJhYmVsL3BhcnNlciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEzOiJAYmFiZWwvcGFyc2VyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjguMC44IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBiYWJlbFxwYXJzZXIiO31zOjE0OiJAYmFiZWwvcnVudGltZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE0OiJAYmFiZWwvcnVudGltZSI7czoxMDoiACoAdmVyc2lvbiI7czo3OiI3LjI5LjEwIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBiYWJlbFxydW50aW1lIjt9czoxNToiQGJhYmVsL3RlbXBsYXRlIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTU6IkBiYWJlbC90ZW1wbGF0ZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI4LjAuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAYmFiZWxcdGVtcGxhdGUiO31zOjE1OiJAYmFiZWwvdHJhdmVyc2UiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNToiQGJhYmVsL3RyYXZlcnNlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjguMC43IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBiYWJlbFx0cmF2ZXJzZSI7fXM6MTI6IkBiYWJlbC90eXBlcyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEyOiJAYmFiZWwvdHlwZXMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiOC4wLjgiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQGJhYmVsXHR5cGVzIjt9czoxNToiQGluZXJ0aWFqcy9jb3JlIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTU6IkBpbmVydGlhanMvY29yZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIzLjkuMSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAaW5lcnRpYWpzXGNvcmUiO31zOjE2OiJAaW5lcnRpYWpzL3JlYWN0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTY6IkBpbmVydGlhanMvcmVhY3QiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMy45LjEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NjoiXjMuMC4wIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQGluZXJ0aWFqc1xyZWFjdCI7fXM6MTU6IkBpbmVydGlhanMvdml0ZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJAaW5lcnRpYWpzL3ZpdGUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMy45LjEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NjoiXjMuMC4wIjtzOjc6IgAqAHBhdGgiO3M6MTA2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQGluZXJ0aWFqc1x2aXRlIjt9czoyMzoiQGpyaWRnZXdlbGwvZ2VuLW1hcHBpbmciO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMzoiQGpyaWRnZXdlbGwvZ2VuLW1hcHBpbmciO3M6MTA6IgAqAHZlcnNpb24iO3M6MTI6IjAuNC4wLWJldGEuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAanJpZGdld2VsbFxnZW4tbWFwcGluZyI7fXM6MjE6IkBqcmlkZ2V3ZWxsL3JlbWFwcGluZyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjIxOiJAanJpZGdld2VsbC9yZW1hcHBpbmciO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi4zLjUiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTEyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQGpyaWRnZXdlbGxccmVtYXBwaW5nIjt9czoyMzoiQGpyaWRnZXdlbGwvcmVzb2x2ZS11cmkiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMzoiQGpyaWRnZXdlbGwvcmVzb2x2ZS11cmkiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMy4xLjIiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE0OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQGpyaWRnZXdlbGxccmVzb2x2ZS11cmkiO31zOjI3OiJAanJpZGdld2VsbC9zb3VyY2VtYXAtY29kZWMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNzoiQGpyaWRnZXdlbGwvc291cmNlbWFwLWNvZGVjIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuNi4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBqcmlkZ2V3ZWxsXHNvdXJjZW1hcC1jb2RlYyI7fXM6MjU6IkBqcmlkZ2V3ZWxsL3RyYWNlLW1hcHBpbmciO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNToiQGpyaWRnZXdlbGwvdHJhY2UtbWFwcGluZyI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjMuMzEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQGpyaWRnZXdlbGxcdHJhY2UtbWFwcGluZyI7fXM6MTg6IkBsYXJhdmVsL211bHRpcGxleCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE4OiJAbGFyYXZlbC9tdWx0aXBsZXgiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMC40LjUiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NjoiXjAuNC4xIjtzOjc6IgAqAHBhdGgiO3M6MTA5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQGxhcmF2ZWxcbXVsdGlwbGV4Ijt9czoyMDoiQG94Yy1wcm9qZWN0L3J1bnRpbWUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMDoiQG94Yy1wcm9qZWN0L3J1bnRpbWUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NzoiMC4xNTUuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hjLXByb2plY3RccnVudGltZSI7fXM6MTg6IkBveGMtcHJvamVjdC90eXBlcyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE4OiJAb3hjLXByb2plY3QvdHlwZXMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NzoiMC4xNTUuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDk6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hjLXByb2plY3RcdHlwZXMiO31zOjM0OiJAcm9sbGRvd24vYmluZGluZy1hbmRyb2lkLWFybS1lYWJpIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzQ6IkByb2xsZG93bi9iaW5kaW5nLWFuZHJvaWQtYXJtLWVhYmkiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS4yLjE1IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEByb2xsZG93blxiaW5kaW5nLWFuZHJvaWQtYXJtLWVhYmkiO31zOjMxOiJAcm9sbGRvd24vYmluZGluZy1hbmRyb2lkLWFybTY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzE6IkByb2xsZG93bi9iaW5kaW5nLWFuZHJvaWQtYXJtNjQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS4yLjE1IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEByb2xsZG93blxiaW5kaW5nLWFuZHJvaWQtYXJtNjQiO31zOjMwOiJAcm9sbGRvd24vYmluZGluZy1kYXJ3aW4tYXJtNjQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMDoiQHJvbGxkb3duL2JpbmRpbmctZGFyd2luLWFybTY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMi4xNSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAcm9sbGRvd25cYmluZGluZy1kYXJ3aW4tYXJtNjQiO31zOjI4OiJAcm9sbGRvd24vYmluZGluZy1kYXJ3aW4teDY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjg6IkByb2xsZG93bi9iaW5kaW5nLWRhcndpbi14NjQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS4yLjE1IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExOToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEByb2xsZG93blxiaW5kaW5nLWRhcndpbi14NjQiO31zOjI5OiJAcm9sbGRvd24vYmluZGluZy1mcmVlYnNkLXg2NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI5OiJAcm9sbGRvd24vYmluZGluZy1mcmVlYnNkLXg2NCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjIuMTUiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHJvbGxkb3duXGJpbmRpbmctZnJlZWJzZC14NjQiO31zOjM3OiJAcm9sbGRvd24vYmluZGluZy1saW51eC1hcm0tZ251ZWFiaWhmIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mzc6IkByb2xsZG93bi9iaW5kaW5nLWxpbnV4LWFybS1nbnVlYWJpaGYiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS4yLjE1IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEByb2xsZG93blxiaW5kaW5nLWxpbnV4LWFybS1nbnVlYWJpaGYiO31zOjMzOiJAcm9sbGRvd24vYmluZGluZy1saW51eC1hcm02NC1nbnUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMzoiQHJvbGxkb3duL2JpbmRpbmctbGludXgtYXJtNjQtZ251IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMi4xNSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAcm9sbGRvd25cYmluZGluZy1saW51eC1hcm02NC1nbnUiO31zOjM0OiJAcm9sbGRvd24vYmluZGluZy1saW51eC1hcm02NC1tdXNsIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzQ6IkByb2xsZG93bi9iaW5kaW5nLWxpbnV4LWFybTY0LW11c2wiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS4yLjE1IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEByb2xsZG93blxiaW5kaW5nLWxpbnV4LWFybTY0LW11c2wiO31zOjMzOiJAcm9sbGRvd24vYmluZGluZy1saW51eC1wcGM2NC1nbnUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMzoiQHJvbGxkb3duL2JpbmRpbmctbGludXgtcHBjNjQtZ251IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMi4xNSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAcm9sbGRvd25cYmluZGluZy1saW51eC1wcGM2NC1nbnUiO31zOjMzOiJAcm9sbGRvd24vYmluZGluZy1saW51eC1zMzkweC1nbnUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMzoiQHJvbGxkb3duL2JpbmRpbmctbGludXgtczM5MHgtZ251IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMi4xNSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAcm9sbGRvd25cYmluZGluZy1saW51eC1zMzkweC1nbnUiO31zOjMxOiJAcm9sbGRvd24vYmluZGluZy1saW51eC14NjQtZ251IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzE6IkByb2xsZG93bi9iaW5kaW5nLWxpbnV4LXg2NC1nbnUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS4yLjE1IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEByb2xsZG93blxiaW5kaW5nLWxpbnV4LXg2NC1nbnUiO31zOjMyOiJAcm9sbGRvd24vYmluZGluZy1saW51eC14NjQtbXVzbCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMyOiJAcm9sbGRvd24vYmluZGluZy1saW51eC14NjQtbXVzbCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjIuMTUiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHJvbGxkb3duXGJpbmRpbmctbGludXgteDY0LW11c2wiO31zOjM1OiJAcm9sbGRvd24vYmluZGluZy1vcGVuaGFybW9ueS1hcm02NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjM1OiJAcm9sbGRvd24vYmluZGluZy1vcGVuaGFybW9ueS1hcm02NCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjIuMTUiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTI2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHJvbGxkb3duXGJpbmRpbmctb3Blbmhhcm1vbnktYXJtNjQiO31zOjM0OiJAcm9sbGRvd24vYmluZGluZy13aW4zMi1hcm02NC1tc3ZjIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzQ6IkByb2xsZG93bi9iaW5kaW5nLXdpbjMyLWFybTY0LW1zdmMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS4yLjE1IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEByb2xsZG93blxiaW5kaW5nLXdpbjMyLWFybTY0LW1zdmMiO31zOjMyOiJAcm9sbGRvd24vYmluZGluZy13aW4zMi14NjQtbXN2YyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMyOiJAcm9sbGRvd24vYmluZGluZy13aW4zMi14NjQtbXN2YyI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjIuMTUiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHJvbGxkb3duXGJpbmRpbmctd2luMzIteDY0LW1zdmMiO31zOjIyOiJAcm9sbGRvd24vcGx1Z2luLWJhYmVsIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjI6IkByb2xsZG93bi9wbHVnaW4tYmFiZWwiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMC4yLjQiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NjoiXjAuMi4zIjtzOjc6IgAqAHBhdGgiO3M6MTEzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHJvbGxkb3duXHBsdWdpbi1iYWJlbCI7fXM6MjE6IkByb2xsZG93bi9wbHVnaW51dGlscyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjIxOiJAcm9sbGRvd24vcGx1Z2ludXRpbHMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMS4wLjEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTEyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHJvbGxkb3duXHBsdWdpbnV0aWxzIjt9czoyODoiQHJvbGx1cC9yb2xsdXAtbGludXgteDY0LWdudSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI4OiJAcm9sbHVwL3JvbGx1cC1saW51eC14NjQtZ251IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuOS41IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MTtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjU6IjQuOS41IjtzOjc6IgAqAHBhdGgiO3M6MTE5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHJvbGx1cFxyb2xsdXAtbGludXgteDY0LWdudSI7fXM6MTc6IkB0YWlsd2luZGNzcy9ub2RlIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTc6IkB0YWlsd2luZGNzcy9ub2RlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMy4zIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB0YWlsd2luZGNzc1xub2RlIjt9czoxODoiQHRhaWx3aW5kY3NzL294aWRlIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTg6IkB0YWlsd2luZGNzcy9veGlkZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI0LjMuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDk6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdGFpbHdpbmRjc3Ncb3hpZGUiO31zOjMyOiJAdGFpbHdpbmRjc3Mvb3hpZGUtYW5kcm9pZC1hcm02NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMyOiJAdGFpbHdpbmRjc3Mvb3hpZGUtYW5kcm9pZC1hcm02NCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI0LjMuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjM6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdGFpbHdpbmRjc3Ncb3hpZGUtYW5kcm9pZC1hcm02NCI7fXM6MzE6IkB0YWlsd2luZGNzcy9veGlkZS1kYXJ3aW4tYXJtNjQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMToiQHRhaWx3aW5kY3NzL294aWRlLWRhcndpbi1hcm02NCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI0LjMuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjI6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdGFpbHdpbmRjc3Ncb3hpZGUtZGFyd2luLWFybTY0Ijt9czoyOToiQHRhaWx3aW5kY3NzL294aWRlLWRhcndpbi14NjQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyOToiQHRhaWx3aW5kY3NzL294aWRlLWRhcndpbi14NjQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNC4zLjMiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHRhaWx3aW5kY3NzXG94aWRlLWRhcndpbi14NjQiO31zOjMwOiJAdGFpbHdpbmRjc3Mvb3hpZGUtZnJlZWJzZC14NjQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMDoiQHRhaWx3aW5kY3NzL294aWRlLWZyZWVic2QteDY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMy4zIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB0YWlsd2luZGNzc1xveGlkZS1mcmVlYnNkLXg2NCI7fXM6Mzg6IkB0YWlsd2luZGNzcy9veGlkZS1saW51eC1hcm0tZ251ZWFiaWhmIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mzg6IkB0YWlsd2luZGNzcy9veGlkZS1saW51eC1hcm0tZ251ZWFiaWhmIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMy4zIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyOToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB0YWlsd2luZGNzc1xveGlkZS1saW51eC1hcm0tZ251ZWFiaWhmIjt9czozNDoiQHRhaWx3aW5kY3NzL294aWRlLWxpbnV4LWFybTY0LWdudSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjM0OiJAdGFpbHdpbmRjc3Mvb3hpZGUtbGludXgtYXJtNjQtZ251IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMy4zIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB0YWlsd2luZGNzc1xveGlkZS1saW51eC1hcm02NC1nbnUiO31zOjM1OiJAdGFpbHdpbmRjc3Mvb3hpZGUtbGludXgtYXJtNjQtbXVzbCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjM1OiJAdGFpbHdpbmRjc3Mvb3hpZGUtbGludXgtYXJtNjQtbXVzbCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI0LjMuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdGFpbHdpbmRjc3Ncb3hpZGUtbGludXgtYXJtNjQtbXVzbCI7fXM6MzI6IkB0YWlsd2luZGNzcy9veGlkZS1saW51eC14NjQtZ251IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzI6IkB0YWlsd2luZGNzcy9veGlkZS1saW51eC14NjQtZ251IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMy4zIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MTtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjY6Il40LjAuMSI7czo3OiIAKgBwYXRoIjtzOjEyMzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB0YWlsd2luZGNzc1xveGlkZS1saW51eC14NjQtZ251Ijt9czozMzoiQHRhaWx3aW5kY3NzL294aWRlLWxpbnV4LXg2NC1tdXNsIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzM6IkB0YWlsd2luZGNzcy9veGlkZS1saW51eC14NjQtbXVzbCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI0LjMuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdGFpbHdpbmRjc3Ncb3hpZGUtbGludXgteDY0LW11c2wiO31zOjMwOiJAdGFpbHdpbmRjc3Mvb3hpZGUtd2FzbTMyLXdhc2kiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMDoiQHRhaWx3aW5kY3NzL294aWRlLXdhc20zMi13YXNpIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMy4zIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB0YWlsd2luZGNzc1xveGlkZS13YXNtMzItd2FzaSI7fXM6MzU6IkB0YWlsd2luZGNzcy9veGlkZS13aW4zMi1hcm02NC1tc3ZjIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzU6IkB0YWlsd2luZGNzcy9veGlkZS13aW4zMi1hcm02NC1tc3ZjIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMy4zIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB0YWlsd2luZGNzc1xveGlkZS13aW4zMi1hcm02NC1tc3ZjIjt9czozMzoiQHRhaWx3aW5kY3NzL294aWRlLXdpbjMyLXg2NC1tc3ZjIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzM6IkB0YWlsd2luZGNzcy9veGlkZS13aW4zMi14NjQtbXN2YyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI0LjMuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdGFpbHdpbmRjc3Ncb3hpZGUtd2luMzIteDY0LW1zdmMiO31zOjE3OiJAdGFpbHdpbmRjc3Mvdml0ZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE3OiJAdGFpbHdpbmRjc3Mvdml0ZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI0LjMuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo3OiJeNC4xLjExIjtzOjc6IgAqAHBhdGgiO3M6MTA4OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHRhaWx3aW5kY3NzXHZpdGUiO31zOjE0OiJAdHlwZXMvZ2Vuc3luYyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE0OiJAdHlwZXMvZ2Vuc3luYyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjAuNSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDU6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdHlwZXNcZ2Vuc3luYyI7fXM6MTI6IkB0eXBlcy9qc2VzYyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEyOiJAdHlwZXMvanNlc2MiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi41LjEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHR5cGVzXGpzZXNjIjt9czoxMToiQHR5cGVzL25vZGUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMToiQHR5cGVzL25vZGUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NzoiMjIuMjAuNSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo4OiJeMjIuMTMuNSI7czo3OiIAKgBwYXRoIjtzOjEwMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB0eXBlc1xub2RlIjt9czoxMjoiQHR5cGVzL3JlYWN0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTI6IkB0eXBlcy9yZWFjdCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxOS4zLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NzoiXjE5LjIuMCI7czo3OiIAKgBwYXRoIjtzOjEwMzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB0eXBlc1xyZWFjdCI7fXM6MTY6IkB0eXBlcy9yZWFjdC1kb20iO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNjoiQHR5cGVzL3JlYWN0LWRvbSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxOS4zLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NzoiXjE5LjIuMCI7czo3OiIAKgBwYXRoIjtzOjEwNzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB0eXBlc1xyZWFjdC1kb20iO31zOjIwOiJAdml0ZWpzL3BsdWdpbi1yZWFjdCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjIwOiJAdml0ZWpzL3BsdWdpbi1yZWFjdCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI2LjEuMiI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo2OiJeNi4xLjEiO3M6NzoiACoAcGF0aCI7czoxMTE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdml0ZWpzXHBsdWdpbi1yZWFjdCI7fXM6MzY6IkB2b2lkemVyby1kZXYvdml0ZS1wbHVzLWRhcndpbi1hcm02NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjM2OiJAdm9pZHplcm8tZGV2L3ZpdGUtcGx1cy1kYXJ3aW4tYXJtNjQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMS40LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTI3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHZvaWR6ZXJvLWRldlx2aXRlLXBsdXMtZGFyd2luLWFybTY0Ijt9czozNDoiQHZvaWR6ZXJvLWRldi92aXRlLXBsdXMtZGFyd2luLXg2NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjM0OiJAdm9pZHplcm8tZGV2L3ZpdGUtcGx1cy1kYXJ3aW4teDY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuNC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB2b2lkemVyby1kZXZcdml0ZS1wbHVzLWRhcndpbi14NjQiO31zOjM5OiJAdm9pZHplcm8tZGV2L3ZpdGUtcGx1cy1saW51eC1hcm02NC1nbnUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozOToiQHZvaWR6ZXJvLWRldi92aXRlLXBsdXMtbGludXgtYXJtNjQtZ251IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuNC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEzMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB2b2lkemVyby1kZXZcdml0ZS1wbHVzLWxpbnV4LWFybTY0LWdudSI7fXM6NDA6IkB2b2lkemVyby1kZXYvdml0ZS1wbHVzLWxpbnV4LWFybTY0LW11c2wiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo0MDoiQHZvaWR6ZXJvLWRldi92aXRlLXBsdXMtbGludXgtYXJtNjQtbXVzbCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjQuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMzE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdm9pZHplcm8tZGV2XHZpdGUtcGx1cy1saW51eC1hcm02NC1tdXNsIjt9czozNzoiQHZvaWR6ZXJvLWRldi92aXRlLXBsdXMtbGludXgteDY0LWdudSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjM3OiJAdm9pZHplcm8tZGV2L3ZpdGUtcGx1cy1saW51eC14NjQtZ251IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuNC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB2b2lkemVyby1kZXZcdml0ZS1wbHVzLWxpbnV4LXg2NC1nbnUiO31zOjM4OiJAdm9pZHplcm8tZGV2L3ZpdGUtcGx1cy1saW51eC14NjQtbXVzbCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjM4OiJAdm9pZHplcm8tZGV2L3ZpdGUtcGx1cy1saW51eC14NjQtbXVzbCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjQuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjk6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdm9pZHplcm8tZGV2XHZpdGUtcGx1cy1saW51eC14NjQtbXVzbCI7fXM6NDA6IkB2b2lkemVyby1kZXYvdml0ZS1wbHVzLXdpbjMyLWFybTY0LW1zdmMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo0MDoiQHZvaWR6ZXJvLWRldi92aXRlLXBsdXMtd2luMzItYXJtNjQtbXN2YyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjQuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMzE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdm9pZHplcm8tZGV2XHZpdGUtcGx1cy13aW4zMi1hcm02NC1tc3ZjIjt9czozODoiQHZvaWR6ZXJvLWRldi92aXRlLXBsdXMtd2luMzIteDY0LW1zdmMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozODoiQHZvaWR6ZXJvLWRldi92aXRlLXBsdXMtd2luMzIteDY0LW1zdmMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMS40LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTI5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHZvaWR6ZXJvLWRldlx2aXRlLXBsdXMtd2luMzIteDY0LW1zdmMiO31zOjMyOiJAeXVrdS1jb3JlL2JpbmRpbmctYW5kcm9pZC1hcm02NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMyOiJAeXVrdS1jb3JlL2JpbmRpbmctYW5kcm9pZC1hcm02NCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjE5LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHl1a3UtY29yZVxiaW5kaW5nLWFuZHJvaWQtYXJtNjQiO31zOjMxOiJAeXVrdS1jb3JlL2JpbmRpbmctZGFyd2luLWFybTY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzE6IkB5dWt1LWNvcmUvYmluZGluZy1kYXJ3aW4tYXJtNjQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC4xOS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB5dWt1LWNvcmVcYmluZGluZy1kYXJ3aW4tYXJtNjQiO31zOjI5OiJAeXVrdS1jb3JlL2JpbmRpbmctZGFyd2luLXg2NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI5OiJAeXVrdS1jb3JlL2JpbmRpbmctZGFyd2luLXg2NCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjE5LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHl1a3UtY29yZVxiaW5kaW5nLWRhcndpbi14NjQiO31zOjMwOiJAeXVrdS1jb3JlL2JpbmRpbmctZnJlZWJzZC14NjQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMDoiQHl1a3UtY29yZS9iaW5kaW5nLWZyZWVic2QteDY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuMTkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAeXVrdS1jb3JlXGJpbmRpbmctZnJlZWJzZC14NjQiO31zOjMyOiJAeXVrdS1jb3JlL2JpbmRpbmctbGludXgtYXJtLWdudSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMyOiJAeXVrdS1jb3JlL2JpbmRpbmctbGludXgtYXJtLWdudSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjE5LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHl1a3UtY29yZVxiaW5kaW5nLWxpbnV4LWFybS1nbnUiO31zOjMzOiJAeXVrdS1jb3JlL2JpbmRpbmctbGludXgtYXJtLW11c2wiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMzoiQHl1a3UtY29yZS9iaW5kaW5nLWxpbnV4LWFybS1tdXNsIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuMTkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAeXVrdS1jb3JlXGJpbmRpbmctbGludXgtYXJtLW11c2wiO31zOjM0OiJAeXVrdS1jb3JlL2JpbmRpbmctbGludXgtYXJtNjQtZ251IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzQ6IkB5dWt1LWNvcmUvYmluZGluZy1saW51eC1hcm02NC1nbnUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC4xOS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB5dWt1LWNvcmVcYmluZGluZy1saW51eC1hcm02NC1nbnUiO31zOjM1OiJAeXVrdS1jb3JlL2JpbmRpbmctbGludXgtYXJtNjQtbXVzbCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjM1OiJAeXVrdS1jb3JlL2JpbmRpbmctbGludXgtYXJtNjQtbXVzbCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjE5LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTI2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHl1a3UtY29yZVxiaW5kaW5nLWxpbnV4LWFybTY0LW11c2wiO31zOjMyOiJAeXVrdS1jb3JlL2JpbmRpbmctbGludXgteDY0LWdudSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMyOiJAeXVrdS1jb3JlL2JpbmRpbmctbGludXgteDY0LWdudSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjE5LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHl1a3UtY29yZVxiaW5kaW5nLWxpbnV4LXg2NC1nbnUiO31zOjMzOiJAeXVrdS1jb3JlL2JpbmRpbmctbGludXgteDY0LW11c2wiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMzoiQHl1a3UtY29yZS9iaW5kaW5nLWxpbnV4LXg2NC1tdXNsIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuMTkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAeXVrdS1jb3JlXGJpbmRpbmctbGludXgteDY0LW11c2wiO31zOjMwOiJAeXVrdS1jb3JlL2JpbmRpbmctd2luMzItYXJtNjQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMDoiQHl1a3UtY29yZS9iaW5kaW5nLXdpbjMyLWFybTY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuMTkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAeXVrdS1jb3JlXGJpbmRpbmctd2luMzItYXJtNjQiO31zOjI4OiJAeXVrdS1jb3JlL2JpbmRpbmctd2luMzIteDY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjg6IkB5dWt1LWNvcmUvYmluZGluZy13aW4zMi14NjQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC4xOS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExOToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB5dWt1LWNvcmVcYmluZGluZy13aW4zMi14NjQiO31zOjIxOiJAeXVrdS10b29sY2hhaW4vdHlwZXMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMToiQHl1a3UtdG9vbGNoYWluL3R5cGVzIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuMTkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTI6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAeXVrdS10b29sY2hhaW5cdHlwZXMiO31zOjEyOiJhbnNpLWVzY2FwZXMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMjoiYW5zaS1lc2NhcGVzIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjcuMy4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGFuc2ktZXNjYXBlcyI7fXM6MTA6ImFuc2ktcmVnZXgiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMDoiYW5zaS1yZWdleCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI2LjQuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xhbnNpLXJlZ2V4Ijt9czoxMToiYW5zaS1zdHlsZXMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMToiYW5zaS1zdHlsZXMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNy4wLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcYW5zaS1zdHlsZXMiO31zOjk6ImF1dG8tYmluZCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjk6ImF1dG8tYmluZCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI1LjAuMSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xhdXRvLWJpbmQiO31zOjI3OiJiYWJlbC1wbHVnaW4tcmVhY3QtY29tcGlsZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNzoiYmFiZWwtcGx1Z2luLXJlYWN0LWNvbXBpbGVyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MTtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjY6Il4xLjAuMCI7czo3OiIAKgBwYXRoIjtzOjExODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGJhYmVsLXBsdWdpbi1yZWFjdC1jb21waWxlciI7fXM6MjQ6ImJhc2VsaW5lLWJyb3dzZXItbWFwcGluZyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI0OiJiYXNlbGluZS1icm93c2VyLW1hcHBpbmciO3M6MTA6IgAqAHZlcnNpb24iO3M6NzoiMi4xMS4zMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTU6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xiYXNlbGluZS1icm93c2VyLW1hcHBpbmciO31zOjEyOiJicm93c2Vyc2xpc3QiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMjoiYnJvd3NlcnNsaXN0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjQuMjkuNCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDM6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xicm93c2Vyc2xpc3QiO31zOjEyOiJjYW5pdXNlLWxpdGUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMjoiY2FuaXVzZS1saXRlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjEyOiIxLjAuMzAwMDE4MTkiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcY2FuaXVzZS1saXRlIjt9czo1OiJjaGFsayI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjU6ImNoYWxrIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjUuNi4yIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcY2hhbGsiO31zOjk6ImNsaS1ib3hlcyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjk6ImNsaS1ib3hlcyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI0LjAuMSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xjbGktYm94ZXMiO31zOjEwOiJjbGktY3Vyc29yIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTA6ImNsaS1jdXJzb3IiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNC4wLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAxOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcY2xpLWN1cnNvciI7fXM6MTI6ImNsaS10cnVuY2F0ZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEyOiJjbGktdHJ1bmNhdGUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNi4xLjEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcY2xpLXRydW5jYXRlIjt9czo1OiJjbGl1aSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjU6ImNsaXVpIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjkuMC4xIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcY2xpdWkiO31zOjQ6ImNsc3giO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo0OiJjbHN4IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMS4xIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MTtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjY6Il4yLjEuMSI7czo3OiIAKgBwYXRoIjtzOjk1OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcY2xzeCI7fXM6MTI6ImNvZGUtZXhjZXJwdCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEyOiJjb2RlLWV4Y2VycHQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNC4wLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcY29kZS1leGNlcnB0Ijt9czo5OiJjb21tYW5kZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo5OiJjb21tYW5kZXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMTUuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGNvbW1hbmRlciI7fXM6MTI6ImNvbmN1cnJlbnRseSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEyOiJjb25jdXJyZW50bHkiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMTAuMC42IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MTtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjc6Il4xMC4wLjMiO3M6NzoiACoAcGF0aCI7czoxMDM6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xjb25jdXJyZW50bHkiO31zOjE4OiJjb252ZXJ0LXNvdXJjZS1tYXAiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxODoiY29udmVydC1zb3VyY2UtbWFwIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwOToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGNvbnZlcnQtc291cmNlLW1hcCI7fXM6MTc6ImNvbnZlcnQtdG8tc3BhY2VzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTc6ImNvbnZlcnQtdG8tc3BhY2VzIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMC4xIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGNvbnZlcnQtdG8tc3BhY2VzIjt9czo3OiJjc3N0eXBlIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6NzoiY3NzdHlwZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIzLjIuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5ODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGNzc3R5cGUiO31zOjExOiJkZXRlY3QtbGliYyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjExOiJkZXRlY3QtbGliYyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjEuMiI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDI6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xkZXRlY3QtbGliYyI7fXM6MjA6ImVsZWN0cm9uLXRvLWNocm9taXVtIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjA6ImVsZWN0cm9uLXRvLWNocm9taXVtIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjc6IjEuNS40NjQiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTExOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcZWxlY3Ryb24tdG8tY2hyb21pdW0iO31zOjExOiJlbW9qaS1yZWdleCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjExOiJlbW9qaS1yZWdleCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxMC42LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcZW1vamktcmVnZXgiO31zOjg6ImVtcGF0aGljIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6ODoiZW1wYXRoaWMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi4xLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTk6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xlbXBhdGhpYyI7fXM6MTY6ImVuaGFuY2VkLXJlc29sdmUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNjoiZW5oYW5jZWQtcmVzb2x2ZSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiI1LjI2LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcZW5oYW5jZWQtcmVzb2x2ZSI7fXM6MTE6ImVudmlyb25tZW50IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTE6ImVudmlyb25tZW50IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGVudmlyb25tZW50Ijt9czoxMDoiZXMtdG9vbGtpdCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEwOiJlcy10b29sa2l0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuNTMuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xlcy10b29sa2l0Ijt9czo4OiJlc2NhbGFkZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjg6ImVzY2FsYWRlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuMi4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcZXNjYWxhZGUiO31zOjIwOiJlc2NhcGUtc3RyaW5nLXJlZ2V4cCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjIwOiJlc2NhcGUtc3RyaW5nLXJlZ2V4cCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjAuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xlc2NhcGUtc3RyaW5nLXJlZ2V4cCI7fXM6NDoiZmRpciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjQ6ImZkaXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNi41LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTU6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xmZGlyIjt9czo0OiJmbHJ1IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6NDoiZmxydSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjAuMiI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGZscnUiO31zOjg6ImZzZXZlbnRzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6ODoiZnNldmVudHMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi4zLjMiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTk6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xmc2V2ZW50cyI7fXM6NzoiZ2Vuc3luYyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjc6ImdlbnN5bmMiO3M6MTA6IgAqAHZlcnNpb24iO3M6MTI6IjEuMC4wLWJldGEuMiI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5ODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGdlbnN5bmMiO31zOjE1OiJnZXQtY2FsbGVyLWZpbGUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNToiZ2V0LWNhbGxlci1maWxlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMC41IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGdldC1jYWxsZXItZmlsZSI7fXM6MjA6ImdldC1lYXN0LWFzaWFuLXdpZHRoIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjA6ImdldC1lYXN0LWFzaWFuLXdpZHRoIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuNy4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGdldC1lYXN0LWFzaWFuLXdpZHRoIjt9czoxMToiZ3JhY2VmdWwtZnMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMToiZ3JhY2VmdWwtZnMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiNC4yLjExIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGdyYWNlZnVsLWZzIjt9czoxOToiaW1wb3J0LW1ldGEtcmVzb2x2ZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE5OiJpbXBvcnQtbWV0YS1yZXNvbHZlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMi4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGltcG9ydC1tZXRhLXJlc29sdmUiO31zOjEzOiJpbmRlbnQtc3RyaW5nIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTM6ImluZGVudC1zdHJpbmciO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNS4wLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA0OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcaW5kZW50LXN0cmluZyI7fXM6MzoiaW5rIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzoiaW5rIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjcuMS4xIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk0OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcaW5rIjt9czoyMzoiaXMtZnVsbHdpZHRoLWNvZGUtcG9pbnQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMzoiaXMtZnVsbHdpZHRoLWNvZGUtcG9pbnQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNS4xLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE0OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcaXMtZnVsbHdpZHRoLWNvZGUtcG9pbnQiO31zOjg6ImlzLWluLWNpIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6ODoiaXMtaW4tY2kiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi4wLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTk6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xpcy1pbi1jaSI7fXM6NDoiaml0aSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjQ6ImppdGkiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi43LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTU6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xqaXRpIjt9czo5OiJqcy10b2tlbnMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo5OiJqcy10b2tlbnMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMTAuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGpzLXRva2VucyI7fXM6NToianNlc2MiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo1OiJqc2VzYyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIzLjEuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGpzZXNjIjt9czo1OiJqc29uNSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjU6Impzb241IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMi4zIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcanNvbjUiO31zOjIwOiJsYXJhdmVsLXByZWNvZ25pdGlvbiI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjIwOiJsYXJhdmVsLXByZWNvZ25pdGlvbiI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjEuMSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xsYXJhdmVsLXByZWNvZ25pdGlvbiI7fXM6MTk6ImxhcmF2ZWwtdml0ZS1wbHVnaW4iO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxOToibGFyYXZlbC12aXRlLXBsdWdpbiI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIzLjIuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo0OiJeMy4xIjtzOjc6IgAqAHBhdGgiO3M6MTEwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcbGFyYXZlbC12aXRlLXBsdWdpbiI7fXM6MTI6ImxpZ2h0bmluZ2NzcyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEyOiJsaWdodG5pbmdjc3MiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS4zMi4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGxpZ2h0bmluZ2NzcyI7fXM6MjY6ImxpZ2h0bmluZ2Nzcy1hbmRyb2lkLWFybTY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjY6ImxpZ2h0bmluZ2Nzcy1hbmRyb2lkLWFybTY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMzIuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xsaWdodG5pbmdjc3MtYW5kcm9pZC1hcm02NCI7fXM6MjU6ImxpZ2h0bmluZ2Nzcy1kYXJ3aW4tYXJtNjQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNToibGlnaHRuaW5nY3NzLWRhcndpbi1hcm02NCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjMyLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcbGlnaHRuaW5nY3NzLWRhcndpbi1hcm02NCI7fXM6MjM6ImxpZ2h0bmluZ2Nzcy1kYXJ3aW4teDY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjM6ImxpZ2h0bmluZ2Nzcy1kYXJ3aW4teDY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMzIuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xsaWdodG5pbmdjc3MtZGFyd2luLXg2NCI7fXM6MjQ6ImxpZ2h0bmluZ2Nzcy1mcmVlYnNkLXg2NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI0OiJsaWdodG5pbmdjc3MtZnJlZWJzZC14NjQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS4zMi4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGxpZ2h0bmluZ2Nzcy1mcmVlYnNkLXg2NCI7fXM6MzI6ImxpZ2h0bmluZ2Nzcy1saW51eC1hcm0tZ251ZWFiaWhmIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzI6ImxpZ2h0bmluZ2Nzcy1saW51eC1hcm0tZ251ZWFiaWhmIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMzIuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjM6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xsaWdodG5pbmdjc3MtbGludXgtYXJtLWdudWVhYmloZiI7fXM6Mjg6ImxpZ2h0bmluZ2Nzcy1saW51eC1hcm02NC1nbnUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyODoibGlnaHRuaW5nY3NzLWxpbnV4LWFybTY0LWdudSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjMyLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcbGlnaHRuaW5nY3NzLWxpbnV4LWFybTY0LWdudSI7fXM6Mjk6ImxpZ2h0bmluZ2Nzcy1saW51eC1hcm02NC1tdXNsIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjk6ImxpZ2h0bmluZ2Nzcy1saW51eC1hcm02NC1tdXNsIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMzIuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xsaWdodG5pbmdjc3MtbGludXgtYXJtNjQtbXVzbCI7fXM6MjY6ImxpZ2h0bmluZ2Nzcy1saW51eC14NjQtZ251IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjY6ImxpZ2h0bmluZ2Nzcy1saW51eC14NjQtZ251IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMzMuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo3OiJeMS4yOS4xIjtzOjc6IgAqAHBhdGgiO3M6MTE3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcbGlnaHRuaW5nY3NzLWxpbnV4LXg2NC1nbnUiO31zOjI3OiJsaWdodG5pbmdjc3MtbGludXgteDY0LW11c2wiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNzoibGlnaHRuaW5nY3NzLWxpbnV4LXg2NC1tdXNsIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMzIuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTg6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xsaWdodG5pbmdjc3MtbGludXgteDY0LW11c2wiO31zOjI5OiJsaWdodG5pbmdjc3Mtd2luMzItYXJtNjQtbXN2YyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI5OiJsaWdodG5pbmdjc3Mtd2luMzItYXJtNjQtbXN2YyI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjMyLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcbGlnaHRuaW5nY3NzLXdpbjMyLWFybTY0LW1zdmMiO31zOjI3OiJsaWdodG5pbmdjc3Mtd2luMzIteDY0LW1zdmMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNzoibGlnaHRuaW5nY3NzLXdpbjMyLXg2NC1tc3ZjIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMzIuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTg6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xsaWdodG5pbmdjc3Mtd2luMzIteDY0LW1zdmMiO31zOjEyOiJtYWdpYy1zdHJpbmciO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMjoibWFnaWMtc3RyaW5nIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjc6IjAuMzAuMjEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcbWFnaWMtc3RyaW5nIjt9czo4OiJtaW1pYy1mbiI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjg6Im1pbWljLWZuIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcbWltaWMtZm4iO31zOjY6Im5hbm9pZCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjY6Im5hbm9pZCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIzLjMuMjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xuYW5vaWQiO31zOjEzOiJub2RlLXJlbGVhc2VzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTM6Im5vZGUtcmVsZWFzZXMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMi4wLjYwIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXG5vZGUtcmVsZWFzZXMiO31zOjQ6Im9idWciO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo0OiJvYnVnIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk1OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcb2J1ZyI7fXM6Nzoib25ldGltZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjc6Im9uZXRpbWUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNS4xLjIiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTg6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xvbmV0aW1lIjt9czoxMzoicGF0Y2gtY29uc29sZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEzOiJwYXRjaC1jb25zb2xlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHBhdGNoLWNvbnNvbGUiO31zOjEwOiJwaWNvY29sb3JzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTA6InBpY29jb2xvcnMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMS4xLjEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAxOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNccGljb2NvbG9ycyI7fXM6OToicGljb21hdGNoIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6OToicGljb21hdGNoIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMC43IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHBpY29tYXRjaCI7fXM6NzoicG9zdGNzcyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjc6InBvc3Rjc3MiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiOC41LjMxIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk4OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNccG9zdGNzcyI7fXM6NToicmVhY3QiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo1OiJyZWFjdCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxOS4zLjEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NzoiXjE5LjIuMCI7czo3OiIAKgBwYXRoIjtzOjk2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNccmVhY3QiO31zOjk6InJlYWN0LWRvbSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjk6InJlYWN0LWRvbSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxOS4zLjEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6NzoiXjE5LjIuMCI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHJlYWN0LWRvbSI7fXM6MTY6InJlYWN0LXJlY29uY2lsZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNjoicmVhY3QtcmVjb25jaWxlciI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjMzLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNccmVhY3QtcmVjb25jaWxlciI7fXM6MTQ6InJlc3RvcmUtY3Vyc29yIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTQ6InJlc3RvcmUtY3Vyc29yIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHJlc3RvcmUtY3Vyc29yIjt9czo4OiJyb2xsZG93biI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjg6InJvbGxkb3duIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuMi4xNSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5OToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHJvbGxkb3duIjt9czo0OiJyeGpzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6NDoicnhqcyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI3LjguMiI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHJ4anMiO31zOjk6InNjaGVkdWxlciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjk6InNjaGVkdWxlciI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjI3LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcc2NoZWR1bGVyIjt9czoxMToic2hlbGwtcXVvdGUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMToic2hlbGwtcXVvdGUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS4xMi4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHNoZWxsLXF1b3RlIjt9czoxMToic2lnbmFsLWV4aXQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMToic2lnbmFsLWV4aXQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMy4wLjciO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcc2lnbmFsLWV4aXQiO31zOjEwOiJzbGljZS1hbnNpIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTA6InNsaWNlLWFuc2kiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiOS4wLjEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAxOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcc2xpY2UtYW5zaSI7fXM6MTM6InNvdXJjZS1tYXAtanMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMzoic291cmNlLW1hcC1qcyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjIuMiI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xzb3VyY2UtbWFwLWpzIjt9czoxMToic3RhY2stdXRpbHMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMToic3RhY2stdXRpbHMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi4wLjYiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcc3RhY2stdXRpbHMiO31zOjEyOiJzdHJpbmctd2lkdGgiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMjoic3RyaW5nLXdpZHRoIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjguMy4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHN0cmluZy13aWR0aCI7fXM6MTA6InN0cmlwLWFuc2kiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMDoic3RyaXAtYW5zaSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI3LjIuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xzdHJpcC1hbnNpIjt9czoxNDoic3VwcG9ydHMtY29sb3IiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNDoic3VwcG9ydHMtY29sb3IiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMTAuMi4yIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHN1cHBvcnRzLWNvbG9yIjt9czoxMDoidGFnZ2VkLXRhZyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEwOiJ0YWdnZWQtdGFnIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHRhZ2dlZC10YWciO31zOjE0OiJ0YWlsd2luZC1tZXJnZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE0OiJ0YWlsd2luZC1tZXJnZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIzLjcuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo2OiJeMy4wLjEiO3M6NzoiACoAcGF0aCI7czoxMDU6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1x0YWlsd2luZC1tZXJnZSI7fXM6MTE6InRhaWx3aW5kY3NzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTE6InRhaWx3aW5kY3NzIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjQuMy4zIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MTtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjY6Il40LjAuMCI7czo3OiIAKgBwYXRoIjtzOjEwMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHRhaWx3aW5kY3NzIjt9czo3OiJ0YXBhYmxlIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6NzoidGFwYWJsZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjMuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5ODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHRhcGFibGUiO31zOjEzOiJ0ZXJtaW5hbC1zaXplIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTM6InRlcm1pbmFsLXNpemUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNC4wLjEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA0OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcdGVybWluYWwtc2l6ZSI7fXM6MTA6InRpbnlnbG9iYnkiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMDoidGlueWdsb2JieSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjIuMTciO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAxOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcdGlueWdsb2JieSI7fXM6OToidHJlZS1raWxsIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6OToidHJlZS1raWxsIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMi4yIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHRyZWUta2lsbCI7fXM6NToidHNsaWIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo1OiJ0c2xpYiI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjguMSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHRzbGliIjt9czo5OiJ0eXBlLWZlc3QiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo5OiJ0eXBlLWZlc3QiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiNS4xMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHR5cGUtZmVzdCI7fXM6MTA6InR5cGVzY3JpcHQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMDoidHlwZXNjcmlwdCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI1LjkuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo2OiJeNS43LjIiO3M6NzoiACoAcGF0aCI7czoxMDE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1x0eXBlc2NyaXB0Ijt9czoxMjoidW5kaWNpLXR5cGVzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTI6InVuZGljaS10eXBlcyI7czoxMDoiACoAdmVyc2lvbiI7czo2OiI2LjIxLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcdW5kaWNpLXR5cGVzIjt9czoyMjoidXBkYXRlLWJyb3dzZXJzbGlzdC1kYiI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjIyOiJ1cGRhdGUtYnJvd3NlcnNsaXN0LWRiIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMy40IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHVwZGF0ZS1icm93c2Vyc2xpc3QtZGIiO31zOjY6InZlcmtpdCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjY6InZlcmtpdCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIwLjUuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHZlcmtpdCI7fXM6NDoidml0ZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjQ6InZpdGUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMS40LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjoxO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6Mzg6Im5wbTpAdm9pZHplcm8tZGV2L3ZpdGUtcGx1cy1jb3JlQDEuNC4wIjtzOjc6IgAqAHBhdGgiO3M6OTU6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1x2aXRlIjt9czoyMzoidml0ZS1wbHVnaW4tZnVsbC1yZWxvYWQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMzoidml0ZS1wbHVnaW4tZnVsbC1yZWxvYWQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMS4yLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE0OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcdml0ZS1wbHVnaW4tZnVsbC1yZWxvYWQiO31zOjExOiJ3aWRlc3QtbGluZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjExOiJ3aWRlc3QtbGluZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI2LjAuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDI6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1x3aWRlc3QtbGluZSI7fXM6OToid3JhcC1hbnNpIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6OToid3JhcC1hbnNpIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEwLjAuMiI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1x3cmFwLWFuc2kiO31zOjI6IndzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjoid3MiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiOC4yMi4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjkzOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcd3MiO31zOjQ6InkxOG4iO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo0OiJ5MThuIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjUuMC44IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk1OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNceTE4biI7fXM6NToieWFyZ3MiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo1OiJ5YXJncyI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxOC4wLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MDtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1x5YXJncyI7fXM6MTI6InlhcmdzLXBhcnNlciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEyOiJ5YXJncy1wYXJzZXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMjIuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHlhcmdzLXBhcnNlciI7fXM6MTE6InlvZ2EtbGF5b3V0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTE6InlvZ2EtbGF5b3V0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuMi4xIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHlvZ2EtbGF5b3V0Ijt9czo5OiJ5dWt1LWNvcmUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo5OiJ5dWt1LWNvcmUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC4xOS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjA7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHl1a3UtY29yZSI7fXM6MTE6Inl1a3UtcGFyc2VyIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTE6Inl1a3UtcGFyc2VyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuMTkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjowO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDI6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1x5dWt1LXBhcnNlciI7fXM6MTU6IkBibGF6ZWRpZmYvY29yZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJAYmxhemVkaWZmL2NvcmUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS4xMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBibGF6ZWRpZmZcY29yZSI7fXM6MzA6IkBsYXJhdmVsL3ZpdGUtcGx1Z2luLXdheWZpbmRlciI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMwOiJAbGFyYXZlbC92aXRlLXBsdWdpbi13YXlmaW5kZXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC4xLjExIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MTtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjY6Il4wLjEuMyI7czo3OiIAKgBwYXRoIjtzOjEyMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBsYXJhdmVsXHZpdGUtcGx1Z2luLXdheWZpbmRlciI7fXM6MzE6IkBveGZtdC9iaW5kaW5nLWFuZHJvaWQtYXJtLWVhYmkiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMToiQG94Zm10L2JpbmRpbmctYW5kcm9pZC1hcm0tZWFiaSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjc0LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94Zm10XGJpbmRpbmctYW5kcm9pZC1hcm0tZWFiaSI7fXM6Mjg6IkBveGZtdC9iaW5kaW5nLWFuZHJvaWQtYXJtNjQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyODoiQG94Zm10L2JpbmRpbmctYW5kcm9pZC1hcm02NCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjc0LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94Zm10XGJpbmRpbmctYW5kcm9pZC1hcm02NCI7fXM6Mjc6IkBveGZtdC9iaW5kaW5nLWRhcndpbi1hcm02NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI3OiJAb3hmbXQvYmluZGluZy1kYXJ3aW4tYXJtNjQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC43NC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGZtdFxiaW5kaW5nLWRhcndpbi1hcm02NCI7fXM6MjU6IkBveGZtdC9iaW5kaW5nLWRhcndpbi14NjQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyNToiQG94Zm10L2JpbmRpbmctZGFyd2luLXg2NCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjc0LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94Zm10XGJpbmRpbmctZGFyd2luLXg2NCI7fXM6MjY6IkBveGZtdC9iaW5kaW5nLWZyZWVic2QteDY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjY6IkBveGZtdC9iaW5kaW5nLWZyZWVic2QteDY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuNzQuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hmbXRcYmluZGluZy1mcmVlYnNkLXg2NCI7fXM6MzQ6IkBveGZtdC9iaW5kaW5nLWxpbnV4LWFybS1nbnVlYWJpaGYiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozNDoiQG94Zm10L2JpbmRpbmctbGludXgtYXJtLWdudWVhYmloZiI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjc0LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTI1OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94Zm10XGJpbmRpbmctbGludXgtYXJtLWdudWVhYmloZiI7fXM6MzU6IkBveGZtdC9iaW5kaW5nLWxpbnV4LWFybS1tdXNsZWFiaWhmIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzU6IkBveGZtdC9iaW5kaW5nLWxpbnV4LWFybS1tdXNsZWFiaWhmIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuNzQuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hmbXRcYmluZGluZy1saW51eC1hcm0tbXVzbGVhYmloZiI7fXM6MzA6IkBveGZtdC9iaW5kaW5nLWxpbnV4LWFybTY0LWdudSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMwOiJAb3hmbXQvYmluZGluZy1saW51eC1hcm02NC1nbnUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC43NC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGZtdFxiaW5kaW5nLWxpbnV4LWFybTY0LWdudSI7fXM6MzE6IkBveGZtdC9iaW5kaW5nLWxpbnV4LWFybTY0LW11c2wiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMToiQG94Zm10L2JpbmRpbmctbGludXgtYXJtNjQtbXVzbCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjc0LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94Zm10XGJpbmRpbmctbGludXgtYXJtNjQtbXVzbCI7fXM6MzA6IkBveGZtdC9iaW5kaW5nLWxpbnV4LXBwYzY0LWdudSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMwOiJAb3hmbXQvYmluZGluZy1saW51eC1wcGM2NC1nbnUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC43NC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGZtdFxiaW5kaW5nLWxpbnV4LXBwYzY0LWdudSI7fXM6MzI6IkBveGZtdC9iaW5kaW5nLWxpbnV4LXJpc2N2NjQtZ251IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzI6IkBveGZtdC9iaW5kaW5nLWxpbnV4LXJpc2N2NjQtZ251IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuNzQuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjM6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hmbXRcYmluZGluZy1saW51eC1yaXNjdjY0LWdudSI7fXM6MzM6IkBveGZtdC9iaW5kaW5nLWxpbnV4LXJpc2N2NjQtbXVzbCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMzOiJAb3hmbXQvYmluZGluZy1saW51eC1yaXNjdjY0LW11c2wiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC43NC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyNDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGZtdFxiaW5kaW5nLWxpbnV4LXJpc2N2NjQtbXVzbCI7fXM6MzA6IkBveGZtdC9iaW5kaW5nLWxpbnV4LXMzOTB4LWdudSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMwOiJAb3hmbXQvYmluZGluZy1saW51eC1zMzkweC1nbnUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC43NC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGZtdFxiaW5kaW5nLWxpbnV4LXMzOTB4LWdudSI7fXM6Mjg6IkBveGZtdC9iaW5kaW5nLWxpbnV4LXg2NC1nbnUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyODoiQG94Zm10L2JpbmRpbmctbGludXgteDY0LWdudSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjc0LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94Zm10XGJpbmRpbmctbGludXgteDY0LWdudSI7fXM6Mjk6IkBveGZtdC9iaW5kaW5nLWxpbnV4LXg2NC1tdXNsIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjk6IkBveGZtdC9iaW5kaW5nLWxpbnV4LXg2NC1tdXNsIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuNzQuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hmbXRcYmluZGluZy1saW51eC14NjQtbXVzbCI7fXM6MzI6IkBveGZtdC9iaW5kaW5nLW9wZW5oYXJtb255LWFybTY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzI6IkBveGZtdC9iaW5kaW5nLW9wZW5oYXJtb255LWFybTY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuNzQuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjM6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hmbXRcYmluZGluZy1vcGVuaGFybW9ueS1hcm02NCI7fXM6MzE6IkBveGZtdC9iaW5kaW5nLXdpbjMyLWFybTY0LW1zdmMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMToiQG94Zm10L2JpbmRpbmctd2luMzItYXJtNjQtbXN2YyI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIwLjc0LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94Zm10XGJpbmRpbmctd2luMzItYXJtNjQtbXN2YyI7fXM6MzA6IkBveGZtdC9iaW5kaW5nLXdpbjMyLWlhMzItbXN2YyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMwOiJAb3hmbXQvYmluZGluZy13aW4zMi1pYTMyLW1zdmMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC43NC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGZtdFxiaW5kaW5nLXdpbjMyLWlhMzItbXN2YyI7fXM6Mjk6IkBveGZtdC9iaW5kaW5nLXdpbjMyLXg2NC1tc3ZjIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjk6IkBveGZtdC9iaW5kaW5nLXdpbjMyLXg2NC1tc3ZjIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuNzQuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hmbXRcYmluZGluZy13aW4zMi14NjQtbXN2YyI7fXM6Mjk6IkBveGxpbnQtdHNnb2xpbnQvZGFyd2luLWFybTY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjk6IkBveGxpbnQtdHNnb2xpbnQvZGFyd2luLWFybTY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjg6IjcuMC4yMDA0IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGxpbnQtdHNnb2xpbnRcZGFyd2luLWFybTY0Ijt9czoyNzoiQG94bGludC10c2dvbGludC9kYXJ3aW4teDY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjc6IkBveGxpbnQtdHNnb2xpbnQvZGFyd2luLXg2NCI7czoxMDoiACoAdmVyc2lvbiI7czo4OiI3LjAuMjAwNCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTg6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hsaW50LXRzZ29saW50XGRhcndpbi14NjQiO31zOjI4OiJAb3hsaW50LXRzZ29saW50L2xpbnV4LWFybTY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjg6IkBveGxpbnQtdHNnb2xpbnQvbGludXgtYXJtNjQiO3M6MTA6IgAqAHZlcnNpb24iO3M6ODoiNy4wLjIwMDQiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94bGludC10c2dvbGludFxsaW51eC1hcm02NCI7fXM6MjY6IkBveGxpbnQtdHNnb2xpbnQvbGludXgteDY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjY6IkBveGxpbnQtdHNnb2xpbnQvbGludXgteDY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjg6IjcuMC4yMDA0IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExNzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGxpbnQtdHNnb2xpbnRcbGludXgteDY0Ijt9czoyODoiQG94bGludC10c2dvbGludC93aW4zMi1hcm02NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI4OiJAb3hsaW50LXRzZ29saW50L3dpbjMyLWFybTY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjg6IjcuMC4yMDA0IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExOToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGxpbnQtdHNnb2xpbnRcd2luMzItYXJtNjQiO31zOjI2OiJAb3hsaW50LXRzZ29saW50L3dpbjMyLXg2NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI2OiJAb3hsaW50LXRzZ29saW50L3dpbjMyLXg2NCI7czoxMDoiACoAdmVyc2lvbiI7czo4OiI3LjAuMjAwNCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hsaW50LXRzZ29saW50XHdpbjMyLXg2NCI7fXM6MzI6IkBveGxpbnQvYmluZGluZy1hbmRyb2lkLWFybS1lYWJpIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzI6IkBveGxpbnQvYmluZGluZy1hbmRyb2lkLWFybS1lYWJpIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuODkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjM6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hsaW50XGJpbmRpbmctYW5kcm9pZC1hcm0tZWFiaSI7fXM6Mjk6IkBveGxpbnQvYmluZGluZy1hbmRyb2lkLWFybTY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjk6IkBveGxpbnQvYmluZGluZy1hbmRyb2lkLWFybTY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuODkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hsaW50XGJpbmRpbmctYW5kcm9pZC1hcm02NCI7fXM6Mjg6IkBveGxpbnQvYmluZGluZy1kYXJ3aW4tYXJtNjQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyODoiQG94bGludC9iaW5kaW5nLWRhcndpbi1hcm02NCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjg5LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94bGludFxiaW5kaW5nLWRhcndpbi1hcm02NCI7fXM6MjY6IkBveGxpbnQvYmluZGluZy1kYXJ3aW4teDY0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjY6IkBveGxpbnQvYmluZGluZy1kYXJ3aW4teDY0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuODkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hsaW50XGJpbmRpbmctZGFyd2luLXg2NCI7fXM6Mjc6IkBveGxpbnQvYmluZGluZy1mcmVlYnNkLXg2NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjI3OiJAb3hsaW50L2JpbmRpbmctZnJlZWJzZC14NjQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS44OS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExODoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGxpbnRcYmluZGluZy1mcmVlYnNkLXg2NCI7fXM6MzU6IkBveGxpbnQvYmluZGluZy1saW51eC1hcm0tZ251ZWFiaWhmIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzU6IkBveGxpbnQvYmluZGluZy1saW51eC1hcm0tZ251ZWFiaWhmIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuODkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjY6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hsaW50XGJpbmRpbmctbGludXgtYXJtLWdudWVhYmloZiI7fXM6MzY6IkBveGxpbnQvYmluZGluZy1saW51eC1hcm0tbXVzbGVhYmloZiI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjM2OiJAb3hsaW50L2JpbmRpbmctbGludXgtYXJtLW11c2xlYWJpaGYiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS44OS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyNzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGxpbnRcYmluZGluZy1saW51eC1hcm0tbXVzbGVhYmloZiI7fXM6MzE6IkBveGxpbnQvYmluZGluZy1saW51eC1hcm02NC1nbnUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMToiQG94bGludC9iaW5kaW5nLWxpbnV4LWFybTY0LWdudSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjg5LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94bGludFxiaW5kaW5nLWxpbnV4LWFybTY0LWdudSI7fXM6MzI6IkBveGxpbnQvYmluZGluZy1saW51eC1hcm02NC1tdXNsIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzI6IkBveGxpbnQvYmluZGluZy1saW51eC1hcm02NC1tdXNsIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuODkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjM6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hsaW50XGJpbmRpbmctbGludXgtYXJtNjQtbXVzbCI7fXM6MzE6IkBveGxpbnQvYmluZGluZy1saW51eC1wcGM2NC1nbnUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMToiQG94bGludC9iaW5kaW5nLWxpbnV4LXBwYzY0LWdudSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjg5LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94bGludFxiaW5kaW5nLWxpbnV4LXBwYzY0LWdudSI7fXM6MzM6IkBveGxpbnQvYmluZGluZy1saW51eC1yaXNjdjY0LWdudSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMzOiJAb3hsaW50L2JpbmRpbmctbGludXgtcmlzY3Y2NC1nbnUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS44OS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyNDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGxpbnRcYmluZGluZy1saW51eC1yaXNjdjY0LWdudSI7fXM6MzQ6IkBveGxpbnQvYmluZGluZy1saW51eC1yaXNjdjY0LW11c2wiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozNDoiQG94bGludC9iaW5kaW5nLWxpbnV4LXJpc2N2NjQtbXVzbCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjg5LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTI1OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94bGludFxiaW5kaW5nLWxpbnV4LXJpc2N2NjQtbXVzbCI7fXM6MzE6IkBveGxpbnQvYmluZGluZy1saW51eC1zMzkweC1nbnUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMToiQG94bGludC9iaW5kaW5nLWxpbnV4LXMzOTB4LWdudSI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjg5LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94bGludFxiaW5kaW5nLWxpbnV4LXMzOTB4LWdudSI7fXM6Mjk6IkBveGxpbnQvYmluZGluZy1saW51eC14NjQtZ251IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjk6IkBveGxpbnQvYmluZGluZy1saW51eC14NjQtZ251IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuODkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjA6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hsaW50XGJpbmRpbmctbGludXgteDY0LWdudSI7fXM6MzA6IkBveGxpbnQvYmluZGluZy1saW51eC14NjQtbXVzbCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMwOiJAb3hsaW50L2JpbmRpbmctbGludXgteDY0LW11c2wiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS44OS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGxpbnRcYmluZGluZy1saW51eC14NjQtbXVzbCI7fXM6MzM6IkBveGxpbnQvYmluZGluZy1vcGVuaGFybW9ueS1hcm02NCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMzOiJAb3hsaW50L2JpbmRpbmctb3Blbmhhcm1vbnktYXJtNjQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS44OS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyNDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGxpbnRcYmluZGluZy1vcGVuaGFybW9ueS1hcm02NCI7fXM6MzI6IkBveGxpbnQvYmluZGluZy13aW4zMi1hcm02NC1tc3ZjIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MzI6IkBveGxpbnQvYmluZGluZy13aW4zMi1hcm02NC1tc3ZjIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjEuODkuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMjM6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAb3hsaW50XGJpbmRpbmctd2luMzItYXJtNjQtbXN2YyI7fXM6MzE6IkBveGxpbnQvYmluZGluZy13aW4zMi1pYTMyLW1zdmMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czozMToiQG94bGludC9iaW5kaW5nLXdpbjMyLWlhMzItbXN2YyI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjg5LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTIyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQG94bGludFxiaW5kaW5nLXdpbjMyLWlhMzItbXN2YyI7fXM6MzA6IkBveGxpbnQvYmluZGluZy13aW4zMi14NjQtbXN2YyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjMwOiJAb3hsaW50L2JpbmRpbmctd2luMzIteDY0LW1zdmMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS44OS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEyMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGxpbnRcYmluZGluZy13aW4zMi14NjQtbXN2YyI7fXM6MTU6IkBveGxpbnQvcGx1Z2lucyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJAb3hsaW50L3BsdWdpbnMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMS44OS4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEBveGxpbnRccGx1Z2lucyI7fXM6MTA6IkBwb2xrYS91cmwiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMDoiQHBvbGthL3VybCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjAuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDE6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAcG9sa2FcdXJsIjt9czoyMDoiQHRlc3RpbmctbGlicmFyeS9kb20iO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMDoiQHRlc3RpbmctbGlicmFyeS9kb20iO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMTAuNC4yIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB0ZXN0aW5nLWxpYnJhcnlcZG9tIjt9czoyNzoiQHRlc3RpbmctbGlicmFyeS91c2VyLWV2ZW50IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Mjc6IkB0ZXN0aW5nLWxpYnJhcnkvdXNlci1ldmVudCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxNC42LjgiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTE4OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHRlc3RpbmctbGlicmFyeVx1c2VyLWV2ZW50Ijt9czoxNzoiQHR5cGVzL2FyaWEtcXVlcnkiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNzoiQHR5cGVzL2FyaWEtcXVlcnkiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNS4wLjQiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA4OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHR5cGVzXGFyaWEtcXVlcnkiO31zOjExOiJAdHlwZXMvY2hhaSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjExOiJAdHlwZXMvY2hhaSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI1LjIuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDI6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdHlwZXNcY2hhaSI7fXM6MTU6IkB0eXBlcy9kZWVwLWVxbCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE1OiJAdHlwZXMvZGVlcC1lcWwiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNC4wLjIiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHR5cGVzXGRlZXAtZXFsIjt9czoxMzoiQHR5cGVzL2VzdHJlZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEzOiJAdHlwZXMvZXN0cmVlIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMC45IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB0eXBlc1xlc3RyZWUiO31zOjE1OiJAdml0ZXN0L2Jyb3dzZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNToiQHZpdGVzdC9icm93c2VyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjUuMC41IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB2aXRlc3RcYnJvd3NlciI7fXM6MjM6IkB2aXRlc3QvYnJvd3Nlci1wcmV2aWV3IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MjM6IkB2aXRlc3QvYnJvd3Nlci1wcmV2aWV3IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjUuMC41IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExNDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB2aXRlc3RcYnJvd3Nlci1wcmV2aWV3Ijt9czoxNDoiQHZpdGVzdC9tb2NrZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNDoiQHZpdGVzdC9tb2NrZXIiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNS4wLjUiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTA1OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHZpdGVzdFxtb2NrZXIiO31zOjIxOiJAdml0ZXN0L3ByZXR0eS1mb3JtYXQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMToiQHZpdGVzdC9wcmV0dHktZm9ybWF0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjUuMC41IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXEB2aXRlc3RccHJldHR5LWZvcm1hdCI7fXM6MTY6IkB2aXRlc3Qvc25hcHNob3QiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNjoiQHZpdGVzdC9zbmFwc2hvdCI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI1LjAuNSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdml0ZXN0XHNuYXBzaG90Ijt9czoxMToiQHZpdGVzdC9zcHkiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMToiQHZpdGVzdC9zcHkiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNS4wLjUiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHZpdGVzdFxzcHkiO31zOjEwOiJAdml0ZXN0L3VpIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTA6IkB2aXRlc3QvdWkiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNS4wLjUiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAxOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcQHZpdGVzdFx1aSI7fXM6MTM6IkB2aXRlc3QvdXRpbHMiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMzoiQHZpdGVzdC91dGlscyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiI1LjAuNSI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xAdml0ZXN0XHV0aWxzIjt9czoxMDoiYXJpYS1xdWVyeSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjEwOiJhcmlhLXF1ZXJ5IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjUuMy4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMToiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGFyaWEtcXVlcnkiO31zOjE1OiJhc3NlcnRpb24tZXJyb3IiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNToiYXNzZXJ0aW9uLWVycm9yIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMC4xIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGFzc2VydGlvbi1lcnJvciI7fXM6NDoiY2hhaSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjQ6ImNoYWkiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNi4zLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTU6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xjaGFpIjt9czo2OiJkZXF1YWwiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo2OiJkZXF1YWwiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi4wLjMiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xkZXF1YWwiO31zOjIxOiJkb20tYWNjZXNzaWJpbGl0eS1hcGkiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoyMToiZG9tLWFjY2Vzc2liaWxpdHktYXBpIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjY6IjAuNS4xNiI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMTI6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xkb20tYWNjZXNzaWJpbGl0eS1hcGkiO31zOjE1OiJlcy1tb2R1bGUtbGV4ZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNToiZXMtbW9kdWxlLWxleGVyIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjIuMy4yIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGVzLW1vZHVsZS1sZXhlciI7fXM6MTM6ImVzdHJlZS13YWxrZXIiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMzoiZXN0cmVlLXdhbGtlciI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIzLjAuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czoxMDQ6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xlc3RyZWUtd2Fsa2VyIjt9czoxMToiZXhwZWN0LXR5cGUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxMToiZXhwZWN0LXR5cGUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMS40LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAyOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcZXhwZWN0LXR5cGUiO31zOjY6ImZmbGF0ZSI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjY6ImZmbGF0ZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIwLjguMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NzoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXGZmbGF0ZSI7fXM6NzoiZmxhdHRlZCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjc6ImZsYXR0ZWQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMy40LjQiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTg6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xmbGF0dGVkIjt9czo5OiJsei1zdHJpbmciO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo5OiJsei1zdHJpbmciO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMS41LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcbHotc3RyaW5nIjt9czo2OiJtcm1pbWUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo2OiJtcm1pbWUiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi4wLjEiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xtcm1pbWUiO31zOjU6Im94Zm10IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6NToib3hmbXQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMC43NC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcb3hmbXQiO31zOjY6Im94bGludCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjY6Im94bGludCI7czoxMDoiACoAdmVyc2lvbiI7czo2OiIxLjg5LjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTc6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xveGxpbnQiO31zOjE1OiJveGxpbnQtdHNnb2xpbnQiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czoxNToib3hsaW50LXRzZ29saW50IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjg6IjcuMC4yMDA0IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXG94bGludC10c2dvbGludCI7fXM6NToicGF0aGUiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo1OiJwYXRoZSI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIyLjAuMyI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjA7czoxMzoiACoAY29uc3RyYWludCI7czowOiIiO3M6NzoiACoAcGF0aCI7czo5NjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHBhdGhlIjt9czo1OiJwbmdqcyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjU6InBuZ2pzIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjcuMC4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk2OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNccG5nanMiO31zOjEzOiJwcmV0dHktZm9ybWF0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTM6InByZXR0eS1mb3JtYXQiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMjcuNS4xIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwNDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHByZXR0eS1mb3JtYXQiO31zOjg6InJlYWN0LWlzIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6ODoicmVhY3QtaXMiO3M6MTA6IgAqAHZlcnNpb24iO3M6NjoiMTcuMC4yIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNccmVhY3QtaXMiO31zOjQ6InNpcnYiO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo0OiJzaXJ2IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuMC4yIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk1OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcc2lydiI7fXM6Nzoic3RkLWVudiI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjc6InN0ZC1lbnYiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNC4zLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTg6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1xzdGQtZW52Ijt9czo5OiJ0aW55YmVuY2giO086MjI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2UiOjc6e3M6NzoiACoAbmFtZSI7czo5OiJ0aW55YmVuY2giO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiNi4yLjIiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6MTAwOiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcdGlueWJlbmNoIjt9czo4OiJ0aW55ZXhlYyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjg6InRpbnlleGVjIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjEuMy4xIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcdGlueWV4ZWMiO31zOjg6InRpbnlwb29sIjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6ODoidGlueXBvb2wiO3M6MTA6IgAqAHZlcnNpb24iO3M6NToiMi4yLjAiO3M6OToiACoAc291cmNlIjtyOjEyODI7czo2OiIAKgBkZXYiO2I6MTtzOjk6IgAqAGRpcmVjdCI7YjowO3M6MTM6IgAqAGNvbnN0cmFpbnQiO3M6MDoiIjtzOjc6IgAqAHBhdGgiO3M6OTk6IkM6XHhhbXBwXGh0ZG9jc1xFeGFtZW4yXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXGNpdGFtZWRpY2FjbGluaWNhdmlkYXNhbHVkXG5vZGVfbW9kdWxlc1x0aW55cG9vbCI7fXM6MTE6InRpbnlyYWluYm93IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6MTE6InRpbnlyYWluYm93IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuMi4wIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjEwMjoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHRpbnlyYWluYm93Ijt9czo4OiJ0b3RhbGlzdCI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjg6InRvdGFsaXN0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuMC4xIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk5OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcdG90YWxpc3QiO31zOjk6InZpdGUtcGx1cyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjk6InZpdGUtcGx1cyI7czoxMDoiACoAdmVyc2lvbiI7czo1OiIxLjQuMCI7czo5OiIAKgBzb3VyY2UiO3I6MTI4MjtzOjY6IgAqAGRldiI7YjoxO3M6OToiACoAZGlyZWN0IjtiOjE7czoxMzoiACoAY29uc3RyYWludCI7czo1OiIxLjQuMCI7czo3OiIAKgBwYXRoIjtzOjEwMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHZpdGUtcGx1cyI7fXM6Njoidml0ZXN0IjtPOjIyOiJMYXJhdmVsXFJvc3RlclxQYWNrYWdlIjo3OntzOjc6IgAqAG5hbWUiO3M6Njoidml0ZXN0IjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjUuMC41IjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjk3OiJDOlx4YW1wcFxodGRvY3NcRXhhbWVuMlxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxjaXRhbWVkaWNhY2xpbmljYXZpZGFzYWx1ZFxub2RlX21vZHVsZXNcdml0ZXN0Ijt9czoxOToid2h5LWlzLW5vZGUtcnVubmluZyI7TzoyMjoiTGFyYXZlbFxSb3N0ZXJcUGFja2FnZSI6Nzp7czo3OiIAKgBuYW1lIjtzOjE5OiJ3aHktaXMtbm9kZS1ydW5uaW5nIjtzOjEwOiIAKgB2ZXJzaW9uIjtzOjU6IjMuMi4xIjtzOjk6IgAqAHNvdXJjZSI7cjoxMjgyO3M6NjoiACoAZGV2IjtiOjE7czo5OiIAKgBkaXJlY3QiO2I6MDtzOjEzOiIAKgBjb25zdHJhaW50IjtzOjA6IiI7czo3OiIAKgBwYXRoIjtzOjExMDoiQzpceGFtcHBcaHRkb2NzXEV4YW1lbjJcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcY2l0YW1lZGljYWNsaW5pY2F2aWRhc2FsdWRcbm9kZV9tb2R1bGVzXHdoeS1pcy1ub2RlLXJ1bm5pbmciO319czoxMToiACoAcGFja2FnZXMiO086MzI6IkxhcmF2ZWxcUm9zdGVyXFBhY2thZ2VDb2xsZWN0aW9uIjoyOntzOjg6IgAqAGl0ZW1zIjthOjI4Njp7aTowO3I6MTI3OTtpOjE7cjoxMjg3O2k6MjtyOjEyOTU7aTozO3I6MTMwMztpOjQ7cjoxMzExO2k6NTtyOjEzMTk7aTo2O3I6MTMyNztpOjc7cjoxMzM1O2k6ODtyOjEzNDM7aTo5O3I6MTM1MTtpOjEwO3I6MTM1OTtpOjExO3I6MTM2NztpOjEyO3I6MTM3NTtpOjEzO3I6MTM4MztpOjE0O3I6MTM5MTtpOjE1O3I6MTM5OTtpOjE2O3I6MTQwNztpOjE3O3I6MTQxNTtpOjE4O3I6MTQyMztpOjE5O3I6MTQzMTtpOjIwO3I6MTQzOTtpOjIxO3I6MTQ0NztpOjIyO3I6MTQ1NTtpOjIzO3I6MTQ2MztpOjI0O3I6MTQ3MTtpOjI1O3I6MTQ3OTtpOjI2O3I6MTQ4NztpOjI3O3I6MTQ5NTtpOjI4O3I6MTUwMztpOjI5O3I6MTUxMTtpOjMwO3I6MTUxOTtpOjMxO3I6MTUyNztpOjMyO3I6MTUzNTtpOjMzO3I6MTU0MztpOjM0O3I6MTU1MTtpOjM1O3I6MTU1OTtpOjM2O3I6MTU2NztpOjM3O3I6MTU3NTtpOjM4O3I6MTU4MztpOjM5O3I6MTU5MTtpOjQwO3I6MTU5OTtpOjQxO3I6MTYwNztpOjQyO3I6MTYxNTtpOjQzO3I6MTYyMztpOjQ0O3I6MTYzMTtpOjQ1O3I6MTYzOTtpOjQ2O3I6MTY0NztpOjQ3O3I6MTY1NTtpOjQ4O3I6MTY2MztpOjQ5O3I6MTY3MTtpOjUwO3I6MTY3OTtpOjUxO3I6MTY4NztpOjUyO3I6MTY5NTtpOjUzO3I6MTcwMztpOjU0O3I6MTcxMTtpOjU1O3I6MTcxOTtpOjU2O3I6MTcyNztpOjU3O3I6MTczNTtpOjU4O3I6MTc0MztpOjU5O3I6MTc1MTtpOjYwO3I6MTc1OTtpOjYxO3I6MTc2NztpOjYyO3I6MTc3NTtpOjYzO3I6MTc4MztpOjY0O3I6MTc5MTtpOjY1O3I6MTc5OTtpOjY2O3I6MTgwNztpOjY3O3I6MTgxNTtpOjY4O3I6MTgyMztpOjY5O3I6MTgzMTtpOjcwO3I6MTgzOTtpOjcxO3I6MTg0NztpOjcyO3I6MTg1NTtpOjczO3I6MTg2MztpOjc0O3I6MTg3MTtpOjc1O3I6MTg3OTtpOjc2O3I6MTg4NztpOjc3O3I6MTg5NTtpOjc4O3I6MTkwMztpOjc5O3I6MTkxMTtpOjgwO3I6MTkxOTtpOjgxO3I6MTkyNztpOjgyO3I6MTkzNTtpOjgzO3I6MTk0MztpOjg0O3I6MTk1MTtpOjg1O3I6MTk1OTtpOjg2O3I6MTk2NztpOjg3O3I6MTk3NTtpOjg4O3I6MTk4MztpOjg5O3I6MTk5MTtpOjkwO3I6MTk5OTtpOjkxO3I6MjAwNztpOjkyO3I6MjAxNTtpOjkzO3I6MjAyMztpOjk0O3I6MjAzMTtpOjk1O3I6MjAzOTtpOjk2O3I6MjA0NztpOjk3O3I6MjA1NTtpOjk4O3I6MjA2MztpOjk5O3I6MjA3MTtpOjEwMDtyOjIwNzk7aToxMDE7cjoyMDg3O2k6MTAyO3I6MjA5NTtpOjEwMztyOjIxMDM7aToxMDQ7cjoyMTExO2k6MTA1O3I6MjExOTtpOjEwNjtyOjIxMjc7aToxMDc7cjoyMTM1O2k6MTA4O3I6MjE0MztpOjEwOTtyOjIxNTE7aToxMTA7cjoyMTU5O2k6MTExO3I6MjE2NztpOjExMjtyOjIxNzU7aToxMTM7cjoyMTgzO2k6MTE0O3I6MjE5MTtpOjExNTtyOjIxOTk7aToxMTY7cjoyMjA3O2k6MTE3O3I6MjIxNTtpOjExODtyOjIyMjM7aToxMTk7cjoyMjMxO2k6MTIwO3I6MjIzOTtpOjEyMTtyOjIyNDc7aToxMjI7cjoyMjU1O2k6MTIzO3I6MjI2MztpOjEyNDtyOjIyNzE7aToxMjU7cjoyMjc5O2k6MTI2O3I6MjI4NztpOjEyNztyOjIyOTU7aToxMjg7cjoyMzAzO2k6MTI5O3I6MjMxMTtpOjEzMDtyOjIzMTk7aToxMzE7cjoyMzI3O2k6MTMyO3I6MjMzNTtpOjEzMztyOjIzNDM7aToxMzQ7cjoyMzUxO2k6MTM1O3I6MjM1OTtpOjEzNjtyOjIzNjc7aToxMzc7cjoyMzc1O2k6MTM4O3I6MjM4MztpOjEzOTtyOjIzOTE7aToxNDA7cjoyMzk5O2k6MTQxO3I6MjQwNztpOjE0MjtyOjI0MTU7aToxNDM7cjoyNDIzO2k6MTQ0O3I6MjQzMTtpOjE0NTtyOjI0Mzk7aToxNDY7cjoyNDQ3O2k6MTQ3O3I6MjQ1NTtpOjE0ODtyOjI0NjM7aToxNDk7cjoyNDcxO2k6MTUwO3I6MjQ3OTtpOjE1MTtyOjI0ODc7aToxNTI7cjoyNDk1O2k6MTUzO3I6MjUwMztpOjE1NDtyOjI1MTE7aToxNTU7cjoyNTE5O2k6MTU2O3I6MjUyNztpOjE1NztyOjI1MzU7aToxNTg7cjoyNTQzO2k6MTU5O3I6MjU1MTtpOjE2MDtyOjI1NTk7aToxNjE7cjoyNTY3O2k6MTYyO3I6MjU3NTtpOjE2MztyOjI1ODM7aToxNjQ7cjoyNTkxO2k6MTY1O3I6MjU5OTtpOjE2NjtyOjI2MDc7aToxNjc7cjoyNjE1O2k6MTY4O3I6MjYyMztpOjE2OTtyOjI2MzE7aToxNzA7cjoyNjM5O2k6MTcxO3I6MjY0NztpOjE3MjtyOjI2NTU7aToxNzM7cjoyNjYzO2k6MTc0O3I6MjY3MTtpOjE3NTtyOjI2Nzk7aToxNzY7cjoyNjg3O2k6MTc3O3I6MjY5NTtpOjE3ODtyOjI3MDM7aToxNzk7cjoyNzExO2k6MTgwO3I6MjcxOTtpOjE4MTtyOjI3Mjc7aToxODI7cjoyNzM1O2k6MTgzO3I6Mjc0MztpOjE4NDtyOjI3NTE7aToxODU7cjoyNzU5O2k6MTg2O3I6Mjc2NztpOjE4NztyOjI3NzU7aToxODg7cjoyNzgzO2k6MTg5O3I6Mjc5MTtpOjE5MDtyOjI3OTk7aToxOTE7cjoyODA3O2k6MTkyO3I6MjgxNTtpOjE5MztyOjI4MjM7aToxOTQ7cjoyODMxO2k6MTk1O3I6MjgzOTtpOjE5NjtyOjI4NDc7aToxOTc7cjoyODU1O2k6MTk4O3I6Mjg2MztpOjE5OTtyOjI4NzE7aToyMDA7cjoyODc5O2k6MjAxO3I6Mjg4NztpOjIwMjtyOjI4OTU7aToyMDM7cjoyOTAzO2k6MjA0O3I6MjkxMTtpOjIwNTtyOjI5MTk7aToyMDY7cjoyOTI3O2k6MjA3O3I6MjkzNTtpOjIwODtyOjI5NDM7aToyMDk7cjoyOTUxO2k6MjEwO3I6Mjk1OTtpOjIxMTtyOjI5Njc7aToyMTI7cjoyOTc1O2k6MjEzO3I6Mjk4MztpOjIxNDtyOjI5OTE7aToyMTU7cjoyOTk5O2k6MjE2O3I6MzAwNztpOjIxNztyOjMwMTU7aToyMTg7cjozMDIzO2k6MjE5O3I6MzAzMTtpOjIyMDtyOjMwMzk7aToyMjE7cjozMDQ3O2k6MjIyO3I6MzA1NTtpOjIyMztyOjMwNjM7aToyMjQ7cjozMDcxO2k6MjI1O3I6MzA3OTtpOjIyNjtyOjMwODc7aToyMjc7cjozMDk1O2k6MjI4O3I6MzEwMztpOjIyOTtyOjMxMTE7aToyMzA7cjozMTE5O2k6MjMxO3I6MzEyNztpOjIzMjtyOjMxMzU7aToyMzM7cjozMTQzO2k6MjM0O3I6MzE1MTtpOjIzNTtyOjMxNTk7aToyMzY7cjozMTY3O2k6MjM3O3I6MzE3NTtpOjIzODtyOjMxODM7aToyMzk7cjozMTkxO2k6MjQwO3I6MzE5OTtpOjI0MTtyOjMyMDc7aToyNDI7cjozMjE1O2k6MjQzO3I6MzIyMztpOjI0NDtyOjMyMzE7aToyNDU7cjozMjM5O2k6MjQ2O3I6MzI0NztpOjI0NztyOjMyNTU7aToyNDg7cjozMjYzO2k6MjQ5O3I6MzI3MTtpOjI1MDtyOjMyNzk7aToyNTE7cjozMjg3O2k6MjUyO3I6MzI5NTtpOjI1MztyOjMzMDM7aToyNTQ7cjozMzExO2k6MjU1O3I6MzMxOTtpOjI1NjtyOjMzMjc7aToyNTc7cjozMzM1O2k6MjU4O3I6MzM0MztpOjI1OTtyOjMzNTE7aToyNjA7cjozMzU5O2k6MjYxO3I6MzM2NztpOjI2MjtyOjMzNzU7aToyNjM7cjozMzgzO2k6MjY0O3I6MzM5MTtpOjI2NTtyOjMzOTk7aToyNjY7cjozNDA3O2k6MjY3O3I6MzQxNTtpOjI2ODtyOjM0MjM7aToyNjk7cjozNDMxO2k6MjcwO3I6MzQzOTtpOjI3MTtyOjM0NDc7aToyNzI7cjozNDU1O2k6MjczO3I6MzQ2MztpOjI3NDtyOjM0NzE7aToyNzU7cjozNDc5O2k6Mjc2O3I6MzQ4NztpOjI3NztyOjM0OTU7aToyNzg7cjozNTAzO2k6Mjc5O3I6MzUxMTtpOjI4MDtyOjM1MTk7aToyODE7cjozNTI3O2k6MjgyO3I6MzUzNTtpOjI4MztyOjM1NDM7aToyODQ7cjozNTUxO2k6Mjg1O3I6MzU1OTt9czoyODoiACoAZXNjYXBlV2hlbkNhc3RpbmdUb1N0cmluZyI7YjowO31zOjE3OiIAKgBwYWNrYWdlTWFuYWdlciI7RTo0MToiTGFyYXZlbFxSb3N0ZXJcRW51bXNcSnNQYWNrYWdlTWFuYWdlcjpOcG0iO31zOjY6InN0YWNrcyI7TzozMDoiTGFyYXZlbFxSb3N0ZXJcU3VwcG9ydFxFbnVtU2V0IjoxOntzOjg6IgAqAGNhc2VzIjthOjE6e2k6MDtFOjM5OiJMYXJhdmVsXFJvc3RlclxFbnVtc1xTdGFjazpJbmVydGlhUmVhY3QiO319czoyMToiYnJvd3NlclRlc3RGcmFtZXdvcmtzIjtPOjMwOiJMYXJhdmVsXFJvc3RlclxTdXBwb3J0XEVudW1TZXQiOjE6e3M6ODoiACoAY2FzZXMiO2E6MDp7fX1zOjk6ImZyb250ZW5kcyI7TzozMDoiTGFyYXZlbFxSb3N0ZXJcU3VwcG9ydFxFbnVtU2V0IjoxOntzOjg6IgAqAGNhc2VzIjthOjE6e2k6MDtFOjM1OiJMYXJhdmVsXFJvc3RlclxFbnVtc1xGcm9udGVuZDpSZWFjdCI7fX1zOjY6ImFnZW50cyI7TzozMDoiTGFyYXZlbFxSb3N0ZXJcU3VwcG9ydFxFbnVtU2V0IjoxOntzOjg6IgAqAGNhc2VzIjthOjE6e2k6MDtFOjMyOiJMYXJhdmVsXFJvc3RlclxFbnVtc1xBZ2VudDpDb2RleCI7fX1zOjc6ImVkaXRvcnMiO086MzA6IkxhcmF2ZWxcUm9zdGVyXFN1cHBvcnRcRW51bVNldCI6MTp7czo4OiIAKgBjYXNlcyI7YTowOnt9fX0=	1794023453
\.


--
-- Data for Name: cache_locks; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.cache_locks (key, owner, expiration) FROM stdin;
\.


--
-- Data for Name: cita; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.cita (id_cita, codigo, id_paciente, id_medico, id_especialidad, id_usuario_registro, id_cita_origen, fecha, hora_inicio, hora_fin, motivo_consulta, estado, motivo_cancelacion, observacion_atencion, fecha_hora_atencion, fecha_creacion, origen, expira_en) FROM stdin;
1	CM-0001	72	11	5	2	\N	2026-08-25	15:30:00	16:00:00	Palpitaciones	CANCELADA	El paciente avisó que viaja fuera de la ciudad	\N	\N	2026-08-13 08:00:00+00	WEB	\N
2	CM-0002	58	8	1	5	\N	2026-08-25	09:00:00	09:30:00	Control de presión arterial	ATENDIDA	\N	Paciente estable, se solicitan análisis de laboratorio	2026-08-25 13:16:00+00	2026-08-14 10:50:00+00	WEB	\N
3	CM-0003	45	11	1	2	\N	2026-08-27	15:00:00	15:30:00	Control de presión arterial	ATENDIDA	\N	Se deriva a especialista para valoración	2026-08-27 19:15:00+00	2026-08-15 09:50:00+00	WEB	\N
5	CM-0005	16	7	2	5	\N	2026-08-25	11:30:00	12:00:00	Control pediátrico	CONFIRMADA	\N	\N	\N	2026-08-16 13:00:00+00	WEB	\N
6	CM-0006	17	7	2	5	\N	2026-08-25	16:30:00	17:00:00	Fiebre y dolor de garganta	CONFIRMADA	\N	\N	\N	2026-08-16 14:00:00+00	WEB	\N
200	CM-0200	20	6	1	2	\N	2026-10-25	08:30:00	09:00:00	Chequeo médico general	CONFIRMADA	\N	\N	\N	2026-10-20 14:00:00+00	WEB	\N
217	CM-0217	45	6	1	2	\N	2026-10-26	09:00:00	09:30:00	Consulta de seguimiento	CANCELADA	El paciente avisó que viajará	\N	\N	2026-10-21 15:00:00+00	WEB	\N
\.


--
-- Data for Name: comprobante_pago; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.comprobante_pago (id_comprobante, id_pago, numero, fecha_emision, monto_total, ruta_archivo) FROM stdin;
1	1	FAC-2026-00001	2026-11-02 16:56:49	150.00	/storage/comprobantes/fac-2026-1.pdf
2	2	FAC-2026-00002	2026-11-03 16:56:49	180.00	/storage/comprobantes/fac-2026-2.pdf
3	3	FAC-2026-00003	2026-11-04 16:56:49	210.00	/storage/comprobantes/fac-2026-3.pdf
4	4	FAC-2026-00004	2026-11-05 16:56:49	240.00	/storage/comprobantes/fac-2026-4.pdf
5	5	FAC-2026-00005	2026-11-06 16:56:49	270.00	/storage/comprobantes/fac-2026-5.pdf
\.


--
-- Data for Name: contacto_emergencia; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.contacto_emergencia (id_contacto, id_paciente, nombre_completo, parentesco, telefono) FROM stdin;
1	16	Silvia Suárez Suárez	Madre	72111000
2	16	Gabriela Suárez Salvatierra	Padre	79536686
3	17	Fernando Quispe Barba	Madre	77473302
105	18	Contacto Familiar PAC-0003	Familiar	70011223
106	20	Contacto Familiar PAC-0005	Familiar	70011223
107	45	Contacto Familiar PAC-0030	Familiar	70011223
108	58	Contacto Familiar PAC-0043	Familiar	70011223
109	72	Contacto Familiar PAC-0057	Familiar	70011223
110	74	Contacto Familiar PAC-0073	Familiar	70011223
\.


--
-- Data for Name: especialidad; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.especialidad (id_especialidad, nombre, descripcion, activo) FROM stdin;
1	Medicina General	Atención primaria y consulta general	t
2	Pediatría	Atención de niños y adolescentes	t
3	Ginecología	Salud de la mujer y control prenatal	t
5	Cardiología	Diagnóstico y tratamiento de enfermedades del corazón	t
7	Dermatología	Enfermedades de la piel	f
8	Cardiología Pediátrica 232	Subespecialidad cardiológica para niños	t
\.


--
-- Data for Name: failed_jobs; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.failed_jobs (id, uuid, connection, queue, payload, exception, failed_at) FROM stdin;
\.


--
-- Data for Name: historial_estado_cita; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.historial_estado_cita (id_historial, id_cita, id_usuario, estado_anterior, estado_nuevo, fecha_anterior, hora_anterior, motivo, fecha_cambio) FROM stdin;
1	1	2	\N	PROGRAMADA	\N	\N	Registro de la cita (CU21)	2026-08-13 08:00:00+00
2	2	5	\N	PROGRAMADA	\N	\N	Registro de la cita (CU21)	2026-08-14 10:50:00+00
3	3	2	\N	PROGRAMADA	\N	\N	Registro de la cita (CU21)	2026-08-15 09:50:00+00
4	5	5	\N	CONFIRMADA	\N	\N	Registro inicial de la cita médica CM-0005	2026-08-16 13:00:00+00
5	6	5	\N	CONFIRMADA	\N	\N	Registro inicial de la cita médica CM-0006	2026-08-16 14:00:00+00
6	200	2	\N	CONFIRMADA	\N	\N	Registro inicial de la cita médica CM-0200	2026-10-20 14:00:00+00
7	217	2	\N	CANCELADA	\N	\N	Registro inicial de la cita médica CM-0217	2026-10-21 15:00:00+00
\.


--
-- Data for Name: horario; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.horario (id_horario, id_medico, dia_semana, hora_inicio, hora_fin, duracion_bloque_min, activo) FROM stdin;
1	6	1	08:00:00	12:00:00	30	t
2	6	3	08:00:00	12:00:00	30	t
3	6	5	08:00:00	12:00:00	30	t
4	11	1	08:00:00	12:00:00	30	t
5	11	3	14:00:00	18:00:00	30	t
6	8	1	08:00:00	12:00:00	30	t
7	8	3	14:00:00	18:00:00	30	t
8	7	1	08:00:00	12:00:00	30	t
9	7	3	14:00:00	18:00:00	30	t
\.


--
-- Data for Name: informacion_medica; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.informacion_medica (id_informacion, id_paciente, tipo_sangre, alergias, enfermedades_cronicas, medicamentos_habituales, antecedentes_relevantes, observaciones, fecha_actualizacion) FROM stdin;
1	16	O+	Mariscos	\N	\N	\N	Paciente refiere control periódico en otra clínica	2026-08-16 17:10:00+00
2	17	O+	Ibuprofeno	\N	\N	\N	Sin observaciones	2026-08-24 21:25:00+00
3	18	A-	Polen	\N	\N	\N	Sin observaciones	2026-08-12 12:55:00+00
4	20	O+	Ninguna conocida	Ninguna	Ninguno	Sin antecedentes clínicos relevantes	Paciente en buen estado general	2026-11-07 16:56:49+00
5	45	O+	Ninguna conocida	Ninguna	Ninguno	Sin antecedentes clínicos relevantes	Paciente en buen estado general	2026-11-07 16:56:49+00
6	58	O+	Ninguna conocida	Ninguna	Ninguno	Sin antecedentes clínicos relevantes	Paciente en buen estado general	2026-11-07 16:56:49+00
7	72	O+	Ninguna conocida	Ninguna	Ninguno	Sin antecedentes clínicos relevantes	Paciente en buen estado general	2026-11-07 16:56:49+00
8	74	O+	Ninguna conocida	Ninguna	Ninguno	Sin antecedentes clínicos relevantes	Paciente en buen estado general	2026-11-07 16:56:49+00
\.


--
-- Data for Name: job_batches; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.job_batches (id, name, total_jobs, pending_jobs, failed_jobs, failed_job_ids, options, cancelled_at, created_at, finished_at) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.jobs (id, queue, payload, attempts, reserved_at, available_at, created_at) FROM stdin;
\.


--
-- Data for Name: medico; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.medico (id_persona, codigo, matricula) FROM stdin;
6	MED-001	MP-SCZ-1422
7	MED-002	MP-SCZ-1459
8	MED-003	MP-SCZ-1496
11	MED-006	MP-SCZ-1580
\.


--
-- Data for Name: medico_especialidad; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.medico_especialidad (id_medico, id_especialidad, fecha_asignacion) FROM stdin;
6	1	2026-08-01 12:00:00+00
7	2	2026-08-01 12:00:00+00
8	2	2026-08-01 12:00:00+00
8	1	2026-08-01 12:00:00+00
11	5	2026-08-01 12:00:00+00
11	1	2026-08-01 12:00:00+00
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2026_10_25_100001_create_persona_table	1
5	2026_10_25_100002_create_rol_table	1
6	2026_10_25_100003_create_permiso_table	1
7	2026_10_25_100004_create_rol_permiso_table	1
8	2026_10_25_100005_create_usuario_table	1
9	2026_10_25_100006_create_sesion_table	1
10	2026_10_25_100007_create_token_recuperacion_table	1
11	2026_10_25_100008_create_personal_administrativo_table	1
12	2026_10_25_100009_create_bitacora_table	1
13	2026_10_25_100010_create_paciente_table	1
14	2026_10_25_100011_create_informacion_medica_table	1
15	2026_10_25_100012_create_contacto_emergencia_table	1
16	2026_10_25_100013_create_medico_table	1
17	2026_10_25_100014_create_especialidad_table	1
18	2026_10_25_100015_create_medico_especialidad_table	1
19	2026_10_25_100016_create_horario_table	1
20	2026_10_25_100017_create_bloqueo_agenda_table	1
21	2026_10_25_100018_create_cita_table	1
22	2026_10_25_100019_create_historial_estado_cita_table	1
23	2026_10_25_100020_create_notificacion_table	1
24	2026_10_25_100021_create_reporte_table	1
25	2026_11_07_200001_actualizar_tablas_segun_diccionario_23_tablas	2
\.


--
-- Data for Name: notificacion; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.notificacion (id_notificacion, id_cita, id_usuario_gestion, mensaje, fecha_programada, fecha_envio, estado, intentos) FROM stdin;
1	2	5	Llamar al paciente: recordar cita CM-0002 del 25/08/2026 a las 09:00. Resultado: paciente confirmó asistencia.	2026-08-24 12:00:00+00	2026-08-24 12:30:00+00	ENVIADA	1
2	5	5	Llamar al paciente: recordar cita CM-0005 del 25/08/2026 a las 11:30. Resultado: paciente avisado.	2026-08-24 12:00:00+00	2026-08-24 20:58:00+00	ENVIADA	1
3	6	5	Llamar al paciente: recordar cita CM-0006 del 25/08/2026 a las 16:30. Resultado: paciente avisado.	2026-08-24 12:00:00+00	2026-08-24 15:07:00+00	ENVIADA	1
186	200	2	Llamar al paciente: recordar cita CM-0200 del 25/10/2026 a las 08:30.	2026-10-24 12:00:00+00	2026-10-24 20:10:00+00	ENVIADA	1
187	1	1	Recordatorio: Estimado paciente, su cita CM-0001 está agendada para el 25/08/2026 a horas 15:30:00	2026-11-08 16:57:27+00	\N	PENDIENTE	0
188	3	1	Recordatorio: Estimado paciente, su cita CM-0003 está agendada para el 27/08/2026 a horas 15:00:00	2026-11-08 16:57:27+00	\N	PENDIENTE	0
189	217	1	Recordatorio: Estimado paciente, su cita CM-0217 está agendada para el 26/10/2026 a horas 09:00:00	2026-11-08 16:57:27+00	\N	PENDIENTE	0
\.


--
-- Data for Name: paciente; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.paciente (id_persona, codigo, sexo, fecha_nacimiento, direccion, fecha_registro) FROM stdin;
16	PAC-0001	M	2024-12-12	Barrio Guaracachi, calle 5	2026-11-07 20:54:20
17	PAC-0002	M	2016-02-26	Av. Piraí, 6to anillo	2026-11-07 20:54:20
18	PAC-0003	M	2016-06-01	Av. Cristo Redentor, 4to anillo	2026-11-07 20:54:20
20	PAC-0005	F	1990-05-14	Av. Busch, 3er anillo	2026-11-07 20:54:20
45	PAC-0030	M	1982-11-20	Barrio Equipetrol, calle 4	2026-11-07 20:54:20
58	PAC-0043	F	1975-03-08	Av. Santos Dumont, 5to anillo	2026-11-07 20:54:20
72	PAC-0057	M	1988-07-19	Radial 26, 4to anillo	2026-11-07 20:54:20
74	PAC-0073	M	1998-04-12	Av. San Martín #45	2026-11-07 20:54:20
\.


--
-- Data for Name: pago; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.pago (id_pago, id_cita, id_usuario_registro, monto, moneda, metodo, estado, referencia_externa, fecha_hora) FROM stdin;
1	1	2	150.00	BOB	TARJETA	REEMBOLSADO	PAY-VS-000001	2026-11-02 16:56:49
2	2	2	180.00	BOB	QR	APROBADO	PAY-VS-000002	2026-11-03 16:56:49
3	3	2	210.00	BOB	EFECTIVO	APROBADO	PAY-VS-000003	2026-11-04 16:56:49
4	5	2	240.00	BOB	TARJETA	APROBADO	PAY-VS-000005	2026-11-05 16:56:49
5	6	2	270.00	BOB	QR	APROBADO	PAY-VS-000006	2026-11-06 16:56:49
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.password_reset_tokens (email, token, created_at) FROM stdin;
\.


--
-- Data for Name: permiso; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.permiso (id_permiso, nombre, modulo, ruta_menu) FROM stdin;
1	iniciar_sesion	P1 Seguridad y Autenticación	/login
2	cambiar_propia_contrasena	P1 Seguridad y Autenticación	/perfil/contrasena
3	gestionar_usuarios	P2 Administración de Usuarios RBAC	/usuarios
4	gestionar_roles	P2 Administración de Usuarios RBAC	/roles
5	consultar_bitacora	P3 Auditoría y Bitácora	/bitacora
6	gestionar_pacientes	P4 Gestión de Pacientes	/pacientes
7	gestionar_medicos	P5 Gestión Médica y Horarios	/medicos
8	bloquear_agenda	P5 Gestión Médica y Horarios	/agenda/bloqueos
9	gestionar_citas	P6 Gestión de Citas	/citas
10	consultar_agenda_diaria	P6 Gestión de Citas	/agenda
11	marcar_atendida	P6 Gestión de Citas	/agenda/atender
12	generar_reportes	P7 Reportes	/reportes
\.


--
-- Data for Name: persona; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.persona (id_persona, ci, nombres, apellidos, telefono, email, activo, fecha_registro) FROM stdin;
1	11757436	Silvia Irene	Colque López	76945876	scolque@vidasalud.com.bo	t	2026-08-01 12:00:00+00
2	8090601	Rosa María	Vaca Cuéllar	75403694	rvaca@vidasalud.com.bo	t	2026-08-01 12:00:00+00
3	5930783	Carla Andrea	Suárez Roca	78793510	csuarez@vidasalud.com.bo	t	2026-08-01 12:00:00+00
6	4589210	Carlos Alberto	Montaño Rivero	73112233	cmontano@vidasalud.com.bo	t	2026-08-01 12:00:00+00
7	5129384	Patricia	Gutiérrez Vaca	74223344	pgutierrez@vidasalud.com.bo	t	2026-08-01 12:00:00+00
8	6019283	Jorge Eduardo	Rojas Dorado	75334455	jrojas@vidasalud.com.bo	t	2026-08-01 12:00:00+00
9	6891234	Daniela	Aguilera Chávez	76445566	daguilera@vidasalud.com.bo	t	2026-08-01 12:00:00+00
11	5412890	Roberto Carlos	Terrazas Saucedo	77556677	rterrazas@vidasalud.com.bo	t	2026-08-01 12:00:00+00
16	9812341	Mateo	Suárez Salvatierra	72111000	\N	t	2026-08-10 13:00:00+00
17	9812342	Lucas	Quispe Barba	77473302	\N	t	2026-08-10 13:15:00+00
18	9812343	Santiago	Melgar Roca	78112299	\N	t	2026-08-10 13:30:00+00
45	7456123	Miguel Ángel	Chávez Soliz	76009988	mchavez@gmail.com	t	2026-08-12 15:00:00+00
58	6345981	Lucía	Ardaya Céspedes	75008877	lardaya@gmail.com	t	2026-08-12 16:00:00+00
72	8901234	Andrés	Paniagua Torrico	74007766	apaniagua@gmail.com	t	2026-08-13 12:30:00+00
20	8123456	Elena	Hurtado Flores	70269300	ehurtado@gmail.com	t	2026-08-11 14:00:00+00
5	7349182	María René	Justiniano Paz	72134567	mjustiniano@vidasalud.com.bo	t	2026-08-01 12:00:00+00
73	8899571	Carlos	Pereda	71122334	cpereda38@vidasalud.com.bo	t	2026-10-26 19:50:59.876115+00
4	6210451	Luis Fernando	Ortiz Méndez	71023456	lortiz@vidasalud.com.bo	t	2026-08-01 12:00:00+00
74	7891234	Carlos Daniel	Mendoza Roca	77099881	carlos.mendoza@test.bo	t	2026-11-07 18:56:48.856526+00
\.


--
-- Data for Name: personal_administrativo; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.personal_administrativo (id_persona, cargo) FROM stdin;
1	Administradora del sistema
2	Recepcionista turno mañana
3	Recepcionista turno mañana
4	Recepcionista turno tarde
5	Recepcionista turno tarde
73	Recepcionista
\.


--
-- Data for Name: recuperacion_contrasena; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.recuperacion_contrasena (id_recuperacion, id_usuario, token_hash, fecha_generacion, fecha_expiracion, usado) FROM stdin;
1	1	845862d5d965e6663f59c35762375f4485ac374cdf038c21b2c330090253bb34	2026-11-07 15:56:49	2026-11-07 19:56:49	f
2	1	925f7cfd9284ea6dd80f5f721171458892b17d7078f3680537a17b5cb27997b7	2026-11-05 16:56:49	2026-11-06 16:56:49	t
\.


--
-- Data for Name: reembolso; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.reembolso (id_reembolso, id_pago, id_usuario_autoriza, monto, motivo, estado, fecha_solicitud, fecha_procesado, referencia_externa) FROM stdin;
1	1	1	150.00	Cita médica cancelada con anticipación según política de la clínica	PROCESADO	2026-11-06 16:56:49	2026-11-07 06:56:49	REFUND-BNB-139710
\.


--
-- Data for Name: reporte; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.reporte (id_reporte, id_usuario, tipo, fecha_desde, fecha_hasta, filtros, formato, fecha_generacion) FROM stdin;
2	1	CITAS_PERIODO	2026-09-01	2026-09-30	{"estado": null}	PDF	2026-10-01 13:10:00+00
3	1	ATENCIONES_MEDICO_ESPECIALIDAD	2026-09-01	2026-09-30	{"id_especialidad": 2}	\N	2026-10-01 13:30:00+00
4	1	CITAS_PERIODO	2026-10-01	2026-12-31	{"subtipo": "EXPORTACION_GENERAL"}	CSV	2026-11-06 21:37:38+00
5	1	CITAS_PERIODO	2026-10-01	2026-12-31	{"subtipo": "EXPORTACION_GENERAL"}	CSV	2026-11-06 21:37:39+00
6	1	CITAS_PERIODO	2026-01-01	2026-12-31	{"desde": "2026-01-01", "hasta": "2026-12-31", "moneda": "BOB", "formato": "CSV"}	CSV	2026-11-06 21:54:43+00
7	1	CITAS_PERIODO	2026-01-01	2026-12-31	{"desde": "2026-01-01", "hasta": "2026-12-31", "moneda": "BOB", "formato": "CSV"}	CSV	2026-11-06 21:54:44+00
8	1	CITAS_PERIODO	2026-01-01	2026-12-31	{"desde": "2026-01-01", "hasta": "2026-12-31", "moneda": "BOB", "formato": "CSV"}	CSV	2026-11-06 21:54:48+00
9	1	CITAS_PERIODO	2026-01-01	2026-12-31	{"desde": "2026-01-01", "hasta": "2026-12-31", "moneda": "BOB", "formato": "CSV"}	CSV	2026-11-06 21:54:49+00
10	1	PACIENTES_REGISTRADOS	\N	\N	[]	PDF	2026-11-07 02:23:15+00
11	1	PACIENTES_REGISTRADOS	\N	\N	[]	PDF	2026-11-07 02:23:17+00
\.


--
-- Data for Name: rol; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.rol (id_rol, nombre, descripcion) FROM stdin;
1	Administrador	Gestión integral: usuarios, roles, catálogos, bitácora y reportes
2	Recepcionista	Inscripción de pacientes, disponibilidad, programación y control de citas
3	Médico	Agenda diaria, datos básicos del paciente y registro de la atención
4	Paciente	Portal web del paciente: mis citas, reprogramación, pagos y ficha médica
\.


--
-- Data for Name: rol_permiso; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.rol_permiso (id_rol, id_permiso, fecha_asignacion) FROM stdin;
1	1	2026-08-01 12:00:00+00
1	2	2026-08-01 12:00:00+00
1	4	2026-10-26 01:36:50.251829+00
1	5	2026-10-26 01:36:50.251829+00
1	6	2026-10-26 01:36:50.251829+00
1	7	2026-10-26 01:36:50.251829+00
1	8	2026-10-26 01:36:50.251829+00
1	9	2026-10-26 01:36:50.251829+00
1	10	2026-10-26 01:36:50.251829+00
1	11	2026-10-26 01:36:50.251829+00
1	12	2026-10-26 01:36:50.251829+00
2	6	2026-10-26 01:36:50.251829+00
2	9	2026-10-26 01:36:50.251829+00
2	10	2026-10-26 01:36:50.251829+00
3	10	2026-10-26 01:36:50.251829+00
3	11	2026-10-26 01:36:50.251829+00
4	1	2026-11-07 02:41:08+00
4	2	2026-11-07 02:41:08+00
4	9	2026-11-07 02:41:08+00
\.


--
-- Data for Name: sesion; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.sesion (id_sesion, id_usuario, fecha_inicio, ultima_actividad, fecha_cierre, activa, ip) FROM stdin;
dd7fe5a4dea37a7fa959b7ab0b11ad9a992e9d5995d037c5d660bba6358a632c	1	2026-10-26 02:12:00+00	2026-10-26 02:12:00+00	\N	t	127.0.0.1
1i8eG4mAGTcGdGtXOJ9GmGMEelVjWeCKXU3coE4V	1	2026-10-26 02:12:00+00	2026-10-26 02:12:00+00	\N	t	127.0.0.1
dHc4UvvaFkqIJD2QbSH7KEuAfJyQsq5PIKveaWRf	1	2026-10-26 03:08:57+00	2026-10-26 03:08:57+00	\N	t	127.0.0.1
mBL7AZdqQflsQzkAuyepFJJ9H9VWETTNAr1P5i3p	1	2026-11-07 02:35:47+00	2026-11-07 02:35:47+00	\N	t	127.0.0.1
ee4b1840c4c8675e6e715b2e77cc750be1a3a57c08540a5d7cee8123027aef03	1	2026-10-26 03:08:57+00	2026-10-26 03:09:01+00	\N	t	127.0.0.1
qdy0XIgJIByz8VmntVDYXoPSIiHpmJeGK7lWRm3Q	1	2026-10-26 03:14:47+00	2026-10-26 03:14:47+00	\N	t	127.0.0.1
3305771b28f3ceb030dcf1c0459a1156c221515fe430c478550902f5125d9185	1	2026-11-06 19:53:45+00	2026-11-06 19:53:45+00	\N	t	127.0.0.1
kg8GJ8ScRbFHpZPpSUGTXV8cwOiw2PjMq9TDhim8	1	2026-11-06 19:53:45+00	2026-11-06 19:53:45+00	\N	t	127.0.0.1
d5a45d96f0a6344362dcf430c545f7580c4f2214c0c4d868681e9f2c50bda7d0	1	2026-10-26 03:10:03+00	2026-10-26 03:10:03+00	2026-10-26 03:15:15+00	f	127.0.0.1
6e7IslFNYxn70qOpybW8GvV9cUJmka0KklnzE2my	1	2026-10-26 03:10:03+00	2026-10-26 03:10:03+00	2026-10-26 03:15:15+00	f	127.0.0.1
2d554cbd59f68b245b792a7c0232e72d874edf504d56b2f20ee2de007fdfd0d0	11	2026-11-07 18:57:03+00	2026-11-07 18:57:03+00	\N	t	127.0.0.1
ae01510068ea3d063fdeec95bec514be5cf9d7afb62d2ccfafb9741e2a0d86ff	1	2026-10-26 03:14:47+00	2026-10-26 03:15:21+00	\N	t	127.0.0.1
6eda46c8f28e7cbd490d95cab5eaa087bde5fb4251ae1fa41ef989a9f7383307	1	2026-10-26 03:15:40+00	2026-10-26 03:15:40+00	\N	t	127.0.0.1
jbGolfqIPWVXf99ffQsmTmwOZjrDebClgbrr3eT4	1	2026-10-26 03:15:40+00	2026-10-26 03:15:40+00	\N	t	127.0.0.1
94b81cfdad9ebbf0373bc5e80283289cbd4b4365b895eb214f18370a219e5588	1	2026-10-26 03:20:21+00	2026-10-26 03:20:21+00	\N	t	127.0.0.1
D0gSnQHIBK7hEdFxrnoDTs22yalyUHMt7JXrQLZw	1	2026-10-26 03:20:21+00	2026-10-26 03:20:21+00	\N	t	127.0.0.1
FNjnZ4IBp7Wxycdeh80rJwb2uqXuTiLHFCGcSdQJ	1	2026-10-26 18:28:40+00	2026-10-26 18:28:40+00	\N	t	::1
5ad5f4236119c54f093bc68d3222b2cc232984ce57b85ebd008c20fe3b405162	1	2026-11-06 19:53:46+00	2026-11-06 19:53:46+00	\N	t	127.0.0.1
KoManWawldDHOFBgvbdq0MJB7UxAyb0mZEwK1cap	1	2026-11-06 19:53:46+00	2026-11-06 19:53:46+00	\N	t	127.0.0.1
ce3d5546c6da298dcbf7ba6006f83196f8305b7dd85566349b71598aae737f5d	1	2026-11-06 19:53:47+00	2026-11-06 19:53:47+00	\N	t	127.0.0.1
WWYdv29cUWV1PTWFKQx58GC2a0kqLsoQp1jr7yiP	1	2026-11-06 19:53:47+00	2026-11-06 19:53:47+00	\N	t	127.0.0.1
SbInnK4ravwWr4oB8dQ0Tq0Xd6mqXpvr6zmBY9ZK	1	2026-11-06 19:53:48+00	2026-11-06 19:53:48+00	\N	t	127.0.0.1
a79d1ad9fb8b9c69e2cc065591a2904f5d79b342325e88e8e8c97117108e0fde	1	2026-11-06 19:53:48+00	2026-11-06 19:53:48+00	2026-11-06 21:04:14+00	f	127.0.0.1
5c47e30c5679cafd17ef3f3df6c88100bfa241b98268d93267f3fbd0c1458dad	1	2026-10-26 21:11:48+00	2026-10-26 21:11:48+00	2026-10-26 22:03:40+00	f	::1
KGWxA0MoJOv6m9X4Ik3CN5WH84KPXpfOI7miuNW5	1	2026-10-26 21:11:48+00	2026-10-26 21:11:48+00	2026-10-26 22:03:40+00	f	::1
bce46428c5d381b45749c8e5ceb4fa1d5b9670d27709c64414120bb05d9a3274	1	2026-11-07 02:35:47+00	2026-11-07 02:35:47+00	2026-11-07 19:50:00+00	f	127.0.0.1
fnAxVazfH1voRW0qM3VGNQrBtuwwSdXnlDo6BpMv	1	2026-10-26 22:04:04+00	2026-10-26 22:04:04+00	\N	t	::1
125704a382c33ec91235c2a16e38c61298177c6f6b8230c56504219706c5c992	1	2026-10-26 22:04:04+00	2026-10-26 22:04:04+00	2026-10-26 22:07:39+00	f	::1
PSkOC7uIKzVdpJAyEkH8rEY6ZBUkCUfweZfOjKwF	1	2026-11-05 19:19:53+00	2026-11-05 19:19:53+00	\N	t	127.0.0.1
60d675e2ae2dfcf3fa1081e9c2b744a232250ce53df7712e1e4cc2e70e9a82b0	1	2026-11-05 19:19:53+00	2026-11-05 19:19:53+00	2026-11-05 19:21:01+00	f	127.0.0.1
L8lBiL6Jys0JE5b4DUGbQwKC1TQJ2zZ06l7eoL4U	1	2026-11-06 21:27:05+00	2026-11-06 21:27:05+00	\N	t	127.0.0.1
ddf4e640cdfe2bbe6aedc612e18dbe5548d95b83692f13dccb6c96cc873c1d34	1	2026-11-06 16:00:43+00	2026-11-06 16:00:43+00	\N	t	127.0.0.1
U1lC1E9iSCRXg3mSIcLu0b9in3tXxefzGvmZkZPe	1	2026-11-06 16:00:43+00	2026-11-06 16:00:43+00	\N	t	127.0.0.1
nXr60wJ1QRupJ4JyYGTr33qdfAP1o26GC8tZnlzf	1	2026-11-06 16:00:54+00	2026-11-06 16:00:54+00	\N	t	127.0.0.1
4e92f4a1574dab4f2c9cf87741ecdd3e03cdb4fe2cafc1e624f1eb2bd181a3bf	1	2026-11-06 16:00:54+00	2026-11-06 16:00:54+00	2026-11-06 16:43:52+00	f	127.0.0.1
631c453e91a7ffe6fc8cba2b41497f64634b7475e3c01324293619b964731cb0	1	2026-11-06 21:27:05+00	2026-11-06 21:27:05+00	2026-11-06 21:42:17+00	f	127.0.0.1
moipwg6mdRxb8GXeZgLN9ZdHPHA9xO6YG2e3oYAj	1	2026-11-06 21:42:32+00	2026-11-06 21:42:32+00	\N	t	127.0.0.1
a6e91a8f6800db2393c3ce445eb336b344959f138c1257bd065671d407343dd0	1	2026-11-06 21:42:32+00	2026-11-06 21:42:32+00	2026-11-07 02:08:43+00	f	127.0.0.1
b69rlGamimGn2MTzATwYkuiZi98MdccqWYUII1DL	1	2026-11-07 19:50:47+00	2026-11-07 19:50:47+00	\N	t	127.0.0.1
qiSwmlUjLw7f27YBJf1dIYkflxVUx8M7Ez1undvQ	1	2026-11-07 02:22:31+00	2026-11-07 02:22:31+00	\N	t	127.0.0.1
5d19065754a09bf5944020802a70166c1f9a8c882175449af5c404926397a89e	1	2026-11-07 02:22:31+00	2026-11-07 02:22:31+00	2026-11-07 02:32:09+00	f	127.0.0.1
tQnVmwQUd5delqE6IM5JB1CQrhzgBphd6Y4sBtEQ	1	2026-11-07 02:32:25+00	2026-11-07 02:32:25+00	\N	t	127.0.0.1
52cba8e672e0ad705fd4644da12d2a30584e76e8b18ba36d078e441d88c9d0f0	1	2026-11-07 02:32:25+00	2026-11-07 02:32:25+00	2026-11-07 02:33:10+00	f	127.0.0.1
Q9DlnkWoWEgpo1KbAZmAQMyYD0VYLj9fBTLXzslI	1	2026-11-07 16:01:50+00	2026-11-07 16:01:50+00	\N	t	127.0.0.1
ec47517aa30ffd15658a7445fee54ebdf4d184a04dd80cb2fb0ac9391219c266	1	2026-11-07 19:50:47+00	2026-11-07 19:50:47+00	2026-11-07 19:51:14+00	f	127.0.0.1
e2ec91633f460cc3ab163b781d61b5c6e5dfa4d63b8382b34f2f2d8100ce15a8	1	2026-11-07 16:01:50+00	2026-11-07 16:01:50+00	2026-11-07 16:02:14+00	f	127.0.0.1
loWX22FsQFQAGmfaxJMkaEbHJ18QSIkIrHjrtz3z	1	2026-11-07 16:17:34+00	2026-11-07 16:17:34+00	\N	t	127.0.0.1
27c4c9dc3d9e4bdfa36e04e02f65ace251cebbabbc6450e834f90898d10ed34f	1	2026-10-26 18:28:40+00	2026-11-07 19:51:22+00	2026-11-07 19:56:51+00	f	::1
30e62424692e861e91f8a43c774c60ba68d67abd60daf72285bf9cc4d6b5534b	1	2026-11-07 16:17:34+00	2026-11-07 16:17:34+00	2026-11-07 16:17:47+00	f	127.0.0.1
6gghtahtamgsSWojsvFpQm4drsFkPkzohh4p8Z7z	1	2026-11-07 16:25:38+00	2026-11-07 16:25:38+00	\N	t	127.0.0.1
1b08df937e9de82c5ff531288420d14ef494654ae76e98c51c2d27e922e3b5a6	1	2026-11-07 16:25:38+00	2026-11-07 16:25:38+00	2026-11-07 16:25:43+00	f	127.0.0.1
a89c51935edaf55d84cd442fd1b4d06e5ff71eb3bdb700c9bea2043714cdbc2e	1	2026-11-07 17:18:36+00	2026-11-07 17:18:36+00	\N	t	127.0.0.1
NKMhaekMUiXreyoyW0AtVgdAUw1BKNNaKkc2Jgoq	1	2026-11-07 17:18:36+00	2026-11-07 17:18:36+00	\N	t	127.0.0.1
f0aab7304e332badce61a545e8a87ef85c8681ae907ad0599e05e430fba7df16	1	2026-11-07 17:18:38+00	2026-11-07 17:18:38+00	\N	t	127.0.0.1
YZn4MUh2iJ8BvxYRb6Evyi9vGuh1E6grAgeb6H0o	1	2026-11-07 17:18:38+00	2026-11-07 17:18:38+00	\N	t	127.0.0.1
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.sessions (id, user_id, ip_address, user_agent, payload, last_activity) FROM stdin;
\.


--
-- Data for Name: token_recuperacion; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.token_recuperacion (id_token, id_usuario, token_hash, fecha_generacion, fecha_expiracion, usado) FROM stdin;
4	1	bca794e282f7308d61bdc60aaaf934f6ccef2beeefa36d739c92d8755d39352f	2026-11-07 14:56:49+00	2026-11-07 18:56:49+00	f
5	1	c7686902d7119878cd0dc2b37675f4cdb0b0d994ab8e2aa6ca6329d267d37829	2026-11-06 16:56:49+00	2026-11-06 18:56:49+00	t
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.users (id, name, email, email_verified_at, password, remember_token, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: usuario; Type: TABLE DATA; Schema: vida_salud; Owner: postgres
--

COPY vida_salud.usuario (id_usuario, id_persona, id_rol, nombre_usuario, hash_contrasena, estado, intentos_fallidos, bloqueado_hasta, ultimo_acceso, fecha_creacion, remember_token) FROM stdin;
1	1	1	scolque	$2y$12$blegEXR4bV3oHagMojXWie14bmeVHfC8at9ubp6zptggqCmxjCMq6	ACTIVO	0	\N	2026-11-07 17:18:38+00	2026-08-01 12:03:00+00	0P6FkOe82SK4bcrzZiEBelQUbM9HBZ52axutudd1SXuamz0PvGedStavwg4r
2	2	2	rvaca	$2y$12$blegEXR4bV3oHagMojXWie14bmeVHfC8at9ubp6zptggqCmxjCMq6	ACTIVO	0	\N	2026-10-23 19:36:00+00	2026-08-01 12:06:00+00	\N
9	9	3	daguilera	$2y$12$blegEXR4bV3oHagMojXWie14bmeVHfC8at9ubp6zptggqCmxjCMq6	ACTIVO	0	\N	2026-10-23 16:00:00+00	2026-08-01 12:30:00+00	\N
3	3	2	csuarez	$2y$12$blegEXR4bV3oHagMojXWie14bmeVHfC8at9ubp6zptggqCmxjCMq6	ACTIVO	0	\N	2026-10-23 14:12:00+00	2026-08-01 12:09:00+00	\N
4	4	2	lortiz	$2y$12$blegEXR4bV3oHagMojXWie14bmeVHfC8at9ubp6zptggqCmxjCMq6	ACTIVO	0	\N	2026-10-23 21:00:00+00	2026-08-01 12:12:00+00	\N
11	74	4	cmendoza	$2y$12$FC/4mMOpMTZlWKXMhBf05.51UJJLq4gWk21zfpuZAjo2BvkFu5aGS	ACTIVO	0	\N	2026-11-07 18:57:03+00	2026-11-07 18:56:48.856526+00	\N
5	5	2	mjustiniano	$2y$12$blegEXR4bV3oHagMojXWie14bmeVHfC8at9ubp6zptggqCmxjCMq6	ACTIVO	0	\N	2026-10-23 22:00:00+00	2026-08-01 12:15:00+00	\N
10	73	2	cpereda36	$2y$12$/kzvrDnC5mDzWXNuICz/puagHiLtrnXj/.sS9G2d57G35lkyWiiMK	ACTIVO	0	\N	\N	2026-10-26 19:50:59.876115+00	\N
\.


--
-- Name: bitacora_id_bitacora_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.bitacora_id_bitacora_seq', 80, true);


--
-- Name: bloqueo_agenda_id_bloqueo_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.bloqueo_agenda_id_bloqueo_seq', 3, true);


--
-- Name: cita_id_cita_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.cita_id_cita_seq', 217, true);


--
-- Name: comprobante_pago_id_comprobante_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.comprobante_pago_id_comprobante_seq', 5, true);


--
-- Name: contacto_emergencia_id_contacto_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.contacto_emergencia_id_contacto_seq', 110, true);


--
-- Name: especialidad_id_especialidad_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.especialidad_id_especialidad_seq', 8, true);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.failed_jobs_id_seq', 1, false);


--
-- Name: historial_estado_cita_id_historial_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.historial_estado_cita_id_historial_seq', 7, true);


--
-- Name: horario_id_horario_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.horario_id_horario_seq', 9, true);


--
-- Name: informacion_medica_id_informacion_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.informacion_medica_id_informacion_seq', 8, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.jobs_id_seq', 1, false);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.migrations_id_seq', 25, true);


--
-- Name: notificacion_id_notificacion_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.notificacion_id_notificacion_seq', 189, true);


--
-- Name: pago_id_pago_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.pago_id_pago_seq', 5, true);


--
-- Name: permiso_id_permiso_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.permiso_id_permiso_seq', 12, true);


--
-- Name: persona_id_persona_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.persona_id_persona_seq', 74, true);


--
-- Name: recuperacion_contrasena_id_recuperacion_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.recuperacion_contrasena_id_recuperacion_seq', 2, true);


--
-- Name: reembolso_id_reembolso_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.reembolso_id_reembolso_seq', 1, true);


--
-- Name: reporte_id_reporte_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.reporte_id_reporte_seq', 11, true);


--
-- Name: rol_id_rol_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.rol_id_rol_seq', 3, true);


--
-- Name: token_recuperacion_id_token_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.token_recuperacion_id_token_seq', 5, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.users_id_seq', 1, false);


--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE SET; Schema: vida_salud; Owner: postgres
--

SELECT pg_catalog.setval('vida_salud.usuario_id_usuario_seq', 11, true);


--
-- Name: bitacora bitacora_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.bitacora
    ADD CONSTRAINT bitacora_pkey PRIMARY KEY (id_bitacora);


--
-- Name: bloqueo_agenda bloqueo_agenda_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.bloqueo_agenda
    ADD CONSTRAINT bloqueo_agenda_pkey PRIMARY KEY (id_bloqueo);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: cita cita_codigo_unico; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.cita
    ADD CONSTRAINT cita_codigo_unico UNIQUE (codigo);


--
-- Name: cita cita_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.cita
    ADD CONSTRAINT cita_pkey PRIMARY KEY (id_cita);


--
-- Name: comprobante_pago comprobante_pago_id_pago_unique; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.comprobante_pago
    ADD CONSTRAINT comprobante_pago_id_pago_unique UNIQUE (id_pago);


--
-- Name: comprobante_pago comprobante_pago_numero_unique; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.comprobante_pago
    ADD CONSTRAINT comprobante_pago_numero_unique UNIQUE (numero);


--
-- Name: comprobante_pago comprobante_pago_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.comprobante_pago
    ADD CONSTRAINT comprobante_pago_pkey PRIMARY KEY (id_comprobante);


--
-- Name: contacto_emergencia contacto_emergencia_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.contacto_emergencia
    ADD CONSTRAINT contacto_emergencia_pkey PRIMARY KEY (id_contacto);


--
-- Name: especialidad especialidad_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.especialidad
    ADD CONSTRAINT especialidad_pkey PRIMARY KEY (id_especialidad);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: historial_estado_cita historial_estado_cita_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.historial_estado_cita
    ADD CONSTRAINT historial_estado_cita_pkey PRIMARY KEY (id_historial);


--
-- Name: horario horario_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.horario
    ADD CONSTRAINT horario_pkey PRIMARY KEY (id_horario);


--
-- Name: informacion_medica informacion_medica_paciente_unico; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.informacion_medica
    ADD CONSTRAINT informacion_medica_paciente_unico UNIQUE (id_paciente);


--
-- Name: informacion_medica informacion_medica_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.informacion_medica
    ADD CONSTRAINT informacion_medica_pkey PRIMARY KEY (id_informacion);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: medico medico_codigo_unico; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.medico
    ADD CONSTRAINT medico_codigo_unico UNIQUE (codigo);


--
-- Name: medico_especialidad medico_especialidad_pk; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.medico_especialidad
    ADD CONSTRAINT medico_especialidad_pk PRIMARY KEY (id_medico, id_especialidad);


--
-- Name: medico medico_matricula_unica; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.medico
    ADD CONSTRAINT medico_matricula_unica UNIQUE (matricula);


--
-- Name: medico medico_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.medico
    ADD CONSTRAINT medico_pkey PRIMARY KEY (id_persona);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: notificacion notificacion_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.notificacion
    ADD CONSTRAINT notificacion_pkey PRIMARY KEY (id_notificacion);


--
-- Name: paciente paciente_codigo_unico; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.paciente
    ADD CONSTRAINT paciente_codigo_unico UNIQUE (codigo);


--
-- Name: paciente paciente_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.paciente
    ADD CONSTRAINT paciente_pkey PRIMARY KEY (id_persona);


--
-- Name: pago pago_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.pago
    ADD CONSTRAINT pago_pkey PRIMARY KEY (id_pago);


--
-- Name: pago pago_referencia_externa_unique; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.pago
    ADD CONSTRAINT pago_referencia_externa_unique UNIQUE (referencia_externa);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: permiso permiso_nombre_unico; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.permiso
    ADD CONSTRAINT permiso_nombre_unico UNIQUE (nombre);


--
-- Name: permiso permiso_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.permiso
    ADD CONSTRAINT permiso_pkey PRIMARY KEY (id_permiso);


--
-- Name: persona persona_ci_unico; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.persona
    ADD CONSTRAINT persona_ci_unico UNIQUE (ci);


--
-- Name: persona persona_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.persona
    ADD CONSTRAINT persona_pkey PRIMARY KEY (id_persona);


--
-- Name: personal_administrativo personal_administrativo_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.personal_administrativo
    ADD CONSTRAINT personal_administrativo_pkey PRIMARY KEY (id_persona);


--
-- Name: recuperacion_contrasena recuperacion_contrasena_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.recuperacion_contrasena
    ADD CONSTRAINT recuperacion_contrasena_pkey PRIMARY KEY (id_recuperacion);


--
-- Name: recuperacion_contrasena recuperacion_contrasena_token_hash_unique; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.recuperacion_contrasena
    ADD CONSTRAINT recuperacion_contrasena_token_hash_unique UNIQUE (token_hash);


--
-- Name: reembolso reembolso_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.reembolso
    ADD CONSTRAINT reembolso_pkey PRIMARY KEY (id_reembolso);


--
-- Name: reporte reporte_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.reporte
    ADD CONSTRAINT reporte_pkey PRIMARY KEY (id_reporte);


--
-- Name: rol rol_nombre_unico; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.rol
    ADD CONSTRAINT rol_nombre_unico UNIQUE (nombre);


--
-- Name: rol_permiso rol_permiso_pk; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.rol_permiso
    ADD CONSTRAINT rol_permiso_pk PRIMARY KEY (id_rol, id_permiso);


--
-- Name: rol rol_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.rol
    ADD CONSTRAINT rol_pkey PRIMARY KEY (id_rol);


--
-- Name: sesion sesion_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.sesion
    ADD CONSTRAINT sesion_pkey PRIMARY KEY (id_sesion);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: token_recuperacion token_recuperacion_hash_unico; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.token_recuperacion
    ADD CONSTRAINT token_recuperacion_hash_unico UNIQUE (token_hash);


--
-- Name: token_recuperacion token_recuperacion_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.token_recuperacion
    ADD CONSTRAINT token_recuperacion_pkey PRIMARY KEY (id_token);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: usuario usuario_persona_unica; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.usuario
    ADD CONSTRAINT usuario_persona_unica UNIQUE (id_persona);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);


--
-- Name: bitacora_accion_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX bitacora_accion_idx ON vida_salud.bitacora USING btree (tipo_accion);


--
-- Name: bitacora_fecha_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX bitacora_fecha_idx ON vida_salud.bitacora USING btree (fecha_hora DESC);


--
-- Name: bitacora_usuario_fecha_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX bitacora_usuario_fecha_idx ON vida_salud.bitacora USING btree (id_usuario, fecha_hora DESC);


--
-- Name: bloqueo_agenda_medico_fechas_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX bloqueo_agenda_medico_fechas_idx ON vida_salud.bloqueo_agenda USING btree (id_medico, fecha_inicio, fecha_fin);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX cache_expiration_index ON vida_salud.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX cache_locks_expiration_index ON vida_salud.cache_locks USING btree (expiration);


--
-- Name: cita_especialidad_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX cita_especialidad_idx ON vida_salud.cita USING btree (id_especialidad);


--
-- Name: cita_fecha_estado_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX cita_fecha_estado_idx ON vida_salud.cita USING btree (fecha, estado);


--
-- Name: cita_medico_bloque_unico; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE UNIQUE INDEX cita_medico_bloque_unico ON vida_salud.cita USING btree (id_medico, fecha, hora_inicio) WHERE (estado <> 'CANCELADA'::vida_salud.estado_cita);


--
-- Name: cita_medico_fecha_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX cita_medico_fecha_idx ON vida_salud.cita USING btree (id_medico, fecha);


--
-- Name: cita_paciente_fecha_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX cita_paciente_fecha_idx ON vida_salud.cita USING btree (id_paciente, fecha DESC);


--
-- Name: contacto_emergencia_paciente_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX contacto_emergencia_paciente_idx ON vida_salud.contacto_emergencia USING btree (id_paciente);


--
-- Name: especialidad_nombre_unico_ci; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE UNIQUE INDEX especialidad_nombre_unico_ci ON vida_salud.especialidad USING btree (lower(btrim((nombre)::text)));


--
-- Name: failed_jobs_connection_queue_failed_at_index; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX failed_jobs_connection_queue_failed_at_index ON vida_salud.failed_jobs USING btree (connection, queue, failed_at);


--
-- Name: historial_estado_cita_cita_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX historial_estado_cita_cita_idx ON vida_salud.historial_estado_cita USING btree (id_cita, fecha_cambio);


--
-- Name: horario_medico_dia_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX horario_medico_dia_idx ON vida_salud.horario USING btree (id_medico, dia_semana);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX jobs_queue_index ON vida_salud.jobs USING btree (queue);


--
-- Name: medico_especialidad_especialidad_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX medico_especialidad_especialidad_idx ON vida_salud.medico_especialidad USING btree (id_especialidad);


--
-- Name: notificacion_cita_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX notificacion_cita_idx ON vida_salud.notificacion USING btree (id_cita);


--
-- Name: notificacion_pendiente_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX notificacion_pendiente_idx ON vida_salud.notificacion USING btree (fecha_programada) WHERE (estado = 'PENDIENTE'::vida_salud.estado_notificacion);


--
-- Name: notificacion_usuario_gestion_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX notificacion_usuario_gestion_idx ON vida_salud.notificacion USING btree (id_usuario_gestion);


--
-- Name: persona_apellidos_nombres_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX persona_apellidos_nombres_idx ON vida_salud.persona USING btree (lower((apellidos)::text), lower((nombres)::text));


--
-- Name: persona_email_unico_ci; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE UNIQUE INDEX persona_email_unico_ci ON vida_salud.persona USING btree (lower((email)::text)) WHERE (email IS NOT NULL);


--
-- Name: reporte_usuario_fecha_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX reporte_usuario_fecha_idx ON vida_salud.reporte USING btree (id_usuario, fecha_generacion DESC);


--
-- Name: sesion_usuario_activa_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX sesion_usuario_activa_idx ON vida_salud.sesion USING btree (id_usuario) WHERE activa;


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX sessions_last_activity_index ON vida_salud.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX sessions_user_id_index ON vida_salud.sessions USING btree (user_id);


--
-- Name: token_recuperacion_usuario_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX token_recuperacion_usuario_idx ON vida_salud.token_recuperacion USING btree (id_usuario, fecha_generacion DESC);


--
-- Name: usuario_nombre_usuario_unico_ci; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE UNIQUE INDEX usuario_nombre_usuario_unico_ci ON vida_salud.usuario USING btree (lower((nombre_usuario)::text));


--
-- Name: usuario_rol_idx; Type: INDEX; Schema: vida_salud; Owner: postgres
--

CREATE INDEX usuario_rol_idx ON vida_salud.usuario USING btree (id_rol);


--
-- Name: cita trg_bitacora_cita; Type: TRIGGER; Schema: vida_salud; Owner: postgres
--

CREATE TRIGGER trg_bitacora_cita AFTER INSERT OR DELETE OR UPDATE ON vida_salud.cita FOR EACH ROW EXECUTE FUNCTION vida_salud.fn_bitacora_cita();


--
-- Name: cita trg_cita_atendida_inmutable; Type: TRIGGER; Schema: vida_salud; Owner: postgres
--

CREATE TRIGGER trg_cita_atendida_inmutable BEFORE DELETE OR UPDATE ON vida_salud.cita FOR EACH ROW EXECUTE FUNCTION vida_salud.fn_cita_atendida_inmutable();


--
-- Name: cita trg_cita_bloqueo_agenda; Type: TRIGGER; Schema: vida_salud; Owner: postgres
--

CREATE TRIGGER trg_cita_bloqueo_agenda BEFORE INSERT OR UPDATE OF fecha, id_medico ON vida_salud.cita FOR EACH ROW EXECUTE FUNCTION vida_salud.fn_cita_bloqueo_agenda();


--
-- Name: cita trg_cita_crear_notificacion; Type: TRIGGER; Schema: vida_salud; Owner: postgres
--

CREATE TRIGGER trg_cita_crear_notificacion AFTER INSERT ON vida_salud.cita FOR EACH ROW EXECUTE FUNCTION vida_salud.fn_cita_crear_notificacion();


--
-- Name: cita trg_cita_dentro_horario; Type: TRIGGER; Schema: vida_salud; Owner: postgres
--

CREATE TRIGGER trg_cita_dentro_horario BEFORE INSERT OR UPDATE OF fecha, hora_inicio, hora_fin, id_medico ON vida_salud.cita FOR EACH ROW EXECUTE FUNCTION vida_salud.fn_cita_dentro_horario();


--
-- Name: cita trg_cita_historial_estado; Type: TRIGGER; Schema: vida_salud; Owner: postgres
--

CREATE TRIGGER trg_cita_historial_estado AFTER UPDATE OF estado, fecha, hora_inicio ON vida_salud.cita FOR EACH ROW WHEN (((old.estado IS DISTINCT FROM new.estado) OR (old.fecha IS DISTINCT FROM new.fecha) OR (old.hora_inicio IS DISTINCT FROM new.hora_inicio))) EXECUTE FUNCTION vida_salud.fn_cita_historial_estado();


--
-- Name: cita trg_cita_persona_activa; Type: TRIGGER; Schema: vida_salud; Owner: postgres
--

CREATE TRIGGER trg_cita_persona_activa BEFORE INSERT ON vida_salud.cita FOR EACH ROW EXECUTE FUNCTION vida_salud.fn_cita_persona_activa();


--
-- Name: cita trg_cita_sin_solapamiento; Type: TRIGGER; Schema: vida_salud; Owner: postgres
--

CREATE TRIGGER trg_cita_sin_solapamiento BEFORE INSERT OR UPDATE OF fecha, hora_inicio, hora_fin, id_medico, id_paciente ON vida_salud.cita FOR EACH ROW EXECUTE FUNCTION vida_salud.fn_cita_sin_solapamiento();


--
-- Name: informacion_medica trg_info_medica_fecha_actualizacion; Type: TRIGGER; Schema: vida_salud; Owner: postgres
--

CREATE TRIGGER trg_info_medica_fecha_actualizacion BEFORE UPDATE ON vida_salud.informacion_medica FOR EACH ROW EXECUTE FUNCTION vida_salud.fn_info_medica_fecha_actualizacion();


--
-- Name: paciente trg_paciente_no_eliminar; Type: TRIGGER; Schema: vida_salud; Owner: postgres
--

CREATE TRIGGER trg_paciente_no_eliminar BEFORE DELETE ON vida_salud.paciente FOR EACH ROW EXECUTE FUNCTION vida_salud.fn_paciente_no_eliminar();


--
-- Name: bitacora bitacora_usuario_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.bitacora
    ADD CONSTRAINT bitacora_usuario_fk FOREIGN KEY (id_usuario) REFERENCES vida_salud.usuario(id_usuario) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: bloqueo_agenda bloqueo_agenda_medico_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.bloqueo_agenda
    ADD CONSTRAINT bloqueo_agenda_medico_fk FOREIGN KEY (id_medico) REFERENCES vida_salud.medico(id_persona) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: cita cita_cita_origen_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.cita
    ADD CONSTRAINT cita_cita_origen_fk FOREIGN KEY (id_cita_origen) REFERENCES vida_salud.cita(id_cita) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: cita cita_especialidad_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.cita
    ADD CONSTRAINT cita_especialidad_fk FOREIGN KEY (id_especialidad) REFERENCES vida_salud.especialidad(id_especialidad) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: cita cita_medico_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.cita
    ADD CONSTRAINT cita_medico_fk FOREIGN KEY (id_medico) REFERENCES vida_salud.medico(id_persona) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: cita cita_paciente_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.cita
    ADD CONSTRAINT cita_paciente_fk FOREIGN KEY (id_paciente) REFERENCES vida_salud.paciente(id_persona) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: cita cita_usuario_registro_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.cita
    ADD CONSTRAINT cita_usuario_registro_fk FOREIGN KEY (id_usuario_registro) REFERENCES vida_salud.usuario(id_usuario) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comprobante_pago comprobante_pago_id_pago_foreign; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.comprobante_pago
    ADD CONSTRAINT comprobante_pago_id_pago_foreign FOREIGN KEY (id_pago) REFERENCES vida_salud.pago(id_pago) ON DELETE CASCADE;


--
-- Name: contacto_emergencia contacto_emergencia_paciente_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.contacto_emergencia
    ADD CONSTRAINT contacto_emergencia_paciente_fk FOREIGN KEY (id_paciente) REFERENCES vida_salud.paciente(id_persona) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: historial_estado_cita historial_estado_cita_cita_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.historial_estado_cita
    ADD CONSTRAINT historial_estado_cita_cita_fk FOREIGN KEY (id_cita) REFERENCES vida_salud.cita(id_cita) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: historial_estado_cita historial_estado_cita_usuario_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.historial_estado_cita
    ADD CONSTRAINT historial_estado_cita_usuario_fk FOREIGN KEY (id_usuario) REFERENCES vida_salud.usuario(id_usuario) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: horario horario_medico_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.horario
    ADD CONSTRAINT horario_medico_fk FOREIGN KEY (id_medico) REFERENCES vida_salud.medico(id_persona) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: informacion_medica informacion_medica_paciente_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.informacion_medica
    ADD CONSTRAINT informacion_medica_paciente_fk FOREIGN KEY (id_paciente) REFERENCES vida_salud.paciente(id_persona) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: medico_especialidad medico_especialidad_especialidad_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.medico_especialidad
    ADD CONSTRAINT medico_especialidad_especialidad_fk FOREIGN KEY (id_especialidad) REFERENCES vida_salud.especialidad(id_especialidad) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: medico_especialidad medico_especialidad_medico_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.medico_especialidad
    ADD CONSTRAINT medico_especialidad_medico_fk FOREIGN KEY (id_medico) REFERENCES vida_salud.medico(id_persona) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: medico medico_persona_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.medico
    ADD CONSTRAINT medico_persona_fk FOREIGN KEY (id_persona) REFERENCES vida_salud.persona(id_persona) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: notificacion notificacion_cita_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.notificacion
    ADD CONSTRAINT notificacion_cita_fk FOREIGN KEY (id_cita) REFERENCES vida_salud.cita(id_cita) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: notificacion notificacion_usuario_gestion_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.notificacion
    ADD CONSTRAINT notificacion_usuario_gestion_fk FOREIGN KEY (id_usuario_gestion) REFERENCES vida_salud.usuario(id_usuario) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: paciente paciente_persona_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.paciente
    ADD CONSTRAINT paciente_persona_fk FOREIGN KEY (id_persona) REFERENCES vida_salud.persona(id_persona) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: pago pago_id_cita_foreign; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.pago
    ADD CONSTRAINT pago_id_cita_foreign FOREIGN KEY (id_cita) REFERENCES vida_salud.cita(id_cita) ON DELETE CASCADE;


--
-- Name: pago pago_id_usuario_registro_foreign; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.pago
    ADD CONSTRAINT pago_id_usuario_registro_foreign FOREIGN KEY (id_usuario_registro) REFERENCES vida_salud.usuario(id_usuario);


--
-- Name: personal_administrativo personal_administrativo_persona_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.personal_administrativo
    ADD CONSTRAINT personal_administrativo_persona_fk FOREIGN KEY (id_persona) REFERENCES vida_salud.persona(id_persona) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: recuperacion_contrasena recuperacion_contrasena_id_usuario_foreign; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.recuperacion_contrasena
    ADD CONSTRAINT recuperacion_contrasena_id_usuario_foreign FOREIGN KEY (id_usuario) REFERENCES vida_salud.usuario(id_usuario) ON DELETE CASCADE;


--
-- Name: reembolso reembolso_id_pago_foreign; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.reembolso
    ADD CONSTRAINT reembolso_id_pago_foreign FOREIGN KEY (id_pago) REFERENCES vida_salud.pago(id_pago) ON DELETE CASCADE;


--
-- Name: reembolso reembolso_id_usuario_autoriza_foreign; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.reembolso
    ADD CONSTRAINT reembolso_id_usuario_autoriza_foreign FOREIGN KEY (id_usuario_autoriza) REFERENCES vida_salud.usuario(id_usuario);


--
-- Name: reporte reporte_usuario_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.reporte
    ADD CONSTRAINT reporte_usuario_fk FOREIGN KEY (id_usuario) REFERENCES vida_salud.usuario(id_usuario) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: rol_permiso rol_permiso_permiso_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.rol_permiso
    ADD CONSTRAINT rol_permiso_permiso_fk FOREIGN KEY (id_permiso) REFERENCES vida_salud.permiso(id_permiso) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: rol_permiso rol_permiso_rol_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.rol_permiso
    ADD CONSTRAINT rol_permiso_rol_fk FOREIGN KEY (id_rol) REFERENCES vida_salud.rol(id_rol) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: sesion sesion_usuario_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.sesion
    ADD CONSTRAINT sesion_usuario_fk FOREIGN KEY (id_usuario) REFERENCES vida_salud.usuario(id_usuario) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: token_recuperacion token_recuperacion_usuario_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.token_recuperacion
    ADD CONSTRAINT token_recuperacion_usuario_fk FOREIGN KEY (id_usuario) REFERENCES vida_salud.usuario(id_usuario) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: usuario usuario_persona_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.usuario
    ADD CONSTRAINT usuario_persona_fk FOREIGN KEY (id_persona) REFERENCES vida_salud.persona(id_persona) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: usuario usuario_rol_fk; Type: FK CONSTRAINT; Schema: vida_salud; Owner: postgres
--

ALTER TABLE ONLY vida_salud.usuario
    ADD CONSTRAINT usuario_rol_fk FOREIGN KEY (id_rol) REFERENCES vida_salud.rol(id_rol) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- PostgreSQL database dump complete
--

\unrestrict bpp5c1w0ySqWiZXkIW0qOgSTgM9057sSjcNs5FUanjd873fZaeDb7ed3iri3z3e

