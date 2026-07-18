DO $$
BEGIN
    IF current_setting('server_version_num')::integer < 190000 THEN
        RAISE EXCEPTION 'latex-renderer requires PostgreSQL 19 or newer';
    END IF;
END
$$;
