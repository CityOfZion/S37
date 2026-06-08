-- Convert existing basis-point values (e.g. 1500) back to plain percentage (e.g. 15)
UPDATE `PaymentDestination` SET `percentage` = `percentage` / 100 WHERE `percentage` > 100;

-- Clamp any remaining values below 1 up to 1
UPDATE `PaymentDestination` SET `percentage` = 1 WHERE `percentage` < 1;

-- Add check constraint: plain integer 1–100
ALTER TABLE `PaymentDestination` ADD CONSTRAINT `chk_percentage_range` CHECK (`percentage` >= 1 AND `percentage` <= 100);