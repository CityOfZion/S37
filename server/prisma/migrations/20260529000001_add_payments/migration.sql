-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(500) NOT NULL,
    `status` ENUM('CREATED', 'FUNDED', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELED') NOT NULL DEFAULT 'CREATED',
    `token` ENUM('TESOURO') NOT NULL,
    `method` ENUM('PIX') NOT NULL DEFAULT 'PIX',
    `amount` VARCHAR(50) NOT NULL,
    `tokenAmount` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(500) NOT NULL,
    `customerId` VARCHAR(500) NULL,
    `transactionSignature` VARCHAR(500) NULL,
    `pixData` VARCHAR(2000) NULL,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `errorMessage` VARCHAR(5000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payment_userId_idx`(`userId`),
    INDEX `Payment_userId_status_idx`(`userId`, `status`),
    INDEX `Payment_userId_createdAt_idx`(`userId`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentItem` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(500) NOT NULL,
    `amount` VARCHAR(50) NOT NULL,
    `description` VARCHAR(400) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentItem_paymentId_idx`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentDestination` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(500) NOT NULL,
    `destinationId` VARCHAR(500) NULL,
    `name` VARCHAR(200) NOT NULL,
    `token` ENUM('TESOURO') NOT NULL,
    `pixKey` VARCHAR(2000) NOT NULL,
    `pixKeyType` ENUM('EVP', 'CPF', 'CNPJ', 'EMAIL', 'PHONE') NOT NULL,
    `percentage` INTEGER NOT NULL,
    `amount` VARCHAR(50) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentDestination_paymentId_idx`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentMessage` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(500) NOT NULL,
    `role` ENUM('ASSISTANT', 'USER') NOT NULL,
    `text` VARCHAR(5000) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentMessage_paymentId_idx`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

