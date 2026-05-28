-- AlterTable
ALTER TABLE `User` ADD COLUMN `stellarAddress` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_stellarAddress_key` ON `User`(`stellarAddress`);
