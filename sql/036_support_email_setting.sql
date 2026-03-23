-- 036_support_email_setting.sql
-- Seed the support notification email setting.

INSERT INTO public.site_settings (key, value)
VALUES ('support_notification_email', '')
ON CONFLICT (key) DO NOTHING;
