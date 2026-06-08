/*
  Warnings:

  - You are about to alter the column `userId` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(25)`.
  - You are about to alter the column `externalId` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(200)`.
  - You are about to alter the column `customerId` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(200)`.
  - You are about to alter the column `transactionHash` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(200)`.
  - You are about to alter the column `pixData` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(2000)` to `VarChar(800)`.
  - You are about to alter the column `errorMessage` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(5000)` to `VarChar(2000)`.
  - You are about to alter the column `paymentId` on the `PaymentDestination` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(25)`.
  - You are about to alter the column `destinationId` on the `PaymentDestination` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(25)`.
  - You are about to alter the column `pixKey` on the `PaymentDestination` table. The data in that column could be lost. The data in that column will be cast from `VarChar(2000)` to `VarChar(800)`.
  - You are about to alter the column `paymentId` on the `PaymentItem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(25)`.
  - You are about to alter the column `paymentId` on the `PaymentMessage` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(25)`.

*/
-- DropForeignKey
ALTER TABLE `Payment` DROP FOREIGN KEY `Payment_userId_fkey`;

-- DropForeignKey
ALTER TABLE `PaymentDestination` DROP FOREIGN KEY `PaymentDestination_destinationId_fkey`;

-- DropForeignKey
ALTER TABLE `PaymentDestination` DROP FOREIGN KEY `PaymentDestination_paymentId_fkey`;

-- DropForeignKey
ALTER TABLE `PaymentItem` DROP FOREIGN KEY `PaymentItem_paymentId_fkey`;

-- DropForeignKey
ALTER TABLE `PaymentMessage` DROP FOREIGN KEY `PaymentMessage_paymentId_fkey`;

-- AlterTable
ALTER TABLE `Payment` MODIFY `userId` VARCHAR(25) NOT NULL,
    MODIFY `externalId` VARCHAR(200) NOT NULL,
    MODIFY `customerId` VARCHAR(200) NOT NULL,
    MODIFY `transactionHash` VARCHAR(200) NULL,
    MODIFY `pixData` VARCHAR(800) NULL,
    MODIFY `errorMessage` VARCHAR(2000) NULL;

-- AlterTable
ALTER TABLE `PaymentDestination` MODIFY `paymentId` VARCHAR(25) NOT NULL,
    MODIFY `destinationId` VARCHAR(25) NULL,
    MODIFY `pixKey` VARCHAR(800) NOT NULL;

-- AlterTable
ALTER TABLE `PaymentItem` MODIFY `paymentId` VARCHAR(25) NOT NULL;

-- AlterTable
ALTER TABLE `PaymentMessage` MODIFY `paymentId` VARCHAR(25) NOT NULL;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentItem` ADD CONSTRAINT `PaymentItem_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentDestination` ADD CONSTRAINT `PaymentDestination_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentDestination` ADD CONSTRAINT `PaymentDestination_destinationId_fkey` FOREIGN KEY (`destinationId`) REFERENCES `Destination`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentMessage` ADD CONSTRAINT `PaymentMessage_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
