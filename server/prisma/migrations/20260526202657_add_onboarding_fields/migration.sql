-- AlterTable
ALTER TABLE `User` ADD COLUMN `companyName` VARCHAR(191) NULL,
    ADD COLUMN `onboardingCompletedAt` DATETIME(3) NULL;
