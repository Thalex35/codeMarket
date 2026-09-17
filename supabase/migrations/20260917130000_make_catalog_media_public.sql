-- Catalog covers and screenshots are intentionally public media.
UPDATE storage.buckets
SET public = true
WHERE id IN ('covers', 'screenshots');
