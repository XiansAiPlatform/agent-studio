# Tenant Id Use

Presentation layer must not pass the tenant id to Next.js api routes. Instead the next js routes should inject the tenant id into xians api by taking it from the serverside auth context.
