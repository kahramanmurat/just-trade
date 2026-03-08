-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "symbol" VARCHAR(30) NOT NULL,
    "condition" VARCHAR(2) NOT NULL,
    "threshold" DECIMAL(18,8) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "triggered" BOOLEAN NOT NULL DEFAULT false,
    "triggered_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_alerts_user_id" ON "alerts"("user_id");

-- CreateIndex
CREATE INDEX "idx_alerts_symbol" ON "alerts"("symbol");

-- CreateIndex
CREATE INDEX "idx_alerts_is_active" ON "alerts"("is_active");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
