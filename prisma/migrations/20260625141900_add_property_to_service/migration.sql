-- AlterTable
ALTER TABLE "ProcessService" ADD COLUMN     "clientPropertyId" TEXT;

-- AddForeignKey
ALTER TABLE "ProcessService" ADD CONSTRAINT "ProcessService_clientPropertyId_fkey" FOREIGN KEY ("clientPropertyId") REFERENCES "ClientProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
