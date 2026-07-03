-- CreateTable
CREATE TABLE "ClientProperty" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "farmName" TEXT,
    "municipality" TEXT,
    "areaHa" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "streetAddress" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "cep" TEXT,

    CONSTRAINT "ClientProperty_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientProperty" ADD CONSTRAINT "ClientProperty_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
