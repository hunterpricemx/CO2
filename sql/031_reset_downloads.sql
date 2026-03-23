-- 031_reset_downloads.sql
-- Ejecutar en Supabase SQL Editor
-- Borra todos los downloads existentes y carga los 29 parches reales de 2.0

DELETE FROM public.downloads;

INSERT INTO public.downloads
  (version, type, patch_version, release_date, name_es, name_en, name_pt, url, sort_order)
VALUES
  ('2.0', 'patch', '1001', '2025-08-19', 'Parche 1001', 'Patch 1001', 'Patch 1001', 'http://23.26.121.32/classicplus/1001.zip', 10),
  ('2.0', 'patch', '1002', '2025-08-19', 'Parche 1002', 'Patch 1002', 'Patch 1002', 'http://23.26.121.32/classicplus/1002.zip', 20),
  ('2.0', 'patch', '1003', '2025-08-19', 'Parche 1003', 'Patch 1003', 'Patch 1003', 'http://23.26.121.32/classicplus/1003.zip', 30),
  ('2.0', 'patch', '1004', '2025-08-19', 'Parche 1004', 'Patch 1004', 'Patch 1004', 'http://23.26.121.32/classicplus/1004.zip', 40),
  ('2.0', 'patch', '1005', '2025-08-19', 'Parche 1005', 'Patch 1005', 'Patch 1005', 'http://23.26.121.32/classicplus/1005.zip', 50),
  ('2.0', 'patch', '1006', '2025-08-19', 'Parche 1006', 'Patch 1006', 'Patch 1006', 'http://23.26.121.32/classicplus/1006.zip', 60),
  ('2.0', 'patch', '1007', '2025-08-19', 'Parche 1007', 'Patch 1007', 'Patch 1007', 'http://23.26.121.32/classicplus/1007.zip', 70),
  ('2.0', 'patch', '1008', '2025-08-19', 'Parche 1008', 'Patch 1008', 'Patch 1008', 'http://23.26.121.32/classicplus/1008.zip', 80),
  ('2.0', 'patch', '1009', '2025-08-19', 'Parche 1009', 'Patch 1009', 'Patch 1009', 'http://23.26.121.32/classicplus/1009.zip', 90),
  ('2.0', 'patch', '1010', '2025-08-19', 'Parche 1010', 'Patch 1010', 'Patch 1010', 'http://23.26.121.32/classicplus/1010.zip', 100),
  ('2.0', 'patch', '1011', '2025-08-19', 'Parche 1011', 'Patch 1011', 'Patch 1011', 'http://23.26.121.32/classicplus/1011.zip', 110),
  ('2.0', 'patch', '1012', '2025-08-21', 'Parche 1012', 'Patch 1012', 'Patch 1012', 'http://23.26.121.32/classicplus/1012.zip', 120),
  ('2.0', 'patch', '1013', '2025-08-21', 'Parche 1013', 'Patch 1013', 'Patch 1013', 'http://23.26.121.32/classicplus/1013.zip', 130),
  ('2.0', 'patch', '1014', '2025-08-21', 'Parche 1014', 'Patch 1014', 'Patch 1014', 'http://23.26.121.32/classicplus/1014.zip', 140),
  ('2.0', 'patch', '1015', '2025-08-21', 'Parche 1015', 'Patch 1015', 'Patch 1015', 'http://23.26.121.32/classicplus/1015.zip', 150),
  ('2.0', 'patch', '1016', '2025-08-29', 'Parche 1016', 'Patch 1016', 'Patch 1016', 'http://23.26.121.32/classicplus/1016.zip', 160),
  ('2.0', 'patch', '1017', '2025-08-29', 'Parche 1017', 'Patch 1017', 'Patch 1017', 'http://23.26.121.32/classicplus/1017.zip', 170),
  ('2.0', 'patch', '1018', '2025-08-29', 'Parche 1018', 'Patch 1018', 'Patch 1018', 'http://23.26.121.32/classicplus/1018.zip', 180),
  ('2.0', 'patch', '1019', '2025-08-29', 'Parche 1019', 'Patch 1019', 'Patch 1019', 'http://23.26.121.32/classicplus/1019.zip', 190),
  ('2.0', 'patch', '1020', '2025-08-29', 'Parche 1020', 'Patch 1020', 'Patch 1020', 'http://23.26.121.32/classicplus/1020.zip', 200),
  ('2.0', 'patch', '1021', '2025-08-29', 'Parche 1021', 'Patch 1021', 'Patch 1021', 'http://23.26.121.32/classicplus/1021.zip', 210),
  ('2.0', 'patch', '1022', '2025-08-29', 'Parche 1022', 'Patch 1022', 'Patch 1022', 'http://23.26.121.32/classicplus/1022.zip', 220),
  ('2.0', 'patch', '1023', '2025-08-29', 'Parche 1023', 'Patch 1023', 'Patch 1023', 'http://23.26.121.32/classicplus/1023.zip', 230),
  ('2.0', 'patch', '1024', '2025-08-29', 'Parche 1024', 'Patch 1024', 'Patch 1024', 'http://23.26.121.32/classicplus/1024.zip', 240),
  ('2.0', 'patch', '1025', '2025-08-29', 'Parche 1025', 'Patch 1025', 'Patch 1025', 'http://23.26.121.32/classicplus/1025.zip', 250),
  ('2.0', 'patch', '1026', '2025-08-29', 'Parche 1026', 'Patch 1026', 'Patch 1026', 'http://23.26.121.32/classicplus/1026.zip', 260),
  ('2.0', 'patch', '1027', '2025-08-29', 'Parche 1027', 'Patch 1027', 'Patch 1027', 'http://23.26.121.32/classicplus/1027.zip', 270),
  ('2.0', 'patch', '1028', '2025-08-29', 'Parche 1028', 'Patch 1028', 'Patch 1028', 'http://23.26.121.32/classicplus/1028.zip', 280),
  ('2.0', 'patch', '1029', '2025-08-29', 'Parche 1029', 'Patch 1029', 'Patch 1029', 'http://23.26.121.32/classicplus/1029.zip', 290);
