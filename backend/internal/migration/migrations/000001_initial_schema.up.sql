-- Initial schema migration for auth-service
-- This creates all the tables, indexes, and constraints for the RBAC system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    first_name text,
    last_name text,
    is_active boolean DEFAULT true,
    role_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

-- Roles table
CREATE TABLE roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

-- Groups table
CREATE TABLE groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

-- Services table
CREATE TABLE services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    scopes text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    redirect_uri text,
    deleted_at timestamp with time zone
);

-- Permissions table
CREATE TABLE permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource text NOT NULL,
    action text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

-- Tokens table
CREATE TABLE tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(500) NOT NULL,
    token_type text DEFAULT 'Bearer'::text,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    access_token text NOT NULL,
    refresh_token text,
    updated_at timestamp with time zone
);

-- Association tables
CREATE TABLE user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL
);

CREATE TABLE role_groups (
    role_id uuid NOT NULL,
    group_id uuid NOT NULL
);

CREATE TABLE user_groups (
    group_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT gen_random_uuid() NOT NULL
);

CREATE TABLE role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);

CREATE TABLE group_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    service_id uuid NOT NULL,
    scopes text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);

-- Primary Key Constraints
ALTER TABLE ONLY users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY groups ADD CONSTRAINT groups_pkey PRIMARY KEY (id);
ALTER TABLE ONLY services ADD CONSTRAINT services_pkey PRIMARY KEY (id);
ALTER TABLE ONLY permissions ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY tokens ADD CONSTRAINT tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY group_services ADD CONSTRAINT group_services_pkey PRIMARY KEY (id);

-- Unique Constraints
ALTER TABLE ONLY users ADD CONSTRAINT users_username_key UNIQUE (username);
ALTER TABLE ONLY users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY roles ADD CONSTRAINT roles_name_key UNIQUE (name);
ALTER TABLE ONLY groups ADD CONSTRAINT groups_name_key UNIQUE (name);
ALTER TABLE ONLY services ADD CONSTRAINT services_name_key UNIQUE (name);
ALTER TABLE ONLY services ADD CONSTRAINT services_client_id_key UNIQUE (client_id);
ALTER TABLE ONLY permissions ADD CONSTRAINT permissions_resource_action_key UNIQUE (resource, action);
ALTER TABLE ONLY tokens ADD CONSTRAINT tokens_access_token_key UNIQUE (access_token);
ALTER TABLE ONLY tokens ADD CONSTRAINT tokens_refresh_token_key UNIQUE (refresh_token);
ALTER TABLE ONLY group_services ADD CONSTRAINT group_services_group_id_service_id_key UNIQUE (group_id, service_id);

-- Association table primary keys
ALTER TABLE ONLY user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);
ALTER TABLE ONLY role_groups ADD CONSTRAINT role_groups_pkey PRIMARY KEY (role_id, group_id);
ALTER TABLE ONLY user_groups ADD CONSTRAINT user_groups_pkey PRIMARY KEY (group_id, user_id);
ALTER TABLE ONLY role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);

-- Indexes for performance
CREATE UNIQUE INDEX idx_users_username ON users USING btree (username);
CREATE UNIQUE INDEX idx_users_email ON users USING btree (email);
CREATE INDEX idx_users_deleted_at ON users USING btree (deleted_at);

CREATE UNIQUE INDEX idx_roles_name ON roles USING btree (name);
CREATE INDEX idx_roles_deleted_at ON roles USING btree (deleted_at);

CREATE UNIQUE INDEX idx_groups_name ON groups USING btree (name);
CREATE INDEX idx_groups_deleted_at ON groups USING btree (deleted_at);

CREATE UNIQUE INDEX idx_services_name ON services USING btree (name);
CREATE UNIQUE INDEX idx_services_client_id ON services USING btree (client_id);
CREATE INDEX idx_services_deleted_at ON services USING btree (deleted_at);

CREATE UNIQUE INDEX idx_resource_action ON permissions USING btree (resource, action);
CREATE INDEX idx_permissions_deleted_at ON permissions USING btree (deleted_at);

CREATE UNIQUE INDEX idx_tokens_access_token ON tokens USING btree (access_token);
CREATE UNIQUE INDEX idx_tokens_refresh_token ON tokens USING btree (refresh_token);

-- Foreign Key Constraints
ALTER TABLE ONLY user_roles ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY user_roles ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE ONLY role_groups ADD CONSTRAINT fk_role_groups_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
ALTER TABLE ONLY role_groups ADD CONSTRAINT fk_role_groups_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY user_groups ADD CONSTRAINT fk_user_groups_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE ONLY user_groups ADD CONSTRAINT fk_user_groups_group FOREIGN KEY (group_id) REFERENCES groups(id);

ALTER TABLE ONLY role_permissions ADD CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
ALTER TABLE ONLY role_permissions ADD CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

ALTER TABLE ONLY group_services ADD CONSTRAINT group_services_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE ONLY group_services ADD CONSTRAINT group_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

ALTER TABLE ONLY users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

ALTER TABLE ONLY tokens ADD CONSTRAINT tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;