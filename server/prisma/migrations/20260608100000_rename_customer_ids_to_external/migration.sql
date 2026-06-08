-- Rename Customer.customerId → externalCustomerId
ALTER TABLE `Customer` RENAME COLUMN `customerId` TO `externalCustomerId`;

-- Rename Customer.bankAccountId → externalBankAccountId
ALTER TABLE `Customer` RENAME COLUMN `bankAccountId` TO `externalBankAccountId`;

-- Rename Payment.customerId → externalCustomerId
ALTER TABLE `Payment` RENAME COLUMN `customerId` TO `externalCustomerId`;
