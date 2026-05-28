/*
  Warnings:

  - Made the column `address` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Payment` MODIFY `address` VARCHAR(200) NOT NULL;
