-- AlterTable
ALTER TABLE `Customer`
    MODIFY `externalCustomerId` VARCHAR(200) NOT NULL,
    MODIFY `externalBankAccountId` VARCHAR(200) NULL;