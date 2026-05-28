-- Step 1: rename orderId to externalId
ALTER TABLE `Payment` RENAME COLUMN `orderId` TO `externalId`;

-- Step 2: make externalId and customerId non-nullable
ALTER TABLE `Payment`
  MODIFY COLUMN `externalId` VARCHAR(500) NOT NULL,
  MODIFY COLUMN `customerId` VARCHAR(500) NOT NULL;