UPDATE storage.buckets
SET
  file_size_limit = 524288000,
  allowed_mime_types = NULL
WHERE id = 'software-files';