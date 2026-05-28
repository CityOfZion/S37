/*
  Warnings:

  - You are about to drop the `EtherfuseCustomer` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `EtherfuseCustomer`;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_address_key`(`address`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
