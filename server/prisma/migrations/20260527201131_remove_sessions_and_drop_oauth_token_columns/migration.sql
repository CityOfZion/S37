/*
  Warnings:

  - You are about to drop the column `accessToken` on the `OAuthAccount` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `OAuthAccount` table. All the data in the column will be lost.
  - You are about to drop the column `idToken` on the `OAuthAccount` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `OAuthAccount` table. All the data in the column will be lost.
  - You are about to drop the column `scope` on the `OAuthAccount` table. All the data in the column will be lost.
  - You are about to drop the column `tokenType` on the `OAuthAccount` table. All the data in the column will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Session` DROP FOREIGN KEY `Session_userId_fkey`;

-- AlterTable
ALTER TABLE `OAuthAccount` DROP COLUMN `accessToken`,
    DROP COLUMN `expiresAt`,
    DROP COLUMN `idToken`,
    DROP COLUMN `refreshToken`,
    DROP COLUMN `scope`,
    DROP COLUMN `tokenType`;

-- DropTable
DROP TABLE `Session`;
