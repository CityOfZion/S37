/*
  Warnings:

  - You are about to alter the column `externalCustomerId` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(36)`.
  - You are about to alter the column `externalBankAccountId` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(36)`.
  - You are about to alter the column `userId` on the `Destination` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(25)`.
  - You are about to alter the column `userId` on the `OAuthAccount` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(25)`.
  - You are about to alter the column `externalId` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(36)`.
  - You are about to alter the column `externalCustomerId` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(36)`.
  - You are about to alter the column `externalBankAccountId` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(36)`.
  - You are about to alter the column `externalId` on the `PaymentDestination` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(36)`.

*/
-- DropForeignKey
ALTER TABLE `Destination` DROP FOREIGN KEY `Destination_userId_fkey`;

-- DropForeignKey
ALTER TABLE `OAuthAccount` DROP FOREIGN KEY `OAuthAccount_userId_fkey`;

-- AlterTable
ALTER TABLE `Customer` MODIFY `externalCustomerId` VARCHAR(36) NOT NULL,
    MODIFY `externalBankAccountId` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `Destination` MODIFY `userId` VARCHAR(25) NOT NULL;

-- AlterTable
ALTER TABLE `OAuthAccount` MODIFY `userId` VARCHAR(25) NOT NULL,
    MODIFY `providerAccountId` VARCHAR(200) NOT NULL;

-- AlterTable
ALTER TABLE `Payment` MODIFY `externalId` VARCHAR(36) NOT NULL,
    MODIFY `externalCustomerId` VARCHAR(36) NOT NULL,
    MODIFY `externalBankAccountId` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `PaymentDestination` MODIFY `externalId` VARCHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `Destination` ADD CONSTRAINT `Destination_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OAuthAccount` ADD CONSTRAINT `OAuthAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
