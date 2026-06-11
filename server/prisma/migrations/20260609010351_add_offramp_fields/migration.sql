-- AlterEnum: add PROCESSING to PaymentStatus
ALTER TABLE `Payment` MODIFY COLUMN `status` ENUM('CREATED', 'FUNDED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELED') NOT NULL DEFAULT 'CREATED';

-- AlterTable Payment
ALTER TABLE `Payment` ADD COLUMN `externalBankAccountId` VARCHAR(200) NULL;

-- AlterTable PaymentDestination
ALTER TABLE `PaymentDestination`
    ADD COLUMN `externalId` VARCHAR(200) NULL,
    ADD COLUMN `completed` BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN `transactionData` TEXT NULL;
