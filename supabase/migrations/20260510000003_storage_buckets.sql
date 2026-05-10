-- Storage buckets (private originals, public mockups, temporary space uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork-originals', 'artwork-originals', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork-mockups', 'artwork-mockups', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('space-uploads', 'space-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- artwork-originals (private): artists can only access their own files (folder = uid)
CREATE POLICY "artwork-originals: artist uploads own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artwork-originals'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "artwork-originals: artist reads own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'artwork-originals'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

-- artwork-mockups (public): anon read, authenticated write
CREATE POLICY "artwork-mockups: public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'artwork-mockups');
