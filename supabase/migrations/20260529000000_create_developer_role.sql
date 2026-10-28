INSERT INTO roles (name, permissions)
VALUES ('Developer', '{"all": true}')
ON CONFLICT (name) DO NOTHING;
