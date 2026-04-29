-- Add external flag to trips table
alter table trips add column if not exists external boolean not null default false;
