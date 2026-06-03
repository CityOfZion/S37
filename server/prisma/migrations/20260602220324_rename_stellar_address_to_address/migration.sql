-- Rename User.stellarAddress -> User.address (in-place, preserves data + unique constraint)
ALTER TABLE `User` RENAME COLUMN `stellarAddress` TO `address`;
ALTER TABLE `User` RENAME INDEX `User_stellarAddress_key` TO `User_address_key`;
