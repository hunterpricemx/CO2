-- mysql_patches_sync.sql
-- Ejecutar en Supabase SQL Editor (PostgreSQL)
-- Limpia y recarga la tabla `patches` con los 29 registros reales.

TRUNCATE TABLE patches RESTART IDENTITY CASCADE;

INSERT INTO patches (id, version, filename, url, released_at) VALUES
  ( 1, 1.001, 'Update 01', 'http://23.26.121.32/classicplus/1001.zip', '2025-08-19 06:20:15'),
  ( 2, 1.002, 'Update 02', 'http://23.26.121.32/classicplus/1002.zip', '2025-08-19 06:20:15'),
  ( 3, 1.003, 'Update 03', 'http://23.26.121.32/classicplus/1003.zip', '2025-08-19 06:20:15'),
  ( 4, 1.004, 'Update 04', 'http://23.26.121.32/classicplus/1004.zip', '2025-08-19 06:20:15'),
  ( 5, 1.005, 'Update 05', 'http://23.26.121.32/classicplus/1005.zip', '2025-08-19 06:20:15'),
  ( 6, 1.006, 'Update 06', 'http://23.26.121.32/classicplus/1006.zip', '2025-08-19 06:20:15'),
  ( 7, 1.007, 'Update 07', 'http://23.26.121.32/classicplus/1007.zip', '2025-08-19 06:20:15'),
  ( 8, 1.008, 'Update 08', 'http://23.26.121.32/classicplus/1008.zip', '2025-08-19 06:20:15'),
  ( 9, 1.009, 'Update 09', 'http://23.26.121.32/classicplus/1009.zip', '2025-08-19 06:20:15'),
  (10, 1.010, 'Update 10', 'http://23.26.121.32/classicplus/1010.zip', '2025-08-19 06:20:15'),
  (11, 1.011, 'Update 11', 'http://23.26.121.32/classicplus/1011.zip', '2025-08-19 06:20:15'),
  (12, 1.012, 'Update 12', 'http://23.26.121.32/classicplus/1012.zip', '2025-08-21 20:02:59'),
  (13, 1.013, 'Update 13', 'http://23.26.121.32/classicplus/1013.zip', '2025-08-21 20:02:59'),
  (14, 1.014, 'Update 14', 'http://23.26.121.32/classicplus/1014.zip', '2025-08-21 20:02:59'),
  (15, 1.015, 'Update 15', 'http://23.26.121.32/classicplus/1015.zip', '2025-08-21 20:02:59'),
  (16, 1.016, 'Update 16', 'http://23.26.121.32/classicplus/1016.zip', '2025-08-29 07:43:07'),
  (17, 1.017, 'Update 17', 'http://23.26.121.32/classicplus/1017.zip', '2025-08-29 07:43:07'),
  (18, 1.018, 'Update 18', 'http://23.26.121.32/classicplus/1018.zip', '2025-08-29 07:43:07'),
  (19, 1.019, 'Update 19', 'http://23.26.121.32/classicplus/1019.zip', '2025-08-29 07:43:07'),
  (20, 1.020, 'Update 20', 'http://23.26.121.32/classicplus/1020.zip', '2025-08-29 07:43:07'),
  (21, 1.021, 'Update 21', 'http://23.26.121.32/classicplus/1021.zip', '2025-08-29 07:43:07'),
  (22, 1.022, 'Update 22', 'http://23.26.121.32/classicplus/1022.zip', '2025-08-29 07:43:07'),
  (23, 1.023, 'Update 23', 'http://23.26.121.32/classicplus/1023.zip', '2025-08-29 07:43:07'),
  (24, 1.024, 'Update 24', 'http://23.26.121.32/classicplus/1024.zip', '2025-08-29 07:43:07'),
  (25, 1.025, 'Update 25', 'http://23.26.121.32/classicplus/1025.zip', '2025-08-29 07:43:07'),
  (26, 1.026, 'Update 26', 'http://23.26.121.32/classicplus/1026.zip', '2025-08-29 07:43:07'),
  (27, 1.027, 'Update 27', 'http://23.26.121.32/classicplus/1027.zip', '2025-08-29 07:43:07'),
  (28, 1.028, 'Update 28', 'http://23.26.121.32/classicplus/1028.zip', '2025-08-29 07:43:07'),
  (29, 1.029, 'Update 29', 'http://23.26.121.32/classicplus/1029.zip', '2025-08-29 07:43:07');

