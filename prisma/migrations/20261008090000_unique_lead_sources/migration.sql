-- Prevent duplicate source records when multiple providers/chunks persist the same lead concurrently.
CREATE UNIQUE INDEX "LeadSource_companyId_provider_url_key"
ON "LeadSource"("companyId", "provider", "url");
