-- CreateTable
CREATE TABLE `Destination` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `token` ENUM('TESOURO') NOT NULL,
    `pixKey` TEXT NOT NULL,
    `pixKeyHash` VARCHAR(64) NOT NULL,
    `pixKeyType` ENUM('EVP', 'CPF', 'CNPJ', 'EMAIL', 'PHONE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Destination_userId_idx`(`userId`),
    UNIQUE INDEX `Destination_userId_pixKeyHash_key`(`userId`, `pixKeyHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Destination` ADD CONSTRAINT `Destination_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

