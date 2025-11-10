CREATE OR REPLACE VIEW "PropertyActivity" AS
SELECT
  'job'::text AS type,
  j."id"::text AS id,
  j."title" AS title,
  j."status"::text AS status,
  j."priority"::text AS priority,
  j."updatedAt" AS date,
  assign."firstName" AS assigned_first_name,
  assign."lastName" AS assigned_last_name,
  NULL::text AS requested_first_name,
  NULL::text AS requested_last_name,
  NULL::text AS unit_number
FROM "Job" j
LEFT JOIN "User" assign ON assign."id" = j."assignedToId"

UNION ALL

SELECT
  'inspection'::text AS type,
  i."id"::text AS id,
  i."title" AS title,
  i."status"::text AS status,
  NULL::text AS priority,
  i."updatedAt" AS date,
  NULL::text AS assigned_first_name,
  NULL::text AS assigned_last_name,
  NULL::text AS requested_first_name,
  NULL::text AS requested_last_name,
  NULL::text AS unit_number
FROM "Inspection" i

UNION ALL

SELECT
  'service_request'::text AS type,
  sr."id"::text AS id,
  sr."title" AS title,
  sr."status"::text AS status,
  sr."priority"::text AS priority,
  sr."updatedAt" AS date,
  NULL::text AS assigned_first_name,
  NULL::text AS assigned_last_name,
  requester."firstName" AS requested_first_name,
  requester."lastName" AS requested_last_name,
  NULL::text AS unit_number
FROM "ServiceRequest" sr
LEFT JOIN "User" requester ON requester."id" = sr."requestedById"

UNION ALL

SELECT
  'unit'::text AS type,
  u."id"::text AS id,
  u."unitNumber" AS title,
  u."status"::text AS status,
  NULL::text AS priority,
  u."updatedAt" AS date,
  NULL::text AS assigned_first_name,
  NULL::text AS assigned_last_name,
  NULL::text AS requested_first_name,
  NULL::text AS requested_last_name,
  u."unitNumber" AS unit_number
FROM "Unit" u;
