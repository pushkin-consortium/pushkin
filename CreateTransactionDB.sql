create table transactions (
   id  SERIAL PRIMARY KEY,
   query TEXT not null,
   bindings TEXT
)