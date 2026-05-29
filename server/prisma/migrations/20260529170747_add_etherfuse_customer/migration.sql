-- CreateTable
CREATE TABLE `EtherfuseCustomer` (
    `id` VARCHAR(191) NOT NULL,
    `publicKey` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EtherfuseCustomer_publicKey_key`(`publicKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
