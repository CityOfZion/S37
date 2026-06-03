-- Rename EtherfuseCustomer.publicKey -> EtherfuseCustomer.address (in-place, preserves data + unique constraint)
ALTER TABLE `EtherfuseCustomer` RENAME COLUMN `publicKey` TO `address`;
ALTER TABLE `EtherfuseCustomer` RENAME INDEX `EtherfuseCustomer_publicKey_key` TO `EtherfuseCustomer_address_key`;
