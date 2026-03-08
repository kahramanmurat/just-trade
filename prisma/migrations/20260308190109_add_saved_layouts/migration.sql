-- CreateTable
CREATE TABLE "saved_layouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(30) NOT NULL,
    "timeframe" VARCHAR(10) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "config_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "saved_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_saved_layouts_user_id" ON "saved_layouts"("user_id");

-- CreateIndex
CREATE INDEX "idx_saved_layouts_symbol" ON "saved_layouts"("symbol");

-- CreateIndex
CREATE INDEX "idx_saved_layouts_user_id_symbol" ON "saved_layouts"("user_id", "symbol");

-- AddForeignKey
ALTER TABLE "saved_layouts" ADD CONSTRAINT "saved_layouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
