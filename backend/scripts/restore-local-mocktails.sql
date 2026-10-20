-- Local development recovery only. Run against the local order_system_db.
-- Restore only these two seeded menus; leave prices and availability unchanged.
SET NAMES utf8mb4;
START TRANSACTION;

UPDATE menus
SET deleted_at = NULL
WHERE deleted_at IS NOT NULL
  AND (
    (id = 7 AND name = 'シャーリー・テンプル風')
    OR (id = 8 AND name = 'フルーツ・サイダーポンチ')
  );

SELECT ROW_COUNT() AS restored_count;
COMMIT;

SELECT id, name, is_available, deleted_at
FROM menus
WHERE id IN (7, 8, 9, 10)
ORDER BY id;
