-- CreateEnum
CREATE TYPE "CostOwner" AS ENUM ('EMPRESA', 'CLIENTE');

-- CreateEnum
CREATE TYPE "CostApprovalStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- AlterTable
ALTER TABLE "Cost" ADD COLUMN     "approvalStatus" "CostApprovalStatus" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "owner" "CostOwner" NOT NULL DEFAULT 'EMPRESA',
ADD COLUMN     "receiptUrl" TEXT,
ADD COLUMN     "rejectionReason" TEXT;

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
