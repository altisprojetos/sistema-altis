-- Add roles array column
ALTER TABLE "User" ADD COLUMN "roles" "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[];

-- Copy existing role to roles array
UPDATE "User" SET "roles" = ARRAY[role::"Role"];

-- Drop old role column
ALTER TABLE "User" DROP COLUMN "role";
