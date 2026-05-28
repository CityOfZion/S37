-- AlterTable: make tokenAmount, feeAmount, feePercentage non-nullable
ALTER TABLE `Payment`
  MODIFY COLUMN `tokenAmount` VARCHAR(50) NOT NULL,
  MODIFY COLUMN `feeAmount` VARCHAR(50) NOT NULL,
  MODIFY COLUMN `feePercentage` VARCHAR(2) NOT NULL;