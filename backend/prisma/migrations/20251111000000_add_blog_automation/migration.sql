-- Add fields to track automated blog posts
ALTER TABLE "BlogPost" ADD COLUMN "isAutomated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BlogPost" ADD COLUMN "automationMetadata" JSONB;

-- Create index for automated posts
CREATE INDEX "BlogPost_isAutomated_idx" ON "BlogPost"("isAutomated");
